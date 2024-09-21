import { AnyRawInstruction, Instruction, RawInstruction } from "./insn";

export type ParserOptions = {
  startRule?: string;
};

export function parse(
  input: string,
  options: { startRule: "AssemblyFile" }
): AnyRawInstruction[];
export function parse(
  input: string,
  options: { startRule: "Instruction" }
): RawInstruction;
export function parse(input: string, options: ParserOptions): unknown;
