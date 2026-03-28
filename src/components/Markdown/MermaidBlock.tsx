import { useEffect, useState } from "react";
import mermaid from "mermaid";

export function MermaidBlock({ chart }: { chart: string }) {
  const [svg, setSvg] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let disposed = false;
    const run = async () => {
      try {
        mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });
        const id = `mmd-${Math.random().toString(36).slice(2)}`;
        const result = await mermaid.render(id, chart);
        if (!disposed) {
          setSvg(result.svg);
          setErrorText("");
        }
      } catch (error) {
        if (!disposed) {
          setErrorText(String(error));
          setSvg("");
        }
      }
    };
    void run();
    return () => {
      disposed = true;
    };
  }, [chart]);

  if (errorText) {
    return <pre>{errorText}</pre>;
  }
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
