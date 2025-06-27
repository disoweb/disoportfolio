import { QueryClient } from '@tanstack/react-query';
import { usePerformanceStore } from '@/store/performanceStore';

// Enhanced API request function with performance tracking
export async function apiRequest(method: string, url: string, data?: any): Promise<any> {
  const startTime = performance.now();
  const store = usePerformanceStore.getState();
  
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      credentials: 'include',
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const loadTime = performance.now() - startTime;
    
    // Check if response came from cache
    const cacheHeader = response.headers.get('X-Cache');
    const fromCache = cacheHeader === 'HIT';
    
    // Update performance metrics
    store.updateMetrics(loadTime, fromCache);

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`${response.status}: ${errorData}`);
    }

    return await response.json();
  } catch (error) {
    const loadTime = performance.now() - startTime;
    store.updateMetrics(loadTime, false);
    throw error;
  }
}

// Optimized query client with aggressive caching
export const optimizedQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey, signal }) => {
        const [url] = queryKey as [string];
        
        const response = await fetch(url, {
          signal,
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`${response.status}: ${errorData}`);
        }

        return response.json();
      },
      staleTime: 30000, // Data is fresh for 30 seconds
      gcTime: 300000, // Keep in cache for 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on 401/403/404
        if (error.message.includes('401') || error.message.includes('403') || error.message.includes('404')) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Disable refetch on window focus for better performance
      refetchOnMount: 'always', // Always refetch on mount for fresh data
    },
    mutations: {
      mutationFn: async ({ url, method = 'POST', data }) => {
        return apiRequest(method, url, data);
      },
      retry: false, // Don't retry mutations
    },
  },
});

// Performance monitoring utilities
export const getQueryPerformance = () => {
  const store = usePerformanceStore.getState();
  return store.metrics;
};

export const invalidateUserCache = (userId?: string) => {
  const store = usePerformanceStore.getState();
  
  // Invalidate Zustand cache
  store.invalidateCache();
  
  // Invalidate React Query cache
  optimizedQueryClient.invalidateQueries({
    predicate: (query) => {
      const [url] = query.queryKey as [string];
      return url.includes('/api/client/') || url.includes('/api/orders') || url.includes('/api/projects');
    },
  });
};