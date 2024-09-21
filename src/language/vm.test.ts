import { assemble, assembleInstruction } from "./assemble";
import { icw86Options } from "./options";
import { InstructionPointer, VM } from "./vm";

// NB: Wow, this really sucks
expect.extend({
  toBeTaskUpdate: (received, actual) => {
    const receiveKeys = new Set(Object.keys(received));
    const taskUpdateKeys = new Set(["nextPointer", "newTaskPointer"]);

    for (const receiveKey of receiveKeys) {
      if (!taskUpdateKeys.has(receiveKey)) {
        return {
          pass: false,
          message: () => `object has unexpected key ${receiveKey}`,
        };
      }
    }

    if (typeof actual.nextPointer === "undefined") {
      if (typeof received.nextPointer !== "undefined") {
        return {
          pass: false,
          message: () =>
            `expected nextPointer to not be set, but it was ${received.nextPointer}`,
        };
      }
    } else if (!actual.nextPointer.equals(received.nextPointer)) {
      return {
        pass: false,
        message: () =>
          `expected nextPointer to be ${actual.nextPointer}, but it was ${received.nextPointer}`,
      };
    }

    if (typeof actual.newTaskPointer === "undefined") {
      if (typeof received.newTaskPointer !== "undefined") {
        return {
          pass: false,
          message: () =>
            `expected newTaskPointer to not be set, but it was ${received.newTaskPointer}`,
        };
      }
    } else if (!actual.newTaskPointer.equals(received.newTaskPointer)) {
      return {
        pass: false,
        message: () =>
          `expected nextPointer to be ${actual.newTaskPointer}, but it was ${received.newTaskPointer}`,
      };
    }

    return {
      pass: true,
      message: () => "",
    };
  },
});

/** Execute a single instruction at PC=0 and check its result.
 *
 * @param _type Name of modifier tested
 * @param code Code to load into memory. Starts at PC=0
 * @param expected Expected instruction at PC=2 after execution
 */
const basicInsnTest = (_type: string, code: string, expected: string) => {
  const vm = VM.create(icw86Options, [assemble(code)]);
  const update = vm.executeStep(0);
  expect(vm.core[2]).toStrictEqual(assembleInstruction(expected));

  expect(update).toBeTaskUpdate({
    nextPointer: new InstructionPointer(vm, 1),
  });
};

describe("VM", () => {
  describe("executeStep", () => {
    describe("DAT", () => {
      it("stops execution", () => {
        const vm = VM.create(icw86Options, [assemble("DAT.F #1, #2")]);
        const update = vm.executeStep(0);
        expect(update).toStrictEqual({});
      });
    });
    describe("MOV", () => {
      it.each([
        [
          "A",
          `
            MOV.A #123, $2
            DAT.F #0, #0
            DAT.F #0, #0
          `,
          "DAT.F #123, #0",
        ],
        [
          "B",
          `
            MOV.B $1, $2
            DAT.F #0, #123
            DAT.F #0, #0
          `,
          "DAT.F #0, #123",
        ],
        [
          "AB",
          `
            MOV.AB $1, $2
            DAT.F #123, #0
            DAT.F #0, #0
          `,
          "DAT.F #0, #123",
        ],
        [
          "BA",
          `
            MOV.BA $1, $2
            DAT.F #0, #123
            DAT.F #0, #0
          `,
          "DAT.F #123, #0",
        ],
        [
          "F",
          `
            MOV.F $1, $2
            DAT.F #123, #456
            DAT.F #0, #0
          `,
          "DAT.F #123, #456",
        ],
        [
          "X",
          `
            MOV.X $1, $2
            DAT.F #123, #456
            DAT.F #0, #0
          `,
          "DAT.F #456, #123",
        ],
        [
          "I",
          `
            MOV.I $1, $2
            JMP #123
            DAT.F #0, #0
          `,
          "JMP #123",
        ],
      ])("MOV.%s", basicInsnTest);
    });
    describe("ADD", () => {
      it.each([
        [
          "A",
          `
            ADD.A $1, $2
            DAT.F #123, #0
            DAT.F #456, #0
          `,
          "DAT.F #579, #0",
        ],
        [
          "B",
          `
            ADD.B $1, $2
            DAT.F #0, #123
            DAT.F #0, #456
          `,
          "DAT.F #0, #579",
        ],
        [
          "AB",
          `
            ADD.AB $1, $2
            DAT.F #123, #0
            DAT.F #0, #456
            `,
          "DAT.F #0, #579",
        ],
        [
          "BA",
          `
            ADD.BA $1, $2
            DAT.F #0, #123
            DAT.F #456, #0
          `,
          "DAT.F #579, #0",
        ],
        [
          "F",
          `
            ADD.F $1, $2
            DAT.F #123, #333
            DAT.F #456, #666
          `,
          "DAT.F #579, #999",
        ],
        [
          "X",
          `
            ADD.X $1, $2
            DAT.F #123, #333
            DAT.F #666, #456
          `,
          "DAT.F #999, #579",
        ],
        [
          "I",
          `
            ADD.I $1, $2
            DAT.F #123, #333
            DAT.F #456, #666
          `,
          "DAT.F #579, #999",
        ],
      ])("ADD.%s", basicInsnTest);
    });
    describe("DIV", () => {
      it("DIV.A", () => {
        const vm = VM.create(icw86Options, [
          assemble(`
            DIV.A $1, $2
            DAT.F #222, #0
            DAT.F #666, #0
        `),
        ]);
        expect(vm.executeStep(0)).toBeTaskUpdate({
          nextPointer: new InstructionPointer(vm, 1),
        });
        expect(vm.core[2]).toStrictEqual(assembleInstruction("DAT.F #3, #0"));
        vm.core[1].a.value = 0;
        expect(vm.executeStep(0)).toBeTaskUpdate({});
        expect(vm.core[2]).toStrictEqual(assembleInstruction("DAT.F #3, #0"));
      });
      it("DIV.B", () => {
        const vm = VM.create(icw86Options, [
          assemble(`
              DIV.B $1, $2
              DAT.F #0, #222
              DAT.F #0, #666
          `),
        ]);
        expect(vm.executeStep(0)).toBeTaskUpdate({
          nextPointer: new InstructionPointer(vm, 1),
        });
        expect(vm.core[2]).toStrictEqual(assembleInstruction("DAT.F #0, #3"));
        vm.core[1].b.value = 0;
        expect(vm.executeStep(0)).toStrictEqual({});
        expect(vm.core[2]).toStrictEqual(assembleInstruction("DAT.F #0, #3"));
      });
      it("DIV.AB", () => {
        const vm = VM.create(icw86Options, [
          assemble(`
              DIV.AB $1, $2
              DAT.F #222, #0
              DAT.F #0, #666
          `),
        ]);
        expect(vm.executeStep(0)).toBeTaskUpdate({
          nextPointer: new InstructionPointer(vm, 1),
        });
        expect(vm.core[2]).toStrictEqual(assembleInstruction("DAT.F #0, #3"));
        vm.core[1].a.value = 0;
        expect(vm.executeStep(0)).toStrictEqual({});
        expect(vm.core[2]).toStrictEqual(assembleInstruction("DAT.F #0, #3"));
      });
      it("DIV.BA", () => {
        const vm = VM.create(icw86Options, [
          assemble(`
              DIV.BA $1, $2
              DAT.F #0, #222
              DAT.F #666, #0
          `),
        ]);
        expect(vm.executeStep(0)).toBeTaskUpdate({
          nextPointer: new InstructionPointer(vm, 1),
        });
        expect(vm.core[2]).toStrictEqual(assembleInstruction("DAT.F #3, #0"));
        vm.core[1].b.value = 0;
        expect(vm.executeStep(0)).toStrictEqual({});
        expect(vm.core[2]).toStrictEqual(assembleInstruction("DAT.F #3, #0"));
      });
      it("DIV.F", () => {
        const vm = VM.create(icw86Options, [
          assemble(`
              DIV.F $1, $2
              DAT.F #222, #222
              DAT.F #666, #444

              DIV.F $1, $2
              DAT.F #222, #0
              DAT.F #666, #444

              DIV.F $1, $2
              DAT.F #0, #222
              DAT.F #666, #444
          `),
        ]);
        expect(vm.executeStep(0)).toBeTaskUpdate({
          nextPointer: new InstructionPointer(vm, 1),
        });
        expect(vm.core[2]).toStrictEqual(assembleInstruction("DAT.F #3, #2"));

        expect(vm.executeStep(3)).toStrictEqual({});
        expect(vm.core[5]).toStrictEqual(assembleInstruction("DAT.F #3, #444"));

        expect(vm.executeStep(6)).toStrictEqual({});
        expect(vm.core[8]).toStrictEqual(
          assembleInstruction("DAT.F #666, #444")
        );
      });
      it("DIV.X", () => {
        const vm = VM.create(icw86Options, [
          assemble(`
              DIV.X $1, $2
              DAT.F #222, #222
              DAT.F #666, #444

              DIV.X $1, $2
              DAT.F #222, #0
              DAT.F #666, #444

              DIV.X $1, $2
              DAT.F #0, #222
              DAT.F #666, #444
          `),
        ]);
        expect(vm.executeStep(0)).toBeTaskUpdate({
          nextPointer: new InstructionPointer(vm, 1),
        });
        expect(vm.core[2]).toStrictEqual(assembleInstruction("DAT.F #3, #2"));

        expect(vm.executeStep(3)).toStrictEqual({});
        expect(vm.core[5]).toStrictEqual(assembleInstruction("DAT.F #666, #2"));

        expect(vm.executeStep(6)).toStrictEqual({});
        expect(vm.core[8]).toStrictEqual(
          assembleInstruction("DAT.F #666, #444")
        );
      });
      it("DIV.I", () => {
        const vm = VM.create(icw86Options, [
          assemble(`
              DIV.I $1, $2
              DAT.F #222, #222
              DAT.F #666, #666

              DIV.I $1, $2
              DAT.F #222, #0
              DAT.F #666, #666

              DIV.I $1, $2
              DAT.F #0, #222
              DAT.F #666, #666
          `),
        ]);
        expect(vm.executeStep(0)).toBeTaskUpdate({
          nextPointer: new InstructionPointer(vm, 1),
        });
        expect(vm.core[2]).toStrictEqual(assembleInstruction("DAT.F #3, #3"));

        expect(vm.executeStep(3)).toStrictEqual({});
        expect(vm.core[5]).toStrictEqual(assembleInstruction("DAT.F #3, #666"));

        expect(vm.executeStep(6)).toStrictEqual({});
        expect(vm.core[8]).toStrictEqual(
          assembleInstruction("DAT.F #666, #666")
        );
      });
    });
    describe("JMP", () => {
      it("performs relative jump to A-pointer", () => {
        const vm = VM.create(icw86Options, [
          assemble(`
            DAT.F #0, #0
            JMP $-1
        `),
        ]);
        expect(vm.executeStep(1)).toBeTaskUpdate({
          nextPointer: new InstructionPointer(vm, 0),
        });
      });
    });
    describe("SPL", () => {});
  });
});
