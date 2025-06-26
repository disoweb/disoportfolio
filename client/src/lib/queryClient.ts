import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log('🌐 API-REQUEST: Making request:', { method, url, data });
  
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log('🌐 API-REQUEST: Response status:', res.status, res.statusText);
  
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log('🌐 QUERY-FN: Making query request to:', queryKey[0]);
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    console.log('🌐 QUERY-FN: Response status:', res.status, 'for', queryKey[0]);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log('🌐 QUERY-FN: Returning null for 401');
      return null;
    }

    await throwIfResNotOk(res);
    const result = await res.json();
    console.log('🌐 QUERY-FN: Response data:', result, 'for', queryKey[0]);
    return result;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
