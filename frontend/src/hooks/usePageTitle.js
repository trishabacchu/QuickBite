import { useEffect } from 'react';

const BASE_TITLE = 'QuickBite · Food, delivered';

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · QuickBite` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [title]);
}
