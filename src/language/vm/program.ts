import { Instruction } from "../insn";

export type Program = {
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
