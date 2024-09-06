import { CSSProperties, MouseEvent, useCallback, useState } from "react";

type ButtonProps = {
  label?: string;
  onClick?: () => void;
};

const Button = ({ label, onClick }: ButtonProps) => {
  const [hovering, setHovering] = useState(false);
  const [clicked, setClicked] = useState(false);

  const onButtonClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (typeof onClick !== "undefined") {
        onClick();
      }
    },
    [onClick]
  );

  let filter: CSSProperties["filter"] = "none";
  if (clicked) {
    filter = "brightness(0.8)";
  } else if (hovering) {
    filter = "brightness(1.3)";
  }

  const style: CSSProperties = {
    background: "#a394f033",
    border: "0",
    borderRadius: "2px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "bold",
    minWidth: "8rem",
    outline: "none",
    padding: "0.5rem 1rem",
    filter,
  };

  return (
    <button
      onClick={onButtonClick}
      onMouseDown={() => setClicked(true)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onMouseUp={() => setClicked(false)}
      style={style}
    >
      {label}
    </button>
  );
};

export default Button;
