import { aura } from "@uiw/codemirror-theme-aura";
import CodeMirror, { ViewUpdate } from "@uiw/react-codemirror";
import { useCallback, useState } from "react";
import Button from "./Button";
import { cwHighlighter } from "../editor/highlighter";

type ProgramEditorProps = {
  defaultValue?: string;
  onCancel?: () => void;
  onSave?: (value: string) => void;
  readOnly?: boolean;
  saveButtonLabel?: string;
};

const DEFAULT_SAVE_BUTTON_LABEL = "Save";

const DEFAULT_PROGRAM = "";

const DEFAULT_CALLBACK = () => {};

const ProgramEditor = ({
  defaultValue,
  onCancel,
  onSave,
  readOnly,
  saveButtonLabel,
}: ProgramEditorProps) => {
  const [value, setValue] = useState(defaultValue ?? DEFAULT_PROGRAM);
  const onChange = useCallback(
    (value: string, _viewUpdate: ViewUpdate) => setValue(value),
    [setValue]
  );

  onSave = onSave || DEFAULT_CALLBACK;
  onCancel = onCancel || DEFAULT_CALLBACK;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div
        style={{
          borderRadius: "6px",
          overflow: "hidden",
        }}
      >
        <CodeMirror
          basicSetup
          extensions={[cwHighlighter]}
          height="500px"
          onChange={onChange}
          readOnly={readOnly}
          theme={aura}
          value={value}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "1rem",
        }}
      >
        <Button label="Cancel" onClick={() => onCancel()} />
        <Button
          label={saveButtonLabel ?? DEFAULT_SAVE_BUTTON_LABEL}
          onClick={() => onSave(value)}
        />
      </div>
    </div>
  );
};

export default ProgramEditor;
