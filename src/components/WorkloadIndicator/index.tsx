type LoadState = "full" | "under" | "over";

const colors: Record<LoadState, string> = {
  full: "green",
  under: "gold",
  over: "red",
};

export function WorkloadIndicator({ state }: { state: LoadState }) {
  return (
    <span
      className="inline-block w-3 h-3 rounded-full"
      style={{ backgroundColor: colors[state] }}
      title={state}
    />
  );
}
