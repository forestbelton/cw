import { Instruction } from "./insn";

export type Warrior = {
  code: Instruction[];
  metadata: {
    name?: string;
    author?: string;
    version?: string;
    date?: string;
    strategy?: string;
  };
  startIndex: number;
};

export type TaskID = number;
export type InstructionPointer = number;

export type Task = {
  taskID: TaskID;
  instructionPointer: InstructionPointer;
};

export class DeadWarriorError extends Error {}

export class VmWarrior {
  nextID: TaskID;
  taskQueue: Task[];

  constructor(entryPoint: InstructionPointer) {
    this.nextID = 0;
    this.taskQueue = [];
    this.createTask(entryPoint);
  }

  createTask(entryPoint: InstructionPointer) {
    const task = { taskID: this.nextID++, instructionPointer: entryPoint };
    this.taskQueue.push(task);
  }

  executeTask(f: (pc: InstructionPointer) => InstructionPointer | null) {
    const task = this.taskQueue.shift();
    if (typeof task === "undefined") {
      throw new DeadWarriorError();
    }

    const nextInstructionPointer = f(task.instructionPointer);
    if (nextInstructionPointer !== null) {
      task.instructionPointer = nextInstructionPointer;
      this.taskQueue.push(task);
    }
  }

  dead(): boolean {
    return this.taskQueue.length === 0;
  }
}
