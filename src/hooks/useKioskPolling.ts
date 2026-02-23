"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface KioskData {
  id: string;
  name: string;
  avatarEmoji: string;
  saldoCents: number;
  currency: string;
  recentTransactions: {
    id: string;
    amountCents: number;
    type: string;
    description: string | null;
    createdAt: string;
  }[];
  savingGoals: {
    id: string;
    title: string;
    targetCents: number;
  }[];
  openChores: {
    assignmentId: string;
    title: string;
    rewardCents: number;
  }[];
  investments: {
    id: string;
    type: string;
    status: string;
    principalCents: number;
    currentBalanceCents: number;
    interestRateBps: number;
    termMonths: number | null;
    maturityDate: string | null;
    withdrawalStatus: string | null;
  }[];
  kioskInvestmentsEnabled: boolean;
}

export function useKioskPolling(intervalMs = 10_000) {
  const [data, setData] = useState<KioskData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null!);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/kiosk/me");
      if (res.status === 401) {
        setError("unauthorized");
        return;
      }
      if (!res.ok) {
        setError("fetch-error");
        return;
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError("network-error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(fetchData, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [fetchData, intervalMs]);

  const refetch = useCallback(() => fetchData(), [fetchData]);

  return { data, error, loading, refetch };
}
