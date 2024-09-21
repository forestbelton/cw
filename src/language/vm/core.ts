import { Instruction } from "../insn";

export class Core {
  instructions: Instruction[];
  readLimit: number;
  writeLimit: number;

  constructor(
    instructions: Instruction[],
    readLimit: number,
    writeLimit: number
  ) {
    this.instructions = instructions;
    this.readLimit = readLimit;
    this.writeLimit = writeLimit;
  }

  size() {
    return this.instructions.length;
  }
}

export class InstructionPointer {
  private core: Core;
  private address: number;

  constructor(core: Core, address: number) {
    this.core = core;
    this.address = address;

    while (this.address < 0) {
      this.address += this.core.size();
    }
    this.address = this.address % this.core.size();
  }

  add(offset: number) {
    return new InstructionPointer(this.core, this.address + offset);
  }

  fetch() {
    return this.core.instructions[this.address];
  }

  set(insn: Instruction) {
    this.core.instructions[this.address] = insn;
  }

  equals(other: any) {
    if (typeof other === "number") {
      other = new InstructionPointer(this.core, other);
    }

    return other instanceof InstructionPointer
      ? this.address === other.address
      : false;
  }

  toString() {
    return this.address.toString();
  }
}
