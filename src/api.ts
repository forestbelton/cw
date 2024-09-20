export type Program = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  sourceCode: string;
};

export interface ApiClient {
  getProgram(id: string): Promise<Program | null>;
  createProgram(sourceCode: string): Promise<Program>;
  updateProgram(id: string, sourceCode: string): Promise<Program>;
  getUserPrograms(): Promise<Program[]>;
}

const STUB_SOURCE_CODE = `;redcode

;name          Dwarf
;author        A. K. Dewdney
;version       94.1
;date          April 29, 1993
     
;strategy      Bombs every fourth instruction.
     
        ORG     start              ; Indicates the instruction with
                                   ; the label "start" should be the
                                   ; first to execute.
     
target  DAT.F   #0,      #0        ; Pointer to target instruction.
start   ADD.AB  #4,       target   ; Increments pointer by step.
        MOV.I   $target, @target   ; Bombs target instruction.
        JMP.A    start             ; Same as JMP.A -2.  Loops back to
                                   ; the instruction labelled "start".
        END
`;

class StubApiClient implements ApiClient {
  store: Record<string, Program>;

  constructor() {
    this.store = {
      "864526ed-c89f-45a0-9218-25569ad89c35": {
        id: "864526ed-c89f-45a0-9218-25569ad89c35",
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceCode: STUB_SOURCE_CODE,
      },
    };
  }

  async getProgram(id: string) {
    return typeof this.store[id] !== "undefined" ? this.store[id] : null;
  }

  async createProgram(sourceCode: string) {
    const id = fakeUuid();

    this.store[id] = {
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceCode,
    };

    return this.store[id];
  }

  async updateProgram(id: string, sourceCode: string) {
    if (typeof this.store[id] === "undefined") {
      throw new Error(`program with id ${id} does not exist`);
    }
    this.store[id] = {
      ...this.store[id],
      updatedAt: new Date(),
      sourceCode,
    };
    return this.store[id];
  }

  async getUserPrograms() {
    return Object.values(this.store);
  }
}

const fakeUuid = () =>
  [
    fakeHexChars(8),
    fakeHexChars(4),
    fakeHexChars(4),
    fakeHexChars(4),
    fakeHexChars(12),
  ].join("-");

const fakeHexChars = (amount: number) => {
  let s = "";
  for (let i = 0; i < amount; ++i) {
    s += fakeHexChar();
  }
  return s;
};

const fakeHexChar = () => {
  const chars = "0123456789abcdef";
  return chars[Math.floor(Math.random() * chars.length)];
};

export const API_CLIENT = new StubApiClient();
