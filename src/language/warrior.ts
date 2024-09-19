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
