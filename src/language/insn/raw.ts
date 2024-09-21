import { ArithmeticOpcode, Mode, Opcode, Modifier } from "./index";

export type RawExpr =
  | number
  | string
  | {
      op: ArithmeticOpcode;
      lhs: RawExpr;
      rhs: RawExpr;
    };

export type RawOperand = {
  mode: Mode | null;
  expr: RawExpr;
};

export type RawInstruction = {
  type: null;
  labels: string[];
  opcode: Opcode;
  modifier: Modifier | null;
  a: RawOperand;
  b: RawOperand | null;
};

export type AnyRawInstruction =
  | RawInstruction
  | { type: "ORG"; labels: string[]; expr: RawExpr }
  | { type: "END"; labels: string[]; expr: RawExpr | null };
