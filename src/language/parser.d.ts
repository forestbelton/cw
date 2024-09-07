import { Instruction } from "./insn";

export type ParserOptions = {
  allowedStartRules?: string[];
};

export function parse(input: string, options: ParserOptions): unknown;
