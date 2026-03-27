import { invoke } from "@tauri-apps/api/core";

export async function pingWorkload(): Promise<string> {
  return invoke<string>("workload_ping");
}
