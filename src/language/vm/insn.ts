import {
  ArithmeticOpcode,
  Instruction,
  Modifier,
  Opcode,
  isArithmeticOpcode,
} from "../insn";
import { InstructionLens } from "../insn/lens";
import { InstructionPointer } from "./core";
import { TaskUpdate } from "./warrior";

export type ResolvedOperand = {
  insn: Instruction;
  readPointer: InstructionPointer;
  writePointer: InstructionPointer;
};

export type InstructionExecutionContext = {
  pc: InstructionPointer;
  insn: Instruction;
  aOperand: ResolvedOperand;
  bOperand: ResolvedOperand;
  aValue: InstructionLens;
  bValue: InstructionLens;
};

export type InstructionHandler = (
  ctx: InstructionExecutionContext
) => TaskUpdate;

const BINOPS: Record<
  ArithmeticOpcode,
  (lhs: number, rhs: number) => number | null
> = {
  [Opcode.ADD]: (lhs, rhs) => lhs + rhs,
  [Opcode.SUB]: (lhs, rhs) => lhs - rhs,
  [Opcode.MUL]: (lhs, rhs) => lhs * rhs,
  [Opcode.DIV]: (lhs, rhs) => (rhs !== 0 ? Math.floor(lhs / rhs) : null),
  [Opcode.MOD]: (lhs, rhs) => (rhs !== 0 ? lhs % rhs : null),
};

const handleArithmetic: InstructionHandler = (ctx) => {
  const { pc, aValue, bValue, insn } = ctx;

  if (!isArithmeticOpcode(insn.opcode)) {
    // Will only occur if handler installed on non-arithmetic opcode (never)
    throw new Error();
  }

  const as = aValue.get();
  const bs = bValue.get();

  if (as.length !== bs.length) {
    // Lenses point to different sized data
    throw new Error();
  }

  let shouldQueue = true;
  for (let i = 0; i < bs.length; ++i) {
    const result = BINOPS[insn.opcode](bs[i], as[i]);
    if (result === null) {
      shouldQueue = false;
      break;
    }
    bs[i] = result;
    bValue.set(bs);
  }

  return shouldQueue ? { nextPointer: pc.add(1) } : {};
};

export const INSTRUCTION_HANDLERS: Record<Opcode, InstructionHandler> = {
  [Opcode.DAT]: () => ({}),
  [Opcode.MOV]: ({ pc, insn, aValue, bValue, aOperand, bOperand }) => {
    if (insn.modifier === Modifier.I) {
      bOperand.writePointer.set(aOperand.insn);
    } else {
      bValue.set(aValue.get());
    }
    return { nextPointer: pc.add(1) };
  },
  [Opcode.ADD]: handleArithmetic,
  [Opcode.SUB]: handleArithmetic,
  [Opcode.MUL]: handleArithmetic,
  [Opcode.DIV]: handleArithmetic,
  [Opcode.MOD]: handleArithmetic,
  [Opcode.JMP]: ({ aOperand }) => ({
    nextPointer: aOperand.readPointer,
  }),
  [Opcode.JMZ]: ({ aOperand, bValue, pc }) => ({
    nextPointer: bValue.get().every((v) => v === 0)
      ? aOperand.readPointer
      : pc.add(1),
  }),
  [Opcode.JMN]: ({ aOperand, bValue, pc }) => ({
    nextPointer: bValue.get().every((v) => v !== 0)
      ? aOperand.readPointer
      : pc.add(1),
  }),
  [Opcode.DJN]: ({ aOperand, bValue, pc }) => ({
    nextPointer: bValue.update((v) => v - 1).every((v) => v !== 0)
      ? aOperand.readPointer
      : pc.add(1),
  }),
  [Opcode.CMP]: ({ aOperand, bOperand, aValue, bValue, pc, insn }) => {
    const cond =
      insn.modifier === Modifier.I
        ? aOperand.insn.equals(bOperand.insn)
        : aValue.zip(bValue).every(([a, b]) => a === b);
    return { nextPointer: pc.add(cond ? 2 : 1) };
  },
  [Opcode.SLT]: ({ aValue, bValue, pc }) => {
    const cond = aValue.zip(bValue).every(([a, b]) => a < b);
    return { nextPointer: pc.add(cond ? 2 : 1) };
  },
  [Opcode.SPL]: ({ aOperand, pc }) => ({
    nextPointer: pc.add(1),
    newTaskPointer: aOperand.writePointer,
  }),
};
