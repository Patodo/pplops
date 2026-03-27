import { invoke } from "@tauri-apps/api/core";

export async function pingRequirement(): Promise<string> {
  return invoke<string>("requirement_ping");
}
