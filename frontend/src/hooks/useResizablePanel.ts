import { useCallback, useRef } from "react";

interface ResizablePanelOptions {
  direction: "vertical" | "horizontal";
  minSize: number;
  maxSize: number;
  initialSize: number;
  onResize: (size: number) => void;
}

/**
 * Generic drag-to-resize hook for panels.
 * Returns a ref to attach to the resize handle element.
 */
export function useResizablePanel(options: ResizablePanelOptions) {
  const { direction, minSize, maxSize, onResize } = options;
  const isDragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(options.initialSize);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      startPos.current = direction === "vertical" ? e.clientY : e.clientX;
      startSize.current = options.initialSize;
      document.body.style.cursor =
        direction === "vertical" ? "ns-resize" : "col-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    },
    [direction]
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta =
        direction === "vertical"
          ? startPos.current - e.clientY
          : startPos.current - e.clientX;
      const newSize = Math.max(
        minSize,
        Math.min(maxSize, startSize.current + delta)
      );
      onResize(newSize);
    },
    [direction, minSize, maxSize, onResize]
  );

  const onMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  // These event listeners are attached via useEffect since they're document-level
  const attachListeners = useCallback(() => {
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [onMouseMove, onMouseUp]);

  const detachListeners = useCallback(() => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }, [onMouseMove, onMouseUp]);

  return {
    handleProps: {
      onMouseDown: (e: React.MouseEvent) => {
        onMouseDown(e);
        attachListeners();
        // Clean up listeners on the next mouseup
        const cleanup = () => {
          detachListeners();
          document.removeEventListener("mouseup", cleanup);
        };
        document.addEventListener("mouseup", cleanup, { once: true });
      },
    },
  };
}
