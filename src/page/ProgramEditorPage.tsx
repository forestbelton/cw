import { useCallback, useEffect, useState } from "react";
import ProgramEditor from "../components/ProgramEditor";
import { Redirect, useLocation } from "wouter";
import { API_CLIENT } from "../api";

const PROGRAM_ID_REGEX = /^\/programs\/(.*)$/;

const isNewProgram = (id: string) => id === "new";

const ProgramEditorPage = () => {
  const [location, setLocation] = useLocation();

  const match = PROGRAM_ID_REGEX.exec(location);
  if (match === null) {
    return <Redirect to="/" />;
  }

  const programId = match[1];

  const [loading, setLoading] = useState(true);
  const [sourceCode, setSourceCode] = useState("");

  useEffect(() => {
    if (isNewProgram(programId)) {
      setLoading(false);
      setSourceCode("");
    } else {
      API_CLIENT.getProgram(programId).then((program) => {
        setLoading(false);
        if (program === null) {
          setLocation("/programs");
          return;
        }
        setSourceCode(program.sourceCode);
      });
    }
  }, [programId]);

  const onCancel = useCallback(() => setLocation("/programs"), []);
  const onSave = useCallback(
    async (sourceCode: string) => {
      isNewProgram(programId)
        ? await API_CLIENT.createProgram(sourceCode)
        : await API_CLIENT.updateProgram(programId, sourceCode);
      setLocation("/programs");
    },
    [programId]
  );

  return (
    <div>
      {loading ? (
        <span>Loading...</span>
      ) : (
        <ProgramEditor
          defaultValue={sourceCode}
          onCancel={onCancel}
          onSave={onSave}
          saveButtonLabel={isNewProgram(programId) ? "Create" : "Save"}
        />
      )}
    </div>
  );
};

export default ProgramEditorPage;
