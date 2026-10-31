'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

// 일정 간격으로 서버 상태를 다시 불러오는 훅 (실시간 반영)
export default function usePoll(fetcher, intervalMs = 2500, enabled = true) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const ref = useRef(fetcher);
  ref.current = fetcher;

  const refresh = useCallback(async () => {
    try {
      const d = await ref.current();
      setData(d);
      setError(null);
    } catch (e) {
      setError(e.message || '연결 오류');
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, intervalMs);
    return () => clearInterval(t);
  }, [enabled, intervalMs, refresh]);

  return { data, error, refresh };
}
