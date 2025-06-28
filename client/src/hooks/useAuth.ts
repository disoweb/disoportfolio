import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

export function useAuth() {
  const { toast } = useToast();
  
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false, // Disable refetch on focus to reduce calls
    staleTime: 30000, // 30 seconds stale time to reduce calls
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            return null; // User not authenticated
          }
          throw new Error(`HTTP ${response.status}`);
        }
        
        const userData = await response.json();
        return userData || null;
      } catch (error) {
        return null;
      }
    },
  });



  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      // Immediately clear all authentication-related cache
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      queryClient.clear(); // Clear all cached data for fresh start
      toast({ title: "Logged out successfully" });
      // No automatic redirection - user stays on current page
    },
    onError: (error: any) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
  };
}
