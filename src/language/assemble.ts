import { DEFAULT_MODE, DEFAULT_MODIFIERS, DEFAULT_OPERAND } from "./defaults";
import {
  AnyRawInstruction,
  Instruction,
  Operation,
  RawExpr,
  RawExprOp,
  RawInstruction,
  RawOperand,
} from "./insn";
import * as parser from "./parser";
import { Warrior } from "./warrior";

type Symbols = Record<string, number>;

const BINOPS: Record<RawExprOp, (lhs: number, rhs: number) => number> = {
  [RawExprOp.ADD]: (lhs, rhs) => lhs + rhs,
  [RawExprOp.SUB]: (lhs, rhs) => lhs - rhs,
  [RawExprOp.MUL]: (lhs, rhs) => lhs * rhs,
  [RawExprOp.DIV]: (lhs, rhs) => Math.floor(lhs / rhs),
  [RawExprOp.MOD]: (lhs, rhs) => lhs % rhs,
};

export const assembleInstruction = (sourceCode: string): Instruction => {
  const raw = parser.parse(sourceCode, {
    startRule: "Instruction",
  }) as RawInstruction;
  return assembleRawInstruction(raw);
};

export const assemble = (sourceCode: string): Warrior => {
  // TODO: Perform EQU substitution
  const raw = parser.parse(sourceCode, {
    startRule: "AssemblyFile",
  }) as AnyRawInstruction[];

  const symbols = getSymbols(raw);

  const code: Instruction[] = [];
  let startIndex = 0;
  let endFound = false;

  for (const insn of raw) {
    if (endFound) {
      // Instruction after END
      throw new Error();
    }

    switch (insn.type) {
      case "ORG":
        startIndex = evaluateExpr(insn.expr, symbols);
        break;

      case "END":
        if (insn.expr !== null) {
          startIndex = evaluateExpr(insn.expr, symbols);
        }
        endFound = true;
        break;

      default:
        code.push(assembleRawInstruction(insn, symbols));
        break;
    }
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
  symbols: Symbols = {}
): Instruction => {
  let a = raw.a;
  let b: RawOperand;

  if (raw.b === null) {
    if (raw.operation === Operation.DAT) {
      a = DEFAULT_OPERAND;
      b = raw.a;
    } else {
      b = DEFAULT_OPERAND;
    }
  } else {
    b = raw.b;
  }

  const aValue = evaluateExpr(a.expr, symbols);
  const bValue = evaluateExpr(b.expr, symbols);

  const aMode = a.mode || DEFAULT_MODE;
  const bMode = b.mode || DEFAULT_MODE;

  let modifier = raw.modifier;
  if (modifier === null) {
    for (const _default of DEFAULT_MODIFIERS[raw.operation]) {
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
    operation: raw.operation,
    modifier,
    a: { mode: aMode, value: aValue },
    b: { mode: bMode, value: bValue },
  };
};

const evaluateExpr = (expr: RawExpr, symbols: Symbols): number => {
  let value: number;

  if (typeof expr === "number") {
    value = expr;
  } else if (typeof expr === "string") {
    if (typeof symbols[expr] === "undefined") {
      // symbol not defined
      throw new Error();
    }
    value = symbols[expr];
  } else {
    value = BINOPS[expr.op](
      evaluateExpr(expr.lhs, symbols),
      evaluateExpr(expr.rhs, symbols)
    );
  }

  return value;
};
