import { assembleInstruction } from "./assemble";
import { Instruction } from "./insn";

export type RandomSeparation = "RANDOM";

export const RandomSeparation = "RANDOM";

export type VmOptions = {
  // The number of instructions which make up core
  coreSize: number;

  // How many cycles without a winner should be executed before declaring a
  // tie
  cyclesBeforeTie: number;

  // Instruction which is preloaded into core prior to loading warriors
  // TODO: Should be a different type
  initialInstruction: Instruction;

  // Maximum number of instructiosn allowed per load file
  instructionLimit: number;

  // Maximum number tasks allowed per warrior
  maxNumTasks: number;

  // Minimum number of instructions from the first instruction of one warrior
  // to the first instruction of the next warrior
  minimumSeparation: number;

  // Range available for warriors to read information from core
  // Must be a factor of core size
  readDistance: number;

  // Number of instructions from the first instruction of one warrior to the
  // first instruction of the next warrior
  separation: number | RandomSeparation;

  // Initial number of warriors to battle simultaneously
  numWarriors: number;

  // Range available for warriors to write information to core
  // Must be a factor of core size
  writeDistance: number;
};

export const icw86Options: VmOptions = {
  coreSize: 8192,
  cyclesBeforeTie: 100000,
  initialInstruction: assembleInstruction("DAT.F #0, #0"),
  instructionLimit: 300,
  maxNumTasks: 64,
  minimumSeparation: 300,
  readDistance: 8192,
  separation: RandomSeparation,
  numWarriors: 2,
  writeDistance: 8192,
};

export const kothOptions: VmOptions = {
  coreSize: 8000,
  cyclesBeforeTie: 80000,
  initialInstruction: assembleInstruction("DAT.F $0, $0"),
  instructionLimit: 100,
  maxNumTasks: 8000,
  minimumSeparation: 100,
  readDistance: 8000,
  separation: RandomSeparation,
  numWarriors: 2,
  writeDistance: 8000,
};
