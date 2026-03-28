import { useEffect, useState } from "react";
import type { CommonColumnConfig } from "./ColumnSettingsModal";

export type UsePersistedColumnLayoutArgs<K extends string> = {
  configStorageKey: string;
  widthStorageKey: string;
  defaultColumns: CommonColumnConfig<K>[];
  defaultWidths: Record<K, number>;
};

function loadColumnsFromStorage<K extends string>(
  key: string,
  fallback: CommonColumnConfig<K>[],
): CommonColumnConfig<K>[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as CommonColumnConfig<K>[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function loadColumnWidthsFromStorage<K extends string>(
  key: string,
  defaults: Record<K, number>,
): Record<K, number> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<Record<K, number>>;
    return Object.fromEntries(
      (Object.keys(defaults) as K[]).map((k) => [k, parsed[k] ?? defaults[k]]),
    ) as Record<K, number>;
  } catch {
    return { ...defaults };
  }
}

export function usePersistedColumnLayout<K extends string>({
  configStorageKey,
  widthStorageKey,
  defaultColumns,
  defaultWidths,
}: UsePersistedColumnLayoutArgs<K>) {
  const [columnConfigs, setColumnConfigs] = useState<CommonColumnConfig<K>[]>(() =>
    loadColumnsFromStorage(configStorageKey, defaultColumns),
  );
  const [columnWidths, setColumnWidths] = useState<Record<K, number>>(() =>
    loadColumnWidthsFromStorage(widthStorageKey, defaultWidths),
  );

  useEffect(() => {
    localStorage.setItem(configStorageKey, JSON.stringify(columnConfigs));
  }, [columnConfigs, configStorageKey]);

  useEffect(() => {
    localStorage.setItem(widthStorageKey, JSON.stringify(columnWidths));
  }, [columnWidths, widthStorageKey]);

  const resetColumns = () => setColumnConfigs(defaultColumns.map((c) => ({ ...c })));
  const resetWidths = () => setColumnWidths({ ...defaultWidths });

  return {
    columnConfigs,
    setColumnConfigs,
    columnWidths,
    setColumnWidths,
    resetColumns,
    resetWidths,
  };
}
