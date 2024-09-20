import { Redirect, useLocation } from "wouter";
import { API_CLIENT } from "../api";
import { useCallback, useEffect, useReducer, useState } from "react";
import { icw86Options } from "../language/options";
import { VM } from "../language/vm";
import { assemble } from "../language/assemble";
import Button from "../components/Button";
import { prettyPrint } from "../language/insn";

const PROGRAM_ID_REGEX = /^\/programs\/(.*)\/debugger$/;

const ProgramDebuggerPage = () => {
  const [location, setLocation] = useLocation();

  const match = PROGRAM_ID_REGEX.exec(location);
  if (match === null) {
    return <Redirect to="/" />;
  }

  const programId = match[1];

  const [_ignored, forceUpdate] = useReducer((x) => x + 1, 0);
  const [loading, setLoading] = useState(true);
  const [vm, setVm] = useState(() => VM.create(icw86Options, []));

  useEffect(() => {
    API_CLIENT.getProgram(programId).then((program) => {
      setLoading(false);
      if (program === null) {
        setLocation("/programs");
        return;
      }

      const warrior = assemble(program.sourceCode);
      setVm(VM.create(icw86Options, [warrior]));
    });
  }, [programId]);

  const executeStep = useCallback(() => {
    vm.executeCycle();
    forceUpdate();
  }, [forceUpdate, vm]);

  return (
    <div>
      {loading ? (
        <span>Loading...</span>
      ) : (
        <div>
          <div style={{ display: "flex" }}>
            <div style={{ width: "50%" }}>
              <div>Cycle Count: {vm.numCycles}</div>
              <div>
                PCs:{" "}
                {vm.vmWarriors[0].taskQueue
                  .map(
                    ({ taskID, instructionPointer }) =>
                      `#${taskID} => ${instructionPointer}`
                  )
                  .join(", ")}
              </div>
            </div>
            <pre style={{ height: "500px", overflow: "scroll", width: "50%" }}>
              {vm.core
                .map(
                  (insn, instructionPointer) =>
                    `${
                      vm.vmWarriors[0].taskQueue.find(
                        (task) => task.instructionPointer === instructionPointer
                      )
                        ? "*"
                        : " "
                    } ${prettyPrint(insn)}`
                )
                .join("\n")}
            </pre>
          </div>
          <Button label="Step" onClick={executeStep} />
        </div>
      )}
    </div>
  );
};

export default ProgramDebuggerPage;
