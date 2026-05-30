'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSX, useState } from 'react';

export function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
