import { useEffect, useState } from 'react';

import { listPlayableFigures } from '@/lib/figures';
import type { Figure } from '@/types/figure';

export type FiguresState = {
  figures: Figure[];
  loading: boolean;
  error: Error | null;
};

export function useFigures(): FiguresState {
  const [state, setState] = useState<FiguresState>({
    figures: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    listPlayableFigures()
      .then((figures) => {
        if (!cancelled) setState({ figures, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            figures: [],
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
