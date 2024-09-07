import {
  AnyRawInstruction,
  Instruction,
  Mode,
  Modifier,
  Operation,
  RawExpr,
  RawExprOp,
  RawInstruction,
  RawOperand,
} from "./insn";
import * as parser from "./parser";
import { Warrior } from "./warrior";

type DefaultModifier = [string, string, Modifier];

type Symbols = Record<string, number>;

const BINOPS: Record<RawExprOp, (lhs: number, rhs: number) => number> = {
  [RawExprOp.ADD]: (lhs, rhs) => lhs + rhs,
  [RawExprOp.SUB]: (lhs, rhs) => lhs - rhs,
  [RawExprOp.MUL]: (lhs, rhs) => lhs * rhs,
  [RawExprOp.DIV]: (lhs, rhs) => Math.floor(lhs / rhs),
  [RawExprOp.MOD]: (lhs, rhs) => lhs % rhs,
};

const DEFAULT_DATA_MODIFIERS: DefaultModifier[] = [
  ["#", "#$@<>", Modifier.AB],
  ["$@<>", "#", Modifier.B],
  ["$@<>", "$@<>", Modifier.I],
];

const DEFAULT_ARITH_MODIFIERS: DefaultModifier[] = [
  ["#", "#$@<>", Modifier.AB],
  ["$@<>", "#$@<>", Modifier.AB],
];

const DEFAULT_BRANCH_MODIFIERS: DefaultModifier[] = [
  ["#$@<>", "#$@<>", Modifier.B],
];

const DEFAULT_MODIFIERS: Record<Operation, DefaultModifier[]> = {
  [Operation.DAT]: [["#$@<>", "#$@<>", Modifier.F]],
  [Operation.MOV]: DEFAULT_DATA_MODIFIERS,
  [Operation.ADD]: DEFAULT_ARITH_MODIFIERS,
  [Operation.SUB]: DEFAULT_ARITH_MODIFIERS,
  [Operation.MUL]: DEFAULT_ARITH_MODIFIERS,
  [Operation.DIV]: DEFAULT_ARITH_MODIFIERS,
  [Operation.MOD]: DEFAULT_ARITH_MODIFIERS,
  [Operation.JMP]: DEFAULT_BRANCH_MODIFIERS,
  [Operation.JMZ]: DEFAULT_BRANCH_MODIFIERS,
  [Operation.JMN]: DEFAULT_BRANCH_MODIFIERS,
  [Operation.DJN]: DEFAULT_BRANCH_MODIFIERS,
  [Operation.CMP]: DEFAULT_DATA_MODIFIERS,
  [Operation.SLT]: [
    ["#", "#$@<>", Modifier.AB],
    ["$@<>", "#$@<>", Modifier.B],
  ],
  [Operation.SPL]: DEFAULT_BRANCH_MODIFIERS,
};

const DEFAULT_MODE = Mode.Direct;

const DEFAULT_OPERAND: RawOperand = {
  mode: Mode.Immediate,
  expr: 0,
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
      if (!_default[0].includes(aMode)) {
        continue;
      }

      if (!_default[1].includes(bMode)) {
        continue;
      }

      modifier = _default[2];
      break;
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
