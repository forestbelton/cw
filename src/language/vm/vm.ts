import { Mode, Modifier } from "../insn";
import { InstructionLens } from "../insn/lens";
import { Core, InstructionPointer } from "./core";
import {
  INSTRUCTION_HANDLERS,
  InstructionExecutionContext,
  ResolvedOperand,
} from "./insn";
import { VmOptions } from "./options";
import { Program } from "./program";
import { TaskUpdate, Warrior } from "./warrior";

export enum MatchStatus {
  WIN = "WIN",
  TIE = "TIE",
}

export type MatchResult = {
  status: MatchStatus;
  winnerID?: number;
  numCycles: number;
};

export class VM {
  options: VmOptions;
  programs: Program[];
  numCycles: number;
  core: Core;
  warriors: Warrior[];

  private constructor(
    options: VmOptions,
    programs: Program[],
    core: Core,
    warriors: Warrior[]
  ) {
    this.options = options;
    this.programs = programs;
    this.numCycles = 0;
    this.core = core;
    this.warriors = warriors;
  }

  static create(options: VmOptions, programs: Program[]) {
    // TODO: Validate core size > 0
    // TODO: Validate cycles before tie > 0
    // TODO: Validate instruction limit
    // TODO: Validate maxNumTasks > 0
    // TODO: Validate read/write distance (> 0, multiple of core size)
    // TODO: Validate minimum separation > 0
    // TODO: Validate separation > 0 or RANDOM
    // TODO: Validate numWarriors = warriors.length && numWarriors > 1
    const core = new Core(
      Array(options.coreSize).fill(options.initialInstruction),
      options.readDistance,
      options.writeDistance
    );

    let nextPc = 0;
    const warriors = programs.map((warrior, warriorId) => {
      const { code, startIndex } = warrior;

      console.log(`Loading warrior ${warriorId} at PC=${nextPc}`);
      for (let index = 0; index < code.length; ++index) {
        core.instructions[nextPc + index] = code[index];
      }

      const entryPoint = new InstructionPointer(core, nextPc + startIndex);

      if (typeof options.separation === "number") {
        nextPc += options.separation;
      } else {
        // TODO: Support random separation
        nextPc += code.length + 1;
      }

      return new Warrior(warriorId, options.maxNumTasks, entryPoint);
    });

    return new VM(options, programs, core, warriors);
  }

  execute(): MatchResult {
    this.numCycles = 0;

    while (
      this.numCycles < this.options.cyclesBeforeTie &&
      (this.warriors.length > 1 ||
        (this.warriors.length > 0 && this.warriors.length === 1))
    ) {
      this.executeCycle();
    }

    if (
      this.numCycles === this.options.cyclesBeforeTie ||
      this.warriors.length === 0
    ) {
      return { status: MatchStatus.TIE, numCycles: this.numCycles };
    }

    const winnerID = this.warriors[0].id;
    return { status: MatchStatus.WIN, winnerID, numCycles: this.numCycles };
  }

  executeCycle() {
    const executeStep = this.executeStep.bind(this);
    this.warriors.forEach((warrior) => warrior.executeTask(executeStep));
    this.warriors = this.warriors.filter((warrior) => {
      if (warrior.dead()) {
        console.log(`warrior ${warrior.id} died at cycle ${this.numCycles}!`);
        return false;
      }
      return true;
    });
    this.numCycles++;
  }

  clamp(address: number, limit: number) {
    let result = address % limit;
    if (result > Math.floor(limit / 2)) {
      result += this.core.size() - limit;
    }
    return result;
  }

  resolveOperand(pc: InstructionPointer, operand: "a" | "b"): ResolvedOperand {
    let readPointer = 0;
    let writePointer = 0;
    let postIncrementPointer: number | undefined;

    const insn = pc.fetch();
    const { mode, value } = insn[operand];
    if (mode !== Mode.Immediate) {
      readPointer = this.clamp(value, this.options.readDistance);
      writePointer = this.clamp(value, this.options.writeDistance);

      if (mode !== Mode.Direct) {
        if (mode === Mode.PreDecrementIndirect) {
          const preDecrementInsn = pc.add(writePointer).fetch();
          preDecrementInsn.b.value =
            (preDecrementInsn.b.value + this.core.size() - 1) %
            this.core.size();
        }
        if (mode === Mode.PostIncrementIndirect) {
          postIncrementPointer = writePointer;
        }
        readPointer = this.clamp(
          readPointer + pc.add(readPointer).fetch().b.value,
          this.options.readDistance
        );
        writePointer = this.clamp(
          readPointer + pc.add(writePointer).fetch().b.value,
          this.options.writeDistance
        );
      }
    }

    if (typeof postIncrementPointer !== "undefined") {
      const postIncrementInsn = pc.add(postIncrementPointer).fetch();
      postIncrementInsn.b.value =
        (postIncrementInsn.b.value + 1) % this.core.size();
    }

    return {
      insn: pc.add(readPointer).fetch(),
      readPointer: pc.add(readPointer),
      writePointer: pc.add(writePointer),
    };
  }

  createExecutionContext(pc: InstructionPointer): InstructionExecutionContext {
    const insn = pc.fetch();

    const aOperand = this.resolveOperand(pc, "a");
    const bOperand = this.resolveOperand(pc, "b");

    const aInsn = aOperand.insn;
    const bInsn = bOperand.insn;

    let aValue, bValue: InstructionLens;
    switch (insn.modifier) {
      case Modifier.A:
        aValue = InstructionLens.aNumber(aInsn);
        bValue = InstructionLens.aNumber(bInsn);
        break;
      case Modifier.B:
        aValue = InstructionLens.bNumber(aInsn);
        bValue = InstructionLens.bNumber(bInsn);
        break;
      case Modifier.AB:
        aValue = InstructionLens.aNumber(aInsn);
        bValue = InstructionLens.bNumber(bInsn);
        break;
      case Modifier.BA:
        aValue = InstructionLens.bNumber(aInsn);
        bValue = InstructionLens.aNumber(bInsn);
        break;
      case Modifier.F:
      case Modifier.I:
        aValue = InstructionLens.abNumber(aInsn);
        bValue = InstructionLens.abNumber(bInsn);
        break;
      case Modifier.X:
        aValue = InstructionLens.abNumber(aInsn);
        bValue = InstructionLens.baNumber(bInsn);
        break;
    }

    return {
      pc,
      insn,
      aOperand,
      bOperand,
      aValue,
      bValue,
    };
  }

  executeStep(pc: number | InstructionPointer): TaskUpdate {
    if (typeof pc === "number") {
      pc = new InstructionPointer(this.core, pc);
    }

    const ctx = this.createExecutionContext(pc);
    return INSTRUCTION_HANDLERS[ctx.insn.opcode](ctx);
  }
}
