import { DEFAULT_MODE, DEFAULT_MODIFIERS, DEFAULT_OPERAND } from "./defaults";
import {
  AnyRawInstruction,
  BINOPS,
  Instruction,
  Operation,
  RawExpr,
  RawInstruction,
} from "./insn";
import * as parser from "./parser";
import { Warrior } from "./warrior";

type Symbols = Record<string, number>;

export const assembleInstruction = (sourceCode: string): Instruction => {
  const raw = parser.parse(sourceCode, {
    startRule: "Instruction",
  }) as RawInstruction;
  return assembleRawInstruction(raw, 0, {});
};

export const assemble = (sourceCode: string): Warrior => {
  // TODO: Perform EQU substitution
  const raw = parser.parse(sourceCode, {
    startRule: "AssemblyFile",
  }) as AnyRawInstruction[];
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

const getSymbols = (raw: AnyRawInstruction[]): Symbols => {
  const symbols: Symbols = {};

  let pc = 0;
  for (const insn of raw) {
    for (const label of insn.labels) {
      if (typeof symbols[label] !== "undefined") {
        // Symbol redefined
        throw new Error();
      }

      symbols[label] = pc;
    }

    if (insn.type === null) {
      pc++;
    }
  }

  return symbols;
};

const assembleRawInstruction = (
  raw: RawInstruction,
  pc: number,
  symbols: Symbols
): Instruction => {
  const { operation } = raw;
  let { a, b } = raw;

  /** If there is only one operand associated with a DAT instruction, this
   * operand is assembled into the B-mode and B-address fields, while #0 is
   * assembled into the A-mode and A-address fields. For all other instructions
   * with only one operand, this operand is assembled into the A-mode and
   * A-address fields and #0 is assembled into the B-mode and B-address fields.
   */
  if (b === null) {
    if (operation === Operation.DAT) {
      a = DEFAULT_OPERAND;
      b = raw.a;
    } else {
      b = DEFAULT_OPERAND;
    }
  }

  // A missing (null or blank) mode assembles as '$' does.
  const aMode = a.mode || DEFAULT_MODE;
  const bMode = b.mode || DEFAULT_MODE;

  /** If no modifier is present in the assembly instruction, the appropriate
   * modifier is appended to the opcode. The appropriate modifier depends upon
   * the opcode, the modes, and which standard to consider (ICWS'88 used here).
   */
  let modifier = raw.modifier;
  if (modifier === null) {
    for (const _default of DEFAULT_MODIFIERS[operation]) {
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

  return {
    operation,
    modifier,
    a: {
      mode: aMode,
      value: evaluateExpr(a.expr, pc, symbols),
    },
    b: {
      mode: bMode,
      value: evaluateExpr(b.expr, pc, symbols),
    },
  };
};

const evaluateExpr = (expr: RawExpr, pc: number, symbols: Symbols): number => {
  let value: number;

  if (typeof expr === "number") {
    value = expr;
  } else if (typeof expr === "string") {
    if (typeof symbols[expr] === "undefined") {
      // symbol not defined
      throw new Error();
    }
    value = symbols[expr] - pc;
  } else {
    value = BINOPS[expr.op](
      evaluateExpr(expr.lhs, pc, symbols),
      evaluateExpr(expr.rhs, pc, symbols)
    );
  }

  return value;
};
