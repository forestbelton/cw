import { Instruction } from "./index";

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
