import { useQuery } from "@tanstack/react-query";

interface OAuthProviders {
  google: boolean;
  facebook: boolean;
  twitter: boolean;
  replit: boolean;
}

export function useOAuthProviders() {
  const { data: providers, isLoading } = useQuery<OAuthProviders>({
    queryKey: ["/api/auth/providers"],
    retry: false,
  });

  return {
    providers: providers || { google: false, facebook: false, twitter: false, replit: false },
    isLoading,
    hasAnyProvider: providers ? Object.values(providers).some(Boolean) : false,
  };
}