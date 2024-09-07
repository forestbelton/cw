import { Instruction } from "./insn";

export type ParserOptions = {
  startRule?: string;
};

export function parse(input: string, options: ParserOptions): unknown;
