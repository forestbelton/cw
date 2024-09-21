import { Core, InstructionPointer } from "./core";
import { ArithmeticOpcode, Mode, Modifier, Opcode } from "./insn";
import { InstructionLens } from "./insn/lens";
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

const BINOPS: Record<
  ArithmeticOpcode,
  (lhs: number, rhs: number) => number | null
> = {
  [Opcode.ADD]: (lhs, rhs) => lhs + rhs,
  [Opcode.SUB]: (lhs, rhs) => lhs - rhs,
  [Opcode.MUL]: (lhs, rhs) => lhs * rhs,
  [Opcode.DIV]: (lhs, rhs) => (rhs !== 0 ? Math.floor(lhs / rhs) : null),
  [Opcode.MOD]: (lhs, rhs) => (rhs !== 0 ? lhs % rhs : null),
};

export type TaskID = number;

export type Task = {
  taskID: TaskID;
  instructionPointer: InstructionPointer;
};

export type TaskUpdate = {
  nextPointer?: InstructionPointer;
  newTaskPointer?: InstructionPointer;
};

export class DeadWarriorError extends Error {}

export class VmWarrior {
  id: number;
  nextID: TaskID;
  taskQueue: Task[];
  maxNumTasks: number;

  constructor(id: number, maxNumTasks: number, entryPoint: InstructionPointer) {
    this.id = id;
    this.nextID = 0;
    this.taskQueue = [];
    this.maxNumTasks = maxNumTasks;
    this.createTask(entryPoint);
  }

  private createTask(entryPoint: InstructionPointer) {
    const task = { taskID: this.nextID++, instructionPointer: entryPoint };
    this.taskQueue.push(task);
  }

  executeTask(f: (pc: InstructionPointer) => TaskUpdate) {
    const task = this.taskQueue.shift();
    if (typeof task === "undefined") {
      throw new DeadWarriorError();
    }

    const update = f(task.instructionPointer);
    if (typeof update.nextPointer !== "undefined") {
      task.instructionPointer = update.nextPointer;
      this.taskQueue.push(task);
    }

    if (typeof update.newTaskPointer !== "undefined") {
      this.createTask(update.newTaskPointer);
    }
  }

  dead(): boolean {
    return this.taskQueue.length === 0;
  }
}

export const executeArithmeticInstruction = (
  pc: InstructionPointer,
  opcode: ArithmeticOpcode,
  aValue: InstructionLens,
  bValue: InstructionLens
): TaskUpdate => {
  const as = aValue.get();
  const bs = bValue.get();

  if (as.length !== bs.length) {
    // Lenses point to different sized data
    throw new Error();
  }

  let shouldQueue = true;
  for (let i = 0; i < bs.length; ++i) {
    const result = BINOPS[opcode](bs[i], as[i]);
    if (result === null) {
      shouldQueue = false;
      break;
    }
    bs[i] = result;
    bValue.set(bs);
  }

  return shouldQueue ? { nextPointer: pc.add(1) } : {};
};

export class VM {
  options: VmOptions;
  warriors: Warrior[];
  numCycles: number;
  core: Core;
  vmWarriors: VmWarrior[];

  private constructor(options: VmOptions, warriors: Warrior[]) {
    this.options = options;
    this.warriors = warriors;
    this.numCycles = 0;

    this.core = new Core(
      Array(options.coreSize).fill(options.initialInstruction),
      options.readDistance,
      options.writeDistance
    );

    let nextPc = 0;
    this.vmWarriors = warriors.map((warrior, warriorId) => {
      const { code, startIndex } = warrior;

      console.log(`Loading warrior ${warriorId} at PC=${nextPc}`);
      for (let index = 0; index < code.length; ++index) {
        this.core.instructions[nextPc + index] = code[index];
      }

      const entryPoint = new InstructionPointer(this.core, nextPc + startIndex);

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
      result += this.core.size() - limit;
    }
    return result;
  }

  resolveOperand(pc: InstructionPointer, operand: "a" | "b") {
    let readPointer = 0;
    let writePointer = 0;
    let postIncrementPointer: number | undefined;

    const insn = pc.fetch();
    const { mode, value } = insn[operand];
    if (mode !== Mode.Immediate) {
      readPointer = this.clamp(value, this.options.readDistance);
      writePointer = this.clamp(value, this.options.writeDistance);

      if (mode !== Mode.Direct) {
        if (mode === Mode.PreDecrementIndirect) {
          const preDecrementInsn = pc.add(writePointer).fetch();
          preDecrementInsn.b.value =
            (preDecrementInsn.b.value + this.core.size() - 1) %
            this.core.size();
        }
        if (mode === Mode.PostIncrementIndirect) {
          postIncrementPointer = writePointer;
        }
        readPointer = this.clamp(
          readPointer + pc.add(readPointer).fetch().b.value,
          this.options.readDistance
        );
        writePointer = this.clamp(
          readPointer + pc.add(writePointer).fetch().b.value,
          this.options.writeDistance
        );
      }
    }

    if (typeof postIncrementPointer !== "undefined") {
      const postIncrementInsn = pc.add(postIncrementPointer).fetch();
      postIncrementInsn.b.value =
        (postIncrementInsn.b.value + 1) % this.core.size();
    }

    return {
      insn: pc.add(readPointer).fetch(),
      readPointer: pc.add(readPointer),
      writePointer: pc.add(writePointer),
    };
  }

  executeStep(pc: number | InstructionPointer): TaskUpdate {
    if (typeof pc === "number") {
      pc = new InstructionPointer(this.core, pc);
    }

    const insn = pc.fetch();
    console.log(`PC=${pc}: ${insn}`);

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

    switch (insn.opcode) {
      case Opcode.DAT:
        break;
      case Opcode.MOV:
        if (insn.modifier === Modifier.I) {
          b.writePointer.set(a.insn);
        } else {
          bValue.set(aValue.get());
        }
        update.nextPointer = pc.add(1);
        break;
      case Opcode.ADD:
      case Opcode.SUB:
      case Opcode.MUL:
      case Opcode.DIV:
      case Opcode.MOD:
        update = executeArithmeticInstruction(pc, insn.opcode, aValue, bValue);
        break;
      case Opcode.JMP:
        update.nextPointer = a.readPointer;
        break;
      case Opcode.JMZ:
        update.nextPointer = bValue.get().every((v) => v === 0)
          ? a.readPointer
          : pc.add(1);
        break;
      case Opcode.JMN:
        update.nextPointer = bValue.get().every((v) => v !== 0)
          ? a.readPointer
          : pc.add(1);
        break;
      case Opcode.DJN:
        update.nextPointer = bValue.update((v) => v - 1).every((v) => v !== 0)
          ? a.readPointer
          : pc.add(1);
        break;
      case Opcode.CMP:
        cond =
          insn.modifier === Modifier.I
            ? a.insn.equals(b.insn)
            : aValue.zip(bValue).every(([a, b]) => a === b);
        update.nextPointer = pc.add(cond ? 2 : 1);
        break;
      case Opcode.SLT:
        cond = aValue.zip(bValue).every(([a, b]) => a < b);
        update.nextPointer = pc.add(cond ? 2 : 1);
        break;
      case Opcode.SPL:
        update.nextPointer = pc.add(1);
        update.newTaskPointer = a.writePointer;
        break;
    }

    return update;
  }
}
