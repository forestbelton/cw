import { CSSProperties, useEffect, useRef } from "react";
import { VM } from "../language/vm/vm";
import { Opcode } from "../language/insn";

type MemoryViewProps = {
  vm: VM;
  // Used to force re-rendering
  cycle: number;
};

const theme = {
  bg: "#222",
};

const MemoryView = ({ vm, cycle }: MemoryViewProps) => {
  const canvasRef = useRef(null as HTMLCanvasElement | null);
  const containerRef = useRef(null as HTMLDivElement | null);

  useEffect(() => {
    const container = containerRef.current!;
    const canvas = canvasRef.current!;

    canvas.width = container.clientWidth;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;

    const params = getParams({
      coreSize: vm.options.coreSize,
      canvasWidth: canvas.width,
    });

    canvas.height = params.canvasHeight;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < vm.options.coreSize; i++) {
      const gridX = i % params.cellsPerRow;
      const gridY = iDiv(i, params.cellsPerRow);

      const x =
        params.horizontalPadding +
        gridX * (params.cellSize + params.cellPadding);

      const y =
        params.verticalPadding + gridY * (params.cellSize + params.cellPadding);

      const subcellSize = params.cellSize / 2;

      const insn = vm.core.instructions[i];

      // NOTE: all of this is very temporary and not more than a PoC until we know
      // who modified which instruction.

      // Operation type
      switch (insn.opcode) {
        case Opcode.DAT:
          if (insn.a.value === 0 && insn.b.value === 0) {
            ctx.fillStyle = theme.bg;
          } else {
            ctx.fillStyle = "red";
          }
          break;
        default:
          ctx.fillStyle = "green";
      }
      ctx.fillRect(x, y, subcellSize, subcellSize);

      // All of this is very temporary
      // A
      switch (insn.a.value) {
        case 0:
          ctx.fillStyle = theme.bg;
          break;
        default:
          ctx.fillStyle = "green";
      }
      ctx.fillRect(x + subcellSize, y, subcellSize, subcellSize);

      // B
      switch (insn.b.value) {
        case 0:
          ctx.fillStyle = theme.bg;
          break;
        default:
          ctx.fillStyle = "green";
      }
      ctx.fillRect(x, y + subcellSize, subcellSize, subcellSize);
    }
  }, [vm, cycle]);

  const style: CSSProperties = {};

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <canvas ref={canvasRef} style={style} />
    </div>
  );
};

const iDiv = (a: number, b: number) => Math.floor(a / b);

const getParams = (constraints: { coreSize: number; canvasWidth: number }) => {
  console.log({ constraints });
  const cellSize = 4;
  const cellPadding = 4;

  const cellsPerRow = iDiv(
    constraints.canvasWidth - cellPadding,
    cellSize + cellPadding
  );
  // I wanted to have each row have the same number of cells but then the display ends up very tall.
  //
  // while (constraints.coreSize % cellsPerRow !== 0) {
  //   cellsPerRow--;
  // }

  console.log({ constraints });

  const horizontalOccupied =
    cellsPerRow * (cellSize + cellPadding) - cellPadding;
  const horizontalPadding = iDiv(
    constraints.canvasWidth - horizontalOccupied,
    2
  );
  const verticalPadding = 10;
  const rows = constraints.coreSize / cellsPerRow;
  const canvasHeight =
    rows * (cellSize + cellPadding) - cellPadding + verticalPadding * 2;

  return {
    horizontalPadding,
    verticalPadding,
    cellPadding,
    cellSize,
    canvasHeight,
    cellsPerRow,
  };
};

export default MemoryView;
