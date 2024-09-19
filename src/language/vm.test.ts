import { assemble, assembleInstruction } from "./assemble";
import { icw86Options } from "./options";
import { VM } from "./vm";

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
  expect(update).toStrictEqual({
    nextPointer: 1,
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
    describe("JMP", () => {
      it("performs relative jump to A-pointer", () => {
        const vm = VM.create(icw86Options, [
          assemble(`
            DAT.F #0, #0
            JMP $-1
        `),
        ]);
        const update = vm.executeStep(1);
        expect(update).toStrictEqual({
          nextPointer: 0,
        });
      });
    });
    describe("SPL", () => {});
  });
});
