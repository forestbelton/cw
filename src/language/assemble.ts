import {
  AnyRawInstruction,
  ArithmeticOperation,
  Instruction,
  Mode,
  Modifier,
  Operation,
  RawExpr,
  RawInstruction,
} from "./insn";
import * as parser from "./parser";
import { Warrior } from "./warrior";

type Symbols = Record<string, number>;

const BINOPS: Record<
  ArithmeticOperation,
  (lhs: number, rhs: number) => number
> = {
  [Operation.ADD]: (lhs, rhs) => lhs + rhs,
  [Operation.SUB]: (lhs, rhs) => lhs - rhs,
  [Operation.MUL]: (lhs, rhs) => lhs * rhs,
  [Operation.DIV]: (lhs, rhs) => Math.floor(lhs / rhs),
  [Operation.MOD]: (lhs, rhs) => lhs % rhs,
};

export const assembleInstruction = (sourceCode: string): Instruction => {
  const raw = parser.parse(sourceCode, { startRule: "Instruction" });
  return assembleRawInstruction(raw, 0, {});
};

export const assemble = (sourceCode: string): Warrior => {
  // TODO: Perform EQU substitution
  const raw = parser.parse(sourceCode, { startRule: "AssemblyFile" });
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
    const defaultOperand = {
      mode: Mode.Immediate,
      expr: 0,
    };

    if (operation === Operation.DAT) {
      a = defaultOperand;
      b = raw.a;
    } else {
      b = defaultOperand;
    }
  }

  // A missing (null or blank) mode assembles as '$' does.
  const aMode = a.mode || Mode.Direct;
  const bMode = b.mode || Mode.Direct;

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

type IncludesChar<
  S extends string,
  C extends string
> = S extends `${string}${C}${string}` ? S : never;

type ExcludesChar<
  S extends string,
  C extends string
> = S extends `${infer H}${infer T}`
  ? H extends C
    ? never
    : `${H}${ExcludesChar<T, C>}`
  : S;

type UniqueChars<S extends string> = S extends `${infer H}${infer T}`
  ? `${H}${ExcludesChar<T, H>}`
  : S;

type CharsFrom<
  S extends string,
  A extends string
> = S extends `${infer H}${infer T}`
  ? A extends IncludesChar<A, H>
    ? `${H}${CharsFrom<T, A>}`
    : never
  : S;

type UsesCharSet<A extends string, S extends string> = CharsFrom<S, A> &
  UniqueChars<S>;

type ModeSet<S extends string> = UsesCharSet<"#$@<>", S>;

type ExistsDefaultModifier = <U>(
  f: <L extends string, R extends string>(
    l: ModeSet<L>,
    r: ModeSet<R>,
    m: Modifier
  ) => U
) => U;

class DefaultModifier {
  some: ExistsDefaultModifier;

  private constructor(some: ExistsDefaultModifier) {
    this.some = some;
  }

  match(a: Mode, b: Mode) {
    return this.some((l, r, m) => (l.includes(a) && r.includes(b) ? m : null));
  }

  static defaults<L extends string, R extends string>(
    l: ModeSet<L>,
    r: ModeSet<R>,
    m: Modifier
  ) {
    return new DefaultModifier((f) => f(l, r, m));
  }
}

const defaults = <L extends string, R extends string>(
  l: ModeSet<L>,
  r: ModeSet<R>,
  m: Modifier
): DefaultModifier => DefaultModifier.defaults(l, r, m);

const DEFAULT_DATA_MODIFIERS: DefaultModifier[] = [
  defaults("#", "#$@<>", Modifier.AB),
  defaults("$@<>", "#", Modifier.B),
  defaults("$@<>", "$@<>", Modifier.I),
];

const DEFAULT_ARITH_MODIFIERS: DefaultModifier[] = [
  defaults("#", "#$@<>", Modifier.AB),
  defaults("$@<>", "#$@<>", Modifier.AB),
];

const DEFAULT_BRANCH_MODIFIERS: DefaultModifier[] = [
  defaults("#$@<>", "#$@<>", Modifier.B),
];

const DEFAULT_MODIFIERS: Record<Operation, DefaultModifier[]> = {
  [Operation.DAT]: [defaults("#$@<>", "#$@<>", Modifier.F)],
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
    defaults("#", "#$@<>", Modifier.AB),
    defaults("$@<>", "#$@<>", Modifier.B),
  ],
  [Operation.SPL]: DEFAULT_BRANCH_MODIFIERS,
};
