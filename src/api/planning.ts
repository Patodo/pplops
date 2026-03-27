import { invoke } from "@tauri-apps/api/core";

export async function pingPlanning(): Promise<string> {
  return invoke<string>("planning_ping");
}
