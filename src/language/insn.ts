export enum Mode {
  Immediate = "#",
  Direct = "$",
  Indirect = "@",
  PreDecrementIndirect = "<",
  PostIncrementIndirect = ">",
}

export enum Modifier {
  A = "A",
  B = "B",
  AB = "AB",
  BA = "BA",
  F = "F",
  X = "X",
  I = "I",
}

export enum Operation {
  DAT = "DAT",
  MOV = "MOV",
  ADD = "ADD",
  SUB = "SUB",
  MUL = "MUL",
  DIV = "DIV",
  MOD = "MOD",
  JMP = "JMP",
  JMZ = "JMZ",
  JMN = "JMN",
  DJN = "DJN",
  CMP = "CMP",
  SLT = "SLT",
  SPL = "SPL",
}

export enum RawExprOp {
  ADD = "+",
  SUB = "-",
  MUL = "*",
  DIV = "/",
  MOD = "%",
}

export type RawExpr =
  | number
  | string
  | {
      op: RawExprOp;
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
  operation: Operation;
  modifier: Modifier | null;
  a: RawOperand;
  b: RawOperand | null;
};

export type AnyRawInstruction =
  | RawInstruction
  | { type: "ORG"; labels: string[]; expr: RawExpr }
  | { type: "END"; labels: string[]; expr: RawExpr | null };

export type Operand = {
  mode: Mode;
  value: number;
};

export type Instruction = {
  operation: Operation;
  modifier: Modifier;
  a: Operand;
  b: Operand;
};
