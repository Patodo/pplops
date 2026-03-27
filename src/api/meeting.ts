import { invoke } from "@tauri-apps/api/core";

export async function pingMeeting(): Promise<string> {
  return invoke<string>("meeting_ping");
}
