import { invoke } from "@tauri-apps/api/core";

export async function pingTask(): Promise<string> {
  return invoke<string>("task_ping");
}
