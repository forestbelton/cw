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
