import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

export function useAuth() {
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();

  const { data: authStatus, isLoading } = useQuery({
    queryKey: ["/api/auth/check"],
    queryFn: async () => {
      const res = await fetch("/api/auth/check");
      if (!res.ok) return { authenticated: false, user: null };
      return await res.json() as { authenticated: boolean; user: any };
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      setLocation("/");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/check"], { authenticated: false, user: null });
      setLocation("/login");
    },
  });

  return {
    isAuthenticated: authStatus?.authenticated ?? false,
    user: authStatus?.user,
    isLoading,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    logout: logoutMutation.mutate,
  };
}
