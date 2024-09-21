import { ArithmeticOpcode, Opcode } from "../insn";
import { AnyRawInstruction, RawExpr } from "../insn/raw";

export type Symbols = Record<string, number>;

const BINOPS: Record<ArithmeticOpcode, (lhs: number, rhs: number) => number> = {
  [Opcode.ADD]: (lhs, rhs) => lhs + rhs,
  [Opcode.SUB]: (lhs, rhs) => lhs - rhs,
  [Opcode.MUL]: (lhs, rhs) => lhs * rhs,
  [Opcode.DIV]: (lhs, rhs) => Math.floor(lhs / rhs),
  [Opcode.MOD]: (lhs, rhs) => lhs % rhs,
};

export const getSymbols = (raw: AnyRawInstruction[]): Symbols => {
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

export const evaluateExpr = (
  expr: RawExpr,
  pc: number,
  symbols: Symbols
): number => {
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
