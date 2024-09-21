import { Mode, Modifier, Opcode } from "../insn";

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

export const DEFAULT_MODIFIERS: Record<Opcode, DefaultModifier[]> = {
  [Opcode.DAT]: [defaults("#$@<>", "#$@<>", Modifier.F)],
  [Opcode.MOV]: DEFAULT_DATA_MODIFIERS,
  [Opcode.ADD]: DEFAULT_ARITH_MODIFIERS,
  [Opcode.SUB]: DEFAULT_ARITH_MODIFIERS,
  [Opcode.MUL]: DEFAULT_ARITH_MODIFIERS,
  [Opcode.DIV]: DEFAULT_ARITH_MODIFIERS,
  [Opcode.MOD]: DEFAULT_ARITH_MODIFIERS,
  [Opcode.JMP]: DEFAULT_BRANCH_MODIFIERS,
  [Opcode.JMZ]: DEFAULT_BRANCH_MODIFIERS,
  [Opcode.JMN]: DEFAULT_BRANCH_MODIFIERS,
  [Opcode.DJN]: DEFAULT_BRANCH_MODIFIERS,
  [Opcode.CMP]: DEFAULT_DATA_MODIFIERS,
  [Opcode.SLT]: [
    defaults("#", "#$@<>", Modifier.AB),
    defaults("$@<>", "#$@<>", Modifier.B),
  ],
  [Opcode.SPL]: DEFAULT_BRANCH_MODIFIERS,
};
