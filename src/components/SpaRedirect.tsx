// src/components/SpaRedirect.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function SpaRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('p');
    if (p) {
      // router respects basePath automatically
      router.replace(p);
    }
  }, [router]);

  return null;
}