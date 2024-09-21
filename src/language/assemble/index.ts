import { Instruction, Mode, Opcode } from "../insn";
import { RawInstruction } from "../insn/raw";
import * as parser from "./parser";
import { Warrior } from "../warrior";
import { DEFAULT_MODIFIERS } from "./modifier";
import { Symbols, evaluateExpr, getSymbols } from "./utils";

export const assembleInstruction = (sourceCode: string): Instruction => {
  const raw = parser.parse(sourceCode, { startRule: "Instruction" });
  return assembleRawInstruction(raw, 0, {});
};

export const assemble = (sourceCode: string): Warrior => {
  // TODO: Perform EQU substitution
  const raw = parser.parse(sourceCode, { startRule: "AssemblyFile" });
  const symbols = getSymbols(raw);
  const code: Instruction[] = [];

  let pc = 0;
  let startIndex = 0;
  let endFound = false;

  for (const insn of raw) {
    if (endFound) {
      // Instruction after END
      throw new Error();
    }

    switch (insn.type) {
      // PC=0 here because labels should not be relative to PC
      case "ORG":
        startIndex = evaluateExpr(insn.expr, 0, symbols);
        break;

      case "END":
        if (insn.expr !== null) {
          startIndex = evaluateExpr(insn.expr, 0, symbols);
        }
        endFound = true;
        break;

      default:
        code.push(assembleRawInstruction(insn, pc, symbols));
        pc++;
        break;
    }
  }

  if (startIndex < 0 || startIndex >= code.length) {
    // ORG/END operand outside of program
    throw new Error();
  }

  return {
    code,
    // TODO: Parse metadata
    metadata: {},
    startIndex,
  };
};

const assembleRawInstruction = (
  raw: RawInstruction,
  pc: number,
  symbols: Symbols
): Instruction => {
  const { opcode } = raw;
  let { a, b } = raw;

  /** If there is only one operand associated with a DAT instruction, this
   * operand is assembled into the B-mode and B-address fields, while #0 is
   * assembled into the A-mode and A-address fields. For all other instructions
   * with only one operand, this operand is assembled into the A-mode and
   * A-address fields and #0 is assembled into the B-mode and B-address fields.
   */
  if (b === null) {
    const defaultOperand = {
      mode: Mode.Immediate,
      expr: 0,
    };

    if (opcode === Opcode.DAT) {
      a = defaultOperand;
      b = raw.a;
    } else {
      b = defaultOperand;
    }
  }

  // A missing (null or blank) mode assembles as '$' does.
  const aMode = a.mode || Mode.Direct;
  const bMode = b.mode || Mode.Direct;

  /** If no modifier is present in the assembly instruction, the appropriate
   * modifier is appended to the opcode. The appropriate modifier depends upon
   * the opcode, the modes, and which standard to consider (ICWS'88 used here).
   */
  let modifier = raw.modifier;
  if (modifier === null) {
    for (const _default of DEFAULT_MODIFIERS[opcode]) {
      modifier = _default.match(aMode, bMode);
      if (modifier !== null) {
        break;
      }
    }

    if (modifier === null) {
      // No matching default modifier found (should never happen)
      throw new Error();
    }
  }

  return new Instruction(
    opcode,
    modifier,
    {
      mode: aMode,
      value: evaluateExpr(a.expr, pc, symbols),
    },
    {
      mode: bMode,
      value: evaluateExpr(b.expr, pc, symbols),
    }
  );
};
