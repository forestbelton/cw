import { Instruction, Operation } from "./insn";
import { VmOptions } from "./options";
import { Warrior } from "./warrior";

export class VM {
  options: VmOptions;
  warriors: Warrior[];
  core: Instruction[];
  taskQueues: Record<string, number[]>;
  numCycles: number;

  private constructor(options: VmOptions, warriors: Warrior[]) {
    this.options = options;
    this.warriors = warriors;
    this.core = Array(options.coreSize).fill(options.initialInstruction);

    this.taskQueues = {};
    this.numCycles = 0;

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

  executeCycle() {
    const deadWarriorIDs = Object.entries(this.taskQueues).flatMap(
      ([warriorID, taskQueue]) => {
        this.executeStep(taskQueue);
        return taskQueue.length === 0 ? [warriorID] : [];
      }
    );

    deadWarriorIDs.forEach((warriorID) => {
      delete this.taskQueues[warriorID];
    });

    this.numCycles += 1;
  }

  executeStep(taskQueue: number[]) {
    const pc = taskQueue.shift();
    if (typeof pc === "undefined") {
      return;
    }

    const insn = this.core[pc];
    switch (insn.operation) {
      case Operation.DAT:
        break;
      case Operation.MOV:
        break;
      case Operation.ADD:
        break;
      case Operation.SUB:
        break;
      case Operation.MUL:
        break;
      case Operation.DIV:
        break;
      case Operation.MOD:
        break;
      case Operation.JMP:
        break;
      case Operation.JMZ:
        break;
      case Operation.JMN:
        break;
      case Operation.DJN:
        break;
      case Operation.CMP:
        break;
      case Operation.SLT:
        break;
      case Operation.SPL:
        break;
    }
  }
}
