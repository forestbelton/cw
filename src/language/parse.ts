import * as parser from "./parser";
import { Instruction } from "./insn";
import { Warrior } from "./warrior";

export const parseProgram = (input: string): Warrior => {
  // 1. Resolve label addresses
  // 2. Perform EQU substitution (strip EQUs)
  // 3. Compute start address (strip ORGs)
  // 4. Validate END? (strip ENDs)
  let code = parser.parse(input, {}) as Instruction[];
  let startIndex = 0;
  return { code, metadata: {}, startIndex };
};

export const parseInstruction = (input: string): Instruction => {
  return parser.parse(input, {
    allowedStartRules: ["Instruction"],
  }) as Instruction;
};
