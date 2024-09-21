import {
  ArithmeticOperation,
  insnEquals,
  Instruction,
  InstructionLens,
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
  numCycles: number;
  core: Instruction[];
  vmWarriors: VmWarrior[];

  private constructor(options: VmOptions, warriors: Warrior[]) {
    this.options = options;
    this.warriors = warriors;
    this.numCycles = 0;
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
    this.numCycles = 0;

    while (
      this.numCycles < this.options.cyclesBeforeTie &&
      (this.vmWarriors.length > 1 ||
        (this.vmWarriors.length > 0 && this.warriors.length === 1))
    ) {
      this.executeCycle();
    }

    if (
      this.numCycles === this.options.cyclesBeforeTie ||
      this.vmWarriors.length === 0
    ) {
      return { status: MatchStatus.TIE, numCycles: this.numCycles };
    }

    const winnerID = this.vmWarriors[0].id;
    return { status: MatchStatus.WIN, winnerID, numCycles: this.numCycles };
  }

  executeCycle() {
    const executeStep = this.executeStep.bind(this);
    this.vmWarriors.forEach((warrior) => warrior.executeTask(executeStep));
    this.vmWarriors = this.vmWarriors.filter((warrior) => {
      if (warrior.dead()) {
        console.log(`warrior ${warrior.id} died at cycle ${this.numCycles}!`);
        return false;
      }
      return true;
    });
    this.numCycles++;
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
      insn: this.getInsn(pc + readPointer),
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
    let cond = false;

    let aValue, bValue: InstructionLens;
    switch (insn.modifier) {
      case Modifier.A:
        aValue = InstructionLens.aNumber(a.insn);
        bValue = InstructionLens.aNumber(b.insn);
        break;
      case Modifier.B:
        aValue = InstructionLens.bNumber(a.insn);
        bValue = InstructionLens.bNumber(b.insn);
        break;
      case Modifier.AB:
        aValue = InstructionLens.aNumber(a.insn);
        bValue = InstructionLens.bNumber(b.insn);
        break;
      case Modifier.BA:
        aValue = InstructionLens.bNumber(a.insn);
        bValue = InstructionLens.aNumber(b.insn);
        break;
      case Modifier.F:
      case Modifier.I:
        aValue = InstructionLens.abNumber(a.insn);
        bValue = InstructionLens.abNumber(b.insn);
        break;
      case Modifier.X:
        aValue = InstructionLens.abNumber(a.insn);
        bValue = InstructionLens.baNumber(b.insn);
        break;
    }

    switch (insn.operation) {
      case Operation.DAT:
        break;
      case Operation.MOV:
        if (insn.modifier === Modifier.I) {
          this.setInsn(pc + b.writePointer, a.insn);
        } else {
          bValue.set(aValue.get());
        }
        update.nextPointer = (pc + 1) % this.core.length;
        break;
      case Operation.ADD:
      case Operation.SUB:
      case Operation.MUL:
      case Operation.DIV:
      case Operation.MOD:
        let shouldQueue = true;
        const as = aValue.get();
        const bs = bValue.get();
        for (let i = 0; i < bs.length; ++i) {
          const result = BINOPS[insn.operation](bs[i], as[i]);
          if (result === null) {
            shouldQueue = false;
            break;
          }
          bs[i] = result;
          bValue.set(bs);
        }
        if (shouldQueue) {
          update.nextPointer = (pc + 1) % this.core.length;
        }
        break;
      case Operation.JMP:
        update.nextPointer = (pc + a.readPointer) % this.core.length;
        break;
      case Operation.JMZ:
        cond = bValue.get().every((v) => v === 0);
        update.nextPointer =
          (pc + (cond ? a.readPointer : 1)) % this.core.length;
        break;
      case Operation.JMN:
        cond = bValue.get().every((v) => v !== 0);
        update.nextPointer =
          (pc + (cond ? a.readPointer : 1)) % this.core.length;
        break;
      case Operation.DJN:
        cond = bValue.update((v) => v - 1).every((v) => v !== 0);
        update.nextPointer =
          (pc + (cond ? a.readPointer : 1)) % this.core.length;
        break;
      case Operation.CMP:
        cond =
          insn.modifier === Modifier.I
            ? insnEquals(a.insn, b.insn)
            : aValue.zip(bValue).every(([a, b]) => a === b);
        update.nextPointer = (pc + (cond ? 2 : 1)) % this.core.length;
        break;
      case Operation.SLT:
        cond = aValue.zip(bValue).every(([a, b]) => a < b);
        update.nextPointer = (pc + (cond ? 2 : 1)) % this.core.length;
        break;
      case Operation.SPL:
        update.nextPointer = (pc + 1) % this.core.length;
        update.newTaskPointer = (pc + a.writePointer) % this.core.length;
        break;
    }

    return update;
  }
}
