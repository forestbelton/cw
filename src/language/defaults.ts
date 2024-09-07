import { Mode, Modifier, Operation, RawOperand } from "./insn";

export const DEFAULT_MODE = Mode.Direct;

export const DEFAULT_OPERAND: RawOperand = {
  mode: Mode.Immediate,
  expr: 0,
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

export class DefaultModifier {
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

export const DEFAULT_MODIFIERS: Record<Operation, DefaultModifier[]> = {
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
