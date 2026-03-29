import { useLayoutEffect, useRef, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "highlight.js/styles/github-dark.css";
import { DETAIL_MODAL_MD_EDITOR_AREA_HEIGHT } from "./constants";

type MarkdownEditorAreaProps = {
  value: string;
  onChange: (next: string) => void;
  /** 为 true 时挂载 ResizeObserver（编辑态且弹窗打开） */
  active: boolean;
  /** 实体切换时重新测量（如成员 id、工作项 id） */
  layoutKey?: string | number | null;
};

export function MarkdownEditorArea({
  value,
  onChange,
  active,
  layoutKey,
}: MarkdownEditorAreaProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [heightPx, setHeightPx] = useState(400);

  useLayoutEffect(() => {
    if (!active) return;
    const el = hostRef.current;
    if (!el) return;
    const apply = () => {
      const h = el.getBoundingClientRect().height;
      setHeightPx(Math.max(240, Math.floor(h)));
    };
    apply();
    const ro = new ResizeObserver(() => apply());
    ro.observe(el);
    return () => ro.disconnect();
  }, [active, layoutKey]);

  return (
    <div
      ref={hostRef}
      style={{
        width: "100%",
        height: DETAIL_MODAL_MD_EDITOR_AREA_HEIGHT,
        minHeight: 240,
      }}
    >
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        height={heightPx}
        preview="edit"
      />
    </div>
  );
}
