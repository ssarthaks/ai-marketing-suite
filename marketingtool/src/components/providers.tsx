"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // serve cached data for 5 minutes instead of refetching
            gcTime: 10 * 60 * 1000, // keep unused data in cache for 10 minutes
            refetchOnWindowFocus: false, // prevents redundant background fetching
            refetchOnMount: false, // prevents refetching on component remount when cached
            refetchOnReconnect: false,
            retry: 1, // fail fast on genuine errors
          },
        },
      })
  );

  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
