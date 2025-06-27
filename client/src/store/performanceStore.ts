import { create } from 'zustand';

// Advanced performance state management for ultra-fast loading
interface PerformanceState {
  // Cached data with timestamps
  userStats: {
    data: {
      activeProjects: number;
      completedProjects: number;
      totalSpent: number;
      newMessages: number;
    } | null;
    lastFetch: number;
    isLoading: boolean;
  };
  
  userProjects: {
    data: any[] | null;
    lastFetch: number;
    isLoading: boolean;
  };
  
  userOrders: {
    data: any[] | null;
    lastFetch: number;
    isLoading: boolean;
  };

  // Performance metrics
  metrics: {
    lastLoadTime: number;
    averageLoadTime: number;
    cacheHitRate: number;
    apiCalls: number;
    cacheHits: number;
  };

  // Actions
  setUserStats: (stats: any) => void;
  setUserProjects: (projects: any[]) => void;
  setUserOrders: (orders: any[]) => void;
  setLoading: (key: 'userStats' | 'userProjects' | 'userOrders', loading: boolean) => void;
  updateMetrics: (loadTime: number, fromCache: boolean) => void;
  invalidateCache: (keys?: string[]) => void;
  isDataFresh: (key: 'userStats' | 'userProjects' | 'userOrders', maxAge?: number) => boolean;
}

const CACHE_DURATION = 30000; // 30 seconds

export const usePerformanceStore = create<PerformanceState>()((set, get) => ({
  userStats: {
    data: null,
    lastFetch: 0,
    isLoading: false,
  },
  
  userProjects: {
    data: null,
    lastFetch: 0,
    isLoading: false,
  },
  
  userOrders: {
    data: null,
    lastFetch: 0,
    isLoading: false,
  },

  metrics: {
    lastLoadTime: 0,
    averageLoadTime: 0,
    cacheHitRate: 0,
    apiCalls: 0,
    cacheHits: 0,
  },

  setUserStats: (stats) => set((state) => ({
    userStats: {
      ...state.userStats,
      data: stats,
      lastFetch: Date.now(),
      isLoading: false,
    }
  })),

  setUserProjects: (projects) => set((state) => ({
    userProjects: {
      ...state.userProjects,
      data: projects,
      lastFetch: Date.now(),
      isLoading: false,
    }
  })),

  setUserOrders: (orders) => set((state) => ({
    userOrders: {
      ...state.userOrders,
      data: orders,
      lastFetch: Date.now(),
      isLoading: false,
    }
  })),

  setLoading: (key, loading) => set((state) => ({
    [key]: {
      ...state[key],
      isLoading: loading,
    }
  })),

  updateMetrics: (loadTime, fromCache) => set((state) => {
    const newApiCalls = state.metrics.apiCalls + 1;
    const newCacheHits = fromCache ? state.metrics.cacheHits + 1 : state.metrics.cacheHits;
    
    return {
      metrics: {
        lastLoadTime: loadTime,
        apiCalls: newApiCalls,
        cacheHits: newCacheHits,
        averageLoadTime: (state.metrics.averageLoadTime * state.metrics.apiCalls + loadTime) / newApiCalls,
        cacheHitRate: (newCacheHits / newApiCalls) * 100,
      }
    };
  }),

  invalidateCache: (keys) => set((state) => {
    const keysToInvalidate = keys || ['userStats', 'userProjects', 'userOrders'];
    const updates: any = {};
    
    keysToInvalidate.forEach((key) => {
      if (key in state) {
        updates[key] = {
          ...state[key as keyof PerformanceState],
          lastFetch: 0,
          data: null,
        };
      }
    });
    
    return updates;
  }),

  isDataFresh: (key, maxAge = CACHE_DURATION) => {
    const data = get()[key];
    return data.data !== null && (Date.now() - data.lastFetch) < maxAge;
  },
}));

// Performance hooks for components
export const useOptimizedStats = () => {
  const store = usePerformanceStore();
  return {
    stats: store.userStats.data,
    isLoading: store.userStats.isLoading,
    isFresh: store.isDataFresh('userStats'),
    setStats: store.setUserStats,
    setLoading: (loading: boolean) => store.setLoading('userStats', loading),
  };
};

export const useOptimizedProjects = () => {
  const store = usePerformanceStore();
  return {
    projects: store.userProjects.data,
    isLoading: store.userProjects.isLoading,
    isFresh: store.isDataFresh('userProjects'),
    setProjects: store.setUserProjects,
    setLoading: (loading: boolean) => store.setLoading('userProjects', loading),
  };
};

export const useOptimizedOrders = () => {
  const store = usePerformanceStore();
  return {
    orders: store.userOrders.data,
    isLoading: store.userOrders.isLoading,
    isFresh: store.isDataFresh('userOrders'),
    setOrders: store.setUserOrders,
    setLoading: (loading: boolean) => store.setLoading('userOrders', loading),
  };
};

export const usePerformanceMetrics = () => {
  const store = usePerformanceStore();
  return {
    metrics: store.metrics,
    updateMetrics: store.updateMetrics,
  };
};