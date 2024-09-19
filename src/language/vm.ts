import {
  ArithmeticOperation,
  cloneInsn,
  insnEquals,
  Instruction,
  Mode,
  Modifier,
  Operation,
  prettyPrint,
} from "./insn";
import { VmOptions } from "./options";
import { TaskUpdate, VmWarrior, Warrior } from "./warrior";

export enum MatchStatus {
  WIN = "WIN",
  TIE = "TIE",
}

export type MatchResult =
  | {
      status: MatchStatus.WIN;
      winnerID: number;
      numCycles: number;
    }
  | {
      status: MatchStatus.TIE;
      numCycles: number;
    };

const BINOPS: Record<
  ArithmeticOperation,
  (lhs: number, rhs: number) => number | null
> = {
  [Operation.ADD]: (lhs, rhs) => lhs + rhs,
  [Operation.SUB]: (lhs, rhs) => lhs - rhs,
  [Operation.MUL]: (lhs, rhs) => lhs * rhs,
  [Operation.DIV]: (lhs, rhs) => (rhs !== 0 ? Math.floor(lhs / rhs) : null),
  [Operation.MOD]: (lhs, rhs) => (rhs !== 0 ? lhs % rhs : null),
};

export class VM {
  options: VmOptions;
  warriors: Warrior[];
  core: Instruction[];
  vmWarriors: VmWarrior[];

  private constructor(options: VmOptions, warriors: Warrior[]) {
    this.options = options;
    this.warriors = warriors;
    this.core = Array(options.coreSize).fill(options.initialInstruction);

    let nextPc = 0;
    this.vmWarriors = warriors.map((warrior, warriorId) => {
      const { code, startIndex } = warrior;

      console.log(`Loading warrior ${warriorId} at PC=${nextPc}`);
      for (let index = 0; index < code.length; ++index) {
        this.core[nextPc + index] = code[index];
      }

      const entryPoint = nextPc + startIndex;

      if (typeof options.separation === "number") {
        nextPc += options.separation;
      } else {
        // TODO: Support random separation
        nextPc += code.length + 1;
      }

      return new VmWarrior(warriorId, options.maxNumTasks, entryPoint);
    });
  }

  static create(options: VmOptions, warriors: Warrior[]) {
    // TODO: Validate core size > 0
    // TODO: Validate cycles before tie > 0
    // TODO: Validate instruction limit
    // TODO: Validate maxNumTasks > 0
    // TODO: Validate read/write distance (> 0, multiple of core size)
    // TODO: Validate minimum separation > 0
    // TODO: Validate separation > 0 or RANDOM
    // TODO: Validate numWarriors = warriors.length && numWarriors > 1
    return new VM(options, warriors);
  }

  execute(): MatchResult {
    let numCycles = 0;

    while (
      numCycles < this.options.cyclesBeforeTie &&
      this.vmWarriors.length > 1
    ) {
      this.executeCycle();
      numCycles++;
    }

    if (
      numCycles === this.options.cyclesBeforeTie ||
      this.vmWarriors.length === 0
    ) {
      return { status: MatchStatus.TIE, numCycles };
    }

    const winnerID = this.vmWarriors[0].id;
    return { status: MatchStatus.WIN, winnerID, numCycles };
  }

  executeCycle() {
    this.vmWarriors.forEach((warrior) => warrior.executeTask(this.executeStep));
    this.vmWarriors = this.vmWarriors.filter((warrior) => !warrior.dead());
  }

  clamp(address: number, limit: number) {
    let result = address % limit;
    if (result > Math.floor(limit / 2)) {
      result += this.core.length - limit;
    }
    return result;
  }

  getInsn(addr: number) {
    if (addr < 0) {
      addr += this.core.length;
    }
    return this.core[addr % this.core.length];
  }

  setInsn(addr: number, insn: Instruction) {
    this.core[addr % this.core.length] = insn;
  }

  resolveOperand(pc: number, operand: "a" | "b") {
    let readPointer = 0;
    let writePointer = 0;
    let postIncrementPointer: number | undefined;

    const insn = this.core[pc];
    const { mode, value } = insn[operand];
    if (mode !== Mode.Immediate) {
      readPointer = this.clamp(value, this.options.readDistance);
      writePointer = this.clamp(value, this.options.writeDistance);

      if (mode !== Mode.Direct) {
        if (mode === Mode.PreDecrementIndirect) {
          const preDecrementInsn =
            this.core[(pc + writePointer) % this.core.length];
          preDecrementInsn.b.value =
            (preDecrementInsn.b.value + this.core.length - 1) %
            this.core.length;
        }
        if (mode === Mode.PostIncrementIndirect) {
          postIncrementPointer = writePointer;
        }
        readPointer = this.clamp(
          readPointer + this.getInsn(pc + readPointer).b.value,
          this.options.readDistance
        );
        writePointer = this.clamp(
          writePointer + this.getInsn(pc + writePointer).b.value,
          this.options.readDistance
        );
      }
    }

    if (typeof postIncrementPointer !== "undefined") {
      const postIncrementInsn =
        this.core[(pc + postIncrementPointer) % this.core.length];
      postIncrementInsn.b.value =
        (postIncrementInsn.b.value + 1) % this.core.length;
    }

    return {
      insn: cloneInsn(this.getInsn(pc + readPointer)),
      readPointer,
      writePointer,
    };
  }

  executeStep(pc: number): TaskUpdate {
    const insn = this.core[pc];
    console.log(`PC=${pc}: ${prettyPrint(insn)}`);

    const a = this.resolveOperand(pc, "a");
    const b = this.resolveOperand(pc, "b");

    let update: TaskUpdate = {};

    switch (insn.operation) {
      case Operation.DAT:
        break;

      case Operation.MOV:
        const dest = this.getInsn(pc + b.writePointer);
        switch (insn.modifier) {
          case Modifier.A:
            dest.a.value = a.insn.a.value;
            break;
          case Modifier.B:
            dest.b.value = a.insn.b.value;
            break;
          case Modifier.AB:
            dest.b.value = a.insn.a.value;
            break;
          case Modifier.BA:
            dest.a.value = a.insn.b.value;
            break;
          case Modifier.F:
            dest.a.value = a.insn.a.value;
            dest.b.value = a.insn.b.value;
            break;
          case Modifier.X:
            dest.b.value = a.insn.a.value;
            dest.a.value = a.insn.b.value;
            break;
          case Modifier.I:
            this.setInsn(pc + b.writePointer, a.insn);
            break;
        }
        update.nextPointer = (pc + 1) % this.core.length;
        break;

      case Operation.ADD:
      case Operation.SUB:
      case Operation.MUL:
      case Operation.DIV:
      case Operation.MOD:
        const shouldQueue = this.executeArithOp(
          insn.operation,
          insn.modifier,
          this.getInsn(pc + b.writePointer),
          a.insn,
          b.insn
        );
        if (shouldQueue) {
          update.nextPointer = (pc + 1) % this.core.length;
        }
        break;
      case Operation.JMP:
        update.nextPointer = (pc + a.readPointer) % this.core.length;
        break;
      case Operation.JMZ:
        break;
      case Operation.JMN:
        break;
      case Operation.DJN:
        break;
      case Operation.CMP:
        let cond = false;
        switch (insn.modifier) {
          case Modifier.A:
            cond = a.insn.a.value === b.insn.a.value;
            break;
          case Modifier.B:
            cond = a.insn.b.value === b.insn.b.value;
            break;
          case Modifier.AB:
            cond = a.insn.a.value === b.insn.b.value;
            break;
          case Modifier.BA:
            cond = a.insn.b.value === b.insn.a.value;
            break;
          case Modifier.F:
            cond =
              a.insn.a.value === b.insn.a.value &&
              a.insn.b.value === b.insn.b.value;
            break;
          case Modifier.X:
            cond =
              a.insn.a.value === b.insn.b.value &&
              a.insn.b.value === b.insn.a.value;
            break;
          case Modifier.I:
            cond = insnEquals(a.insn, b.insn);
            break;
        }
        update.nextPointer = (pc + (cond ? 2 : 1)) % this.core.length;
        break;
      case Operation.SLT:
        break;
      case Operation.SPL:
        update.nextPointer = (pc + 1) % this.core.length;
        update.newTaskPointer = (pc + a.writePointer) % this.core.length;
        break;
    }

    return update;
  }

  executeArithOp(
    operation: ArithmeticOperation,
    modifier: Modifier,
    dest: Instruction,
    a: Instruction,
    b: Instruction
  ) {
    const op = BINOPS[operation];
    let result: number | null = null;
    switch (modifier) {
      case Modifier.A:
        result = op(b.a.value, a.a.value);
        if (result !== null) {
          dest.a.value = result;
        }
        break;
      case Modifier.B:
        result = op(b.b.value, a.b.value);
        if (result !== null) {
          dest.b.value = result;
        }
        break;
      case Modifier.AB:
        result = op(b.b.value, a.a.value);
        if (result !== null) {
          dest.b.value = result;
        }
        break;
      case Modifier.BA:
        result = op(b.a.value, a.b.value);
        if (result !== null) {
          dest.a.value = result;
        }
        break;
      case Modifier.F:
      case Modifier.I:
        result = op(b.a.value, a.a.value);
        if (result === null) {
          break;
        }
        dest.a.value = result;
        result = op(b.b.value, a.b.value);
        if (result === null) {
          break;
        }
        dest.b.value = result;
        break;
      case Modifier.X:
        result = op(b.b.value, a.a.value);
        if (result === null) {
          break;
        }
        dest.b.value = result;
        result = op(b.a.value, a.b.value);
        if (result === null) {
          break;
        }
        dest.a.value = result;
        break;
    }
    return result !== null;
  }
}
