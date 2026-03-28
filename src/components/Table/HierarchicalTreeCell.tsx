import { Tooltip } from "antd";
import type { ReactNode } from "react";
import "./table.css";

export type HierarchicalTreeCellProps = {
  rowKey: string;
  depth: number;
  ancestorsHasNext: boolean[];
  isLastSibling: boolean;
  /** 数据上是否具备子级（与是否展示「可展开」方块无关） */
  expandable: boolean;
  /** 为 false 时始终使用圆点，不显示可展开方块（静态树等） */
  showExpandableAffordance?: boolean;
  /** 用于 `pplops-tree-cell-${nodeVariant}` 与方块颜色修饰类 */
  nodeVariant: string;
  label: ReactNode;
  expandTooltipTitle?: string;
};

const DEFAULT_EXPAND_TOOLTIP = "双击行展开或收起下层";

export function HierarchicalTreeCell({
  rowKey,
  depth,
  ancestorsHasNext,
  isLastSibling,
  expandable,
  showExpandableAffordance = true,
  nodeVariant,
  label,
  expandTooltipTitle = DEFAULT_EXPAND_TOOLTIP,
}: HierarchicalTreeCellProps) {
  const showSquare = expandable && showExpandableAffordance;
  const svgUnits = ancestorsHasNext.length + (depth > 0 ? 1 : 0);

  return (
    <div
      className={`pplops-tree-cell pplops-tree-cell-${nodeVariant}`}
      style={{ paddingLeft: depth * 18 }}
    >
      <svg
        className="pplops-tree-svg"
        width={svgUnits * 14}
        height={34}
        viewBox={`0 0 ${svgUnits * 14} 34`}
        aria-hidden
      >
        {ancestorsHasNext.map((hasNext, idx) => {
          if (!hasNext) return null;
          if (depth > 0 && idx === ancestorsHasNext.length - 1) return null;
          const x = idx * 14 + 7;
          return (
            <line
              key={`v-${rowKey}-${idx}`}
              x1={x}
              y1={-8}
              x2={x}
              y2={42}
              stroke="rgba(15, 23, 42, 0.22)"
              strokeWidth={1.6}
              strokeLinecap="square"
            />
          );
        })}
        {depth > 0 && (
          <>
            <line
              x1={ancestorsHasNext.length * 14 + 7}
              y1={-8}
              x2={ancestorsHasNext.length * 14 + 7}
              y2={isLastSibling ? 17 : 42}
              stroke="rgba(15, 23, 42, 0.24)"
              strokeWidth={1.6}
              strokeLinecap="square"
            />
            <line
              x1={ancestorsHasNext.length * 14 + 7}
              y1={17}
              x2={ancestorsHasNext.length * 14 + 15}
              y2={17}
              stroke="rgba(15, 23, 42, 0.24)"
              strokeWidth={1.6}
              strokeLinecap="square"
            />
          </>
        )}
      </svg>
      <Tooltip title={showSquare ? expandTooltipTitle : undefined}>
        {showSquare ? (
          <span
            className={`pplops-tree-node-square pplops-tree-node-square--${nodeVariant}`}
            aria-hidden
          />
        ) : (
          <span className="pplops-tree-node-dot" aria-hidden />
        )}
      </Tooltip>
      <span className="pplops-tree-id">{label}</span>
    </div>
  );
}
