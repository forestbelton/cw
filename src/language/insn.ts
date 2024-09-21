// NB: Potential encoding of instructions
//
// Byte 1: Opcode and modifier
// xxxx yyy0
// ^    ^
// |----|--- 4-bit opcode
//      |--- 3-bit modifier
//
// Bytes 2-3, 4-5: A-operand, B-operand
// nnnn nnnn nnnn nmmm
// ^               ^
// |---------------|-- 13-bit number
//                 |-- 3-bit mode

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

export type ArithmeticOperation =
  | Operation.ADD
  | Operation.SUB
  | Operation.MUL
  | Operation.DIV
  | Operation.MOD;

export type RawExpr =
  | number
  | string
  | {
      op: ArithmeticOperation;
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

export const prettyPrint = ({ operation, modifier, a, b }: Instruction) =>
  `${operation}.${modifier} ${a.mode}${a.value}, ${b.mode}${b.value}`;

export const cloneInsn = ({
  operation,
  modifier,
  a,
  b,
}: Instruction): Instruction => ({
  operation,
  modifier,
  a: { ...a },
  b: { ...b },
});

export const insnEquals = (a: Instruction, b: Instruction) =>
  a.operation === b.operation &&
  a.modifier === b.modifier &&
  a.a.mode === b.a.mode &&
  a.a.value === b.a.value &&
  a.b.mode === b.b.mode &&
  a.b.value === b.b.value;

export class InstructionLens {
  private _get: () => number[];
  private _set: (x: number[]) => void;

  private constructor(get: () => number[], set: (x: number[]) => void) {
    this._get = get;
    this._set = set;
  }

  get(): number[] {
    return this._get();
  }

  set(xs: number[]) {
    this._set(xs);
  }

  update(f: (x: number) => number): number[] {
    const ys = this._get().map(f);
    this._set(ys);
    return ys;
  }

  zip(other: InstructionLens): [number, number][] {
    const xs = this.get();
    const ys = other.get();
    return xs.map((x, i) => [x, ys[i]]);
  }

  static aNumber(insn: Instruction): InstructionLens {
    return new InstructionLens(
      () => [insn.a.value],
      (x: number[]) => (insn.a.value = x[0])
    );
  }

  static bNumber(insn: Instruction): InstructionLens {
    return new InstructionLens(
      () => [insn.b.value],
      (x: number[]) => (insn.b.value = x[0])
    );
  }

  static abNumber(insn: Instruction): InstructionLens {
    return new InstructionLens(
      () => [insn.a.value, insn.b.value],
      (xs: number[]) => {
        insn.a.value = xs[0];
        insn.b.value = xs[1];
      }
    );
  }

  static baNumber(insn: Instruction): InstructionLens {
    return new InstructionLens(
      () => [insn.b.value, insn.a.value],
      (xs: number[]) => {
        insn.b.value = xs[0];
        insn.a.value = xs[1];
      }
    );
  }
}
