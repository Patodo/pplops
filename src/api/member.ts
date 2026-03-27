import { invoke } from "@tauri-apps/api/core";

export async function pingMember(): Promise<string> {
  return invoke<string>("member_ping");
}

export async function memberCount(): Promise<number> {
  return invoke<number>("member_count");
}
