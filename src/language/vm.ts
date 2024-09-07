import { Instruction } from "./insn";
import { VmOptions } from "./options";
import { Warrior } from "./warrior";

type WarriorID = number;

export class VM {
  options: VmOptions;
  warriors: Warrior[];
  core: Instruction[];
  taskQueues: Record<WarriorID, number[]>;

  private constructor(options: VmOptions, warriors: Warrior[]) {
    this.options = options;
    this.warriors = warriors;
    this.core = Array(options.coreSize).fill(options.initialInstruction);

    this.taskQueues = {};

    let nextPc = 0;
    for (let warriorId = 0; warriorId < warriors.length; ++warriorId) {
      const { code, startIndex } = warriors[warriorId];

      for (let index = 0; index < code.length; ++index) {
        this.core[nextPc + index] = code[index];
      }

      this.taskQueues[warriorId] = [nextPc + startIndex];
      if (typeof options.separation === "number") {
        nextPc += options.separation;
      } else {
        // TODO: Support random separation
      }
    }
  }

  static create(options: VmOptions, warriors: Warrior[]) {
    // TODO: Validate core size > 0
    // TODO: Validate cycles before tie > 0
    // TODO: Validate instruction limit
    // TODO: Validate maxNumTasks > 0
    // TODO: Validate read/write distance (> 0, multiple of core size)
    // TODO: Validate minimum separation > 0
    // TODO: Validate separation > 0 or RANDOM
    // TODO: Validate numWarriors = warriors.length
    return new VM(options, warriors);
  }
}
