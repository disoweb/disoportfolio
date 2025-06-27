import { QueryClient } from "@tanstack/react-query";

// Ultra-fast query client for instant loading
export const optimizedQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds - aggressive caching
      gcTime: 300000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1, // Minimal retries for speed
      networkMode: "always"
    },
    mutations: {
      networkMode: "always"
    }
  }
});

// Enhanced API request function with optimized error handling
export async function optimizedApiRequest(
  method: string,
  url: string,
  data?: any
): Promise<any> {
  const token = localStorage.getItem('auth_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status}: ${response.statusText} - ${errorText}`);
    }

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}