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
