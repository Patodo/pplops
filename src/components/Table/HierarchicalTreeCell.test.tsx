import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HierarchicalTreeCell } from "./HierarchicalTreeCell";

describe("HierarchicalTreeCell", () => {
  it("renders label text", () => {
    render(
      <HierarchicalTreeCell
        rowKey="r1"
        depth={0}
        ancestorsHasNext={[]}
        isLastSibling
        expandable={false}
        nodeVariant="task"
        label="ITEM-42"
      />,
    );
    expect(screen.getByText("ITEM-42")).toBeInTheDocument();
  });

  it("uses square affordance when expandable and showExpandableAffordance is true", () => {
    const { container } = render(
      <HierarchicalTreeCell
        rowKey="r2"
        depth={0}
        ancestorsHasNext={[]}
        isLastSibling
        expandable
        showExpandableAffordance
        nodeVariant="project"
        label="P-1"
      />,
    );
    expect(container.querySelector(".pplops-tree-node-square")).toBeInTheDocument();
    expect(container.querySelector(".pplops-tree-node-dot")).not.toBeInTheDocument();
  });

  it("uses dot when showExpandableAffordance is false even if expandable", () => {
    const { container } = render(
      <HierarchicalTreeCell
        rowKey="r3"
        depth={1}
        ancestorsHasNext={[true]}
        isLastSibling={false}
        expandable
        showExpandableAffordance={false}
        nodeVariant="requirement"
        label="R-1"
      />,
    );
    expect(container.querySelector(".pplops-tree-node-dot")).toBeInTheDocument();
    expect(container.querySelector(".pplops-tree-node-square")).not.toBeInTheDocument();
  });
});
