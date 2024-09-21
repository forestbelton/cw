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

export enum Opcode {
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

export type ArithmeticOpcode =
  | Opcode.ADD
  | Opcode.SUB
  | Opcode.MUL
  | Opcode.DIV
  | Opcode.MOD;

const ALL_ARITHMETIC_OPCODES: Partial<Record<Opcode, true>> = {
  [Opcode.ADD]: true,
  [Opcode.SUB]: true,
  [Opcode.MUL]: true,
  [Opcode.DIV]: true,
  [Opcode.MOD]: true,
};

export const isArithmeticOpcode = (
  opcode: Opcode
): opcode is ArithmeticOpcode =>
  typeof ALL_ARITHMETIC_OPCODES[opcode] !== "undefined";

export type Operand = {
  mode: Mode;
  value: number;
};

export class Instruction {
  opcode: Opcode;
  modifier: Modifier;
  a: Operand;
  b: Operand;

  constructor(opcode: Opcode, modifier: Modifier, a: Operand, b: Operand) {
    this.opcode = opcode;
    this.modifier = modifier;
    this.a = a;
    this.b = b;
  }

  toString() {
    const { opcode, modifier, a, b } = this;
    return `${opcode}.${modifier} ${a.mode}${a.value}, ${b.mode}${b.value}`;
  }

  clone() {
    const { opcode, modifier, a, b } = this;
    return new Instruction(opcode, modifier, { ...a }, { ...b });
  }

  equals(other: any) {
    return other instanceof Instruction
      ? this.opcode === other.opcode &&
          this.modifier === other.modifier &&
          this.a.mode === other.a.mode &&
          this.a.value === other.a.value &&
          this.b.mode === other.b.mode &&
          this.b.value === other.b.value
      : false;
  }
}
