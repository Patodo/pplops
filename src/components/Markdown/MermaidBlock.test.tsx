import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import mermaid from "mermaid";
import { MermaidBlock } from "./MermaidBlock";

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

describe("MermaidBlock（用户可见渲染结果）", () => {
  beforeEach(() => {
    vi.mocked(mermaid.render).mockReset();
    vi.mocked(mermaid.initialize).mockClear();
  });

  it("渲染成功时向页面注入返回的 SVG", async () => {
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: "<svg data-testid=\"mermaid-svg\"><text>flow</text></svg>",
      diagramType: "flowchart",
      bindFunctions: () => {},
    });
    render(<MermaidBlock chart="graph TD;A-->B" />);
    await waitFor(() => {
      expect(screen.getByTestId("mermaid-svg")).toBeInTheDocument();
    });
    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ startOnLoad: false, securityLevel: "loose" }),
    );
  });

  it("渲染失败时展示可读错误信息而非静默失败", async () => {
    vi.mocked(mermaid.render).mockRejectedValue(new Error("parse error at line 2"));
    render(<MermaidBlock chart="invalid" />);
    await waitFor(() => {
      expect(screen.getByText(/parse error at line 2/)).toBeInTheDocument();
    });
  });
});
