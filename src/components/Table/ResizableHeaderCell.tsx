import { useEffect, useState } from "react";

export function ResizableHeaderCell(
  props: React.ThHTMLAttributes<HTMLTableCellElement> & {
    onResizeStop?: (width: number) => void;
    width?: number;
  },
) {
  const { onResizeStop, width, ...restProps } = props;
  const [innerWidth, setInnerWidth] = useState<number | undefined>(width);
  const [dragDelta, setDragDelta] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setInnerWidth(width);
  }, [width]);

  if (!innerWidth || !onResizeStop) {
    return <th {...restProps} />;
  }

  const handleMouseDown: React.MouseEventHandler<HTMLSpanElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = innerWidth;
    let latestWidth = startWidth;
    setDragging(true);
    setDragDelta(0);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const nextWidth = Math.max(80, Math.floor(startWidth + deltaX));
      latestWidth = nextWidth;
      setDragDelta(nextWidth - startWidth);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setDragging(false);
      setDragDelta(0);
      onResizeStop(latestWidth);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <th
      {...restProps}
      style={{
        ...restProps.style,
        width: innerWidth,
        minWidth: innerWidth,
        maxWidth: innerWidth,
      }}
      className={[restProps.className, "resizable-header-cell"].filter(Boolean).join(" ")}
    >
      {restProps.children}
      {dragging && (
        <span className="resizable-ghost-line" style={{ transform: `translateX(${dragDelta}px)` }} />
      )}
      <span
        className="resizable-handle"
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      />
    </th>
  );
}
