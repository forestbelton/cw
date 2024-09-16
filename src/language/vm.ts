import {
  ArithmeticOperation,
  BINOPS,
  cloneInsn,
  Instruction,
  isDivOp,
  Mode,
  Modifier,
  Operation,
  prettyPrint,
} from "./insn";
import { VmOptions } from "./options";
import { Warrior } from "./warrior";

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

export class VM {
  options: VmOptions;
  warriors: Warrior[];
  core: Instruction[];
  taskQueues: Record<string, number[]>;

  private constructor(options: VmOptions, warriors: Warrior[]) {
    this.options = options;
    this.warriors = warriors;
    this.core = Array(options.coreSize).fill(options.initialInstruction);
    this.taskQueues = {};

    let nextPc = 0;
    for (let warriorId = 0; warriorId < warriors.length; ++warriorId) {
      const { code, startIndex } = warriors[warriorId];

      console.log(`Loading warrior ${warriorId} at PC=${nextPc}`);
      for (let index = 0; index < code.length; ++index) {
        this.core[nextPc + index] = code[index];
      }

      this.taskQueues[warriorId] = [nextPc + startIndex];
      if (typeof options.separation === "number") {
        nextPc += options.separation;
      } else {
        // TODO: Support random separation
        nextPc += code.length + 1;
      }
    }
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
      Object.keys(this.taskQueues).length > 1
    ) {
      this.executeCycle();
      numCycles++;
    }

    if (
      numCycles === this.options.cyclesBeforeTie ||
      Object.keys(this.taskQueues).length === 0
    ) {
      return { status: MatchStatus.TIE, numCycles };
    }

    const winnerID = parseInt(Object.keys(this.taskQueues)[0], 10);
    return { status: MatchStatus.WIN, winnerID, numCycles };
  }

  executeCycle() {
    const deadWarriorIDs = Object.entries(this.taskQueues).flatMap(
      ([warriorID, taskQueue]) => {
        this.executeStep(taskQueue);
        return taskQueue.length === 0 ? [warriorID] : [];
      }
    );

    deadWarriorIDs.forEach((warriorID) => {
      delete this.taskQueues[warriorID];
    });
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

  executeStep(taskQueue: number[]) {
    const pc = taskQueue.shift();
    if (typeof pc === "undefined") {
      return;
    }

    const insn = this.core[pc];
    console.log(`PC=${pc}: ${prettyPrint(insn)}`);

    const a = this.resolveOperand(pc, "a");
    const b = this.resolveOperand(pc, "b");

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
        taskQueue.push((pc + 1) % this.core.length);
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
          taskQueue.push((pc + 1) % this.core.length);
        }
        break;
      case Operation.JMP:
        taskQueue.push((pc + a.readPointer) % this.core.length);
        break;
      case Operation.JMZ:
        break;
      case Operation.JMN:
        break;
      case Operation.DJN:
        break;
      case Operation.CMP:
        break;
      case Operation.SLT:
        break;
      case Operation.SPL:
        break;
    }
  }

  executeArithOp(
    operation: ArithmeticOperation,
    modifier: Modifier,
    dest: Instruction,
    a: Instruction,
    b: Instruction
  ) {
    const op = BINOPS[operation];
    let shouldQueue = true;
    // TODO: These arguments need to be checked
    switch (modifier) {
      case Modifier.A:
        if (isDivOp(operation) && a.a.value === 0) {
          shouldQueue = false;
          break;
        }
        dest.a.value = op(b.a.value, a.a.value);
        break;
      case Modifier.B:
        if (isDivOp(operation) && a.b.value === 0) {
          shouldQueue = false;
          break;
        }
        dest.b.value = op(b.b.value, a.b.value);
        break;
      case Modifier.AB:
        if (isDivOp(operation) && a.b.value === 0) {
          shouldQueue = false;
          break;
        }
        dest.b.value = op(b.a.value, a.b.value);
        break;
      case Modifier.BA:
        if (isDivOp(operation) && a.a.value === 0) {
          shouldQueue = false;
          break;
        }
        dest.a.value = op(b.b.value, a.a.value);
        break;
      case Modifier.F:
      case Modifier.I:
        if (isDivOp(operation) && (a.a.value === 0 || a.b.value === 0)) {
          shouldQueue = false;
          break;
        }
        dest.a.value = op(b.a.value, a.a.value);
        dest.b.value = op(b.b.value, a.b.value);
        break;
      case Modifier.X:
        if (isDivOp(operation) && (a.a.value === 0 || a.b.value === 0)) {
          shouldQueue = false;
          break;
        }
        dest.b.value = op(b.a.value, a.b.value);
        dest.a.value = op(b.b.value, a.a.value);
        break;
    }
    return shouldQueue;
  }
}
