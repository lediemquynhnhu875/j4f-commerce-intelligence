"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api-client";
import type { Account } from "@/types/api";

export function useLiveSession() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const version = useRef(0);
  const readSession = useCallback(() => api<{ data: Account }>("auth/me"), []);
  const accept = useCallback((result: { data: Account }) => { setAccount(result.data); setError(""); }, []);
  const reject = useCallback((err: unknown) => { setAccount(null); setError(err instanceof ApiError && err.status === 401 ? "" : (err as Error).message); }, []);
  const refresh = useCallback(async () => {
    const current = ++version.current;
    setLoading(true); setError("");
    try { const result = await readSession(); if (current === version.current) accept(result); }
    catch (err) { if (current === version.current) reject(err); }
    finally { if (current === version.current) setLoading(false); }
  }, [readSession, accept, reject]);
  useEffect(() => {
    let active = true;
    const current = ++version.current;
    void readSession().then(result => { if (active && current === version.current) accept(result); }).catch(err => { if (active && current === version.current) reject(err); }).finally(() => { if (active && current === version.current) setLoading(false); });
    window.addEventListener("sellens-session-expired", refresh);
    window.addEventListener("sellens-session-changed", refresh);
    return () => { active = false; window.removeEventListener("sellens-session-expired", refresh); window.removeEventListener("sellens-session-changed", refresh); };
  }, [readSession, accept, reject, refresh]);
  return { account, loading, error, refresh };
}
