import { invoke } from "@tauri-apps/api/core";
import type { AppInfo, AppSettings } from "@/types/common";

export async function getAppInfo(): Promise<AppInfo> {
  return invoke<AppInfo>("get_app_info");
}

export async function getAppSettings(): Promise<AppSettings> {
  return invoke<AppSettings>("get_app_settings");
}

export async function setAppSettings(payload: { memoryCacheMode: boolean }): Promise<AppSettings> {
  return invoke<AppSettings>("set_app_settings", { payload });
}

export async function refreshDataCache(): Promise<void> {
  return invoke<void>("refresh_data_cache");
}
