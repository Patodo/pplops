import { invoke } from "@tauri-apps/api/core";

export async function pingReport(): Promise<string> {
  return invoke<string>("report_ping");
}
