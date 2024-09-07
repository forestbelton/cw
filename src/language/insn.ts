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

export enum PseudoOperation {
  ORG = "ORG",
  EQU = "EQU",
  END = "END",
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

export type Operand<ExprType> = {
  mode: Mode;
  value: ExprType;
};

export type BaseInstruction<OperationType, ExprType> = {
  operation: OperationType;
  modifier: Modifier;
  lhs: Operand<ExprType>;
  rhs: Operand<ExprType>;
};

export type RawInstruction = {
  labels: string[];
} & BaseInstruction<Operation | PseudoOperation, any>;

export type Instruction = BaseInstruction<Operation, number>;
