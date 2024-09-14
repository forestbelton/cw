import { useCallback } from "react";
import ProgramEditor from "../components/ProgramEditor";
import { assemble } from "../language/assemble";
import { Redirect, useLocation } from "wouter";

const sourceCode = `;redcode
   
;name          Dwarf
;author        A. K. Dewdney
;version       94.1
;date          April 29, 1993
     
;strategy      Bombs every fourth instruction.
     
        ORG     start              ; Indicates the instruction with
                                   ; the label "start" should be the
                                   ; first to execute.
     
target  DAT.F   #0,     #0         ; Pointer to target instruction.
start   ADD.AB  #4,     target     ; Increments pointer by step.
        MOV.I   $0,    @target     ; Bombs target instruction.
        JMP.A    start             ; Same as JMP.A -2.  Loops back to
                                   ; the instruction labelled "start".
        END
`;

const PROGRAM_ID_REGEX = /^\/programs\/(.*)$/;

const ProgramEditorPage = () => {
  const [location, setLocation] = useLocation();

  const match = PROGRAM_ID_REGEX.exec(location);
  if (match === null) {
    return <Redirect to="/" />;
  }

  const programId = match[1];
  const saveButtonLabel = programId === "new" ? "Create" : "Save";

  const onCancel = useCallback(() => setLocation("/programs"), []);
  const onSave = useCallback((value: string) => {
    const program = assemble(value);
    console.log(program);
  }, []);

  return (
    <div>
      <ProgramEditor
        defaultValue={sourceCode}
        onCancel={onCancel}
        onSave={onSave}
        saveButtonLabel={saveButtonLabel}
      />
    </div>
  );
};

export default ProgramEditorPage;
