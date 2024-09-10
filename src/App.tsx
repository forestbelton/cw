import { useCallback } from "react";
import ProgramEditor from "./components/ProgramEditor";
import { assemble } from "./language/assemble";
import { VM } from "./language/vm";
import { icw86Options } from "./language/options";

const sourceCode = `;redcode
   
;name          Dwarf
;author        A. K. Dewdney
;version       94.1
;date          April 29, 1993
     
;strategy      Bombs every fourth instruction.
     
        ORG     start              ; Indicates the instruction with
                                   ; the label "start" should be the
                                   ; first to execute.
     
target  DAT.F   #0,       #0       ; Pointer to target instruction.
start   ADD.AB  #4,       target   ; Increments pointer by step.
        MOV.I   $target, @target   ; Bombs target instruction.
        JMP.A    start             ; Same as JMP.A -2.  Loops back to
                                   ; the instruction labelled "start".
        END
`;

const App = () => {
  const onSave = useCallback((value: string) => {
    const program = assemble(value);
    console.log(program);

    const vm = VM.create(icw86Options, [program, program]);
    vm.executeCycle();
  }, []);

  return (
    <div>
      <ProgramEditor defaultValue={sourceCode} onSave={onSave} />
    </div>
  );
};

export default App;
