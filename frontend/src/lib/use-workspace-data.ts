"use client";

import { useEffect, useState } from "react";

export function useWorkspaceData<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [result, setResult] = useState<{ version: number; data?: T; error?: string }>();

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ version: refreshVersion, data });
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setResult({ version: refreshVersion, error: error.message });
      });
    return () => controller.abort();
  }, [load, refreshVersion]);

  const loading = result?.version !== refreshVersion;
  return {
    data: result?.data,
    error: loading ? undefined : result?.error,
    loading,
    refreshVersion,
    refresh: () => setRefreshVersion((version) => version + 1),
  };
}
