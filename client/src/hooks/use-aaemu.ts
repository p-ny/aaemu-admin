import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Server } from "@shared/schema";
import { useState, useEffect } from "react";

export function useServers() {
  return useQuery({
    queryKey: ["/api/servers"],
    queryFn: async () => {
      const res = await fetch("/api/servers");
      if (!res.ok) throw new Error("Failed to fetch servers");
      return await res.json() as Server[];
    },
  });
}

export function useAddServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add server");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
    },
  });
}

export function useUpdateServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/servers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update server");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
    },
  });
}

export function useDeleteServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/servers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete server");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
    },
  });
}

export function useSelectedServer() {
  const { data: servers } = useServers();
  const [serverId, setServerId] = useState<number | null>(() => {
    const saved = localStorage.getItem("selectedServerId");
    return saved ? parseInt(saved) : null;
  });

  useEffect(() => {
    if (serverId) {
      localStorage.setItem("selectedServerId", serverId.toString());
    } else {
      localStorage.removeItem("selectedServerId");
    }
  }, [serverId]);

  useEffect(() => {
    if (!servers || servers.length === 0) return;
    const ids = servers.map((s) => s.id);
    if (serverId && ids.includes(serverId)) return;
    setServerId(ids[0]);
  }, [servers, serverId]);

  return { serverId, setServerId };
}

export function useServerStatus(serverId: number | null) {
  return useQuery({
    queryKey: ["/api/aaemu/status", serverId],
    queryFn: async () => {
      if (!serverId) return null;
      const res = await fetch(`/api/aaemu/status/${serverId}`);
      if (!res.ok) throw new Error("Failed to fetch server status");
      return await res.json();
    },
    enabled: !!serverId,
    refetchInterval: 10000,
  });
}

export function useLoggedCharacters(serverId: number | null) {
  return useQuery({
    queryKey: ["/api/aaemu/characters", serverId],
    queryFn: async () => {
      if (!serverId) return [];
      const res = await fetch(`/api/aaemu/characters/${serverId}`);
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!serverId,
    refetchInterval: 15000,
  });
}

export function useCharacterList(serverId: number | null, params?: { Name?: string; AccountId?: string }) {
  const qs = params ? "?" + Object.entries(params).filter(([_, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&") : "";
  return useQuery({
    queryKey: ["/api/aaemu/character-list", serverId, params],
    queryFn: async () => {
      if (!serverId) return [];
      const res = await fetch(`/api/aaemu/character-list/${serverId}${qs}`);
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!serverId,
  });
}

export function useCommand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { command: string; serverId: number; character?: string }) => {
      const res = await fetch("/api/aaemu/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Command failed");
      }
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/history", variables.serverId] });
    },
  });
}

export function useCommandHistory(serverId: number | null) {
  return useQuery({
    queryKey: ["/api/history", serverId],
    queryFn: async () => {
      if (!serverId) return [];
      const res = await fetch(`/api/history/${serverId}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return await res.json();
    },
    enabled: !!serverId,
  });
}

export function useExpeditions(serverId: number | null) {
  return useQuery({
    queryKey: ["/api/aaemu/expeditions", serverId],
    queryFn: async () => {
      if (!serverId) return [];
      const res = await fetch(`/api/aaemu/expeditions/${serverId}`);
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!serverId,
  });
}

export function useAuctionList(serverId: number | null) {
  return useQuery({
    queryKey: ["/api/aaemu/auction/list", serverId],
    queryFn: async () => {
      if (!serverId) return { items: [] };
      const res = await fetch(`/api/aaemu/auction/list/${serverId}`);
      if (!res.ok) return { items: [] };
      return await res.json();
    },
    enabled: !!serverId,
  });
}

export function useTestServer() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/servers/${id}/test`);
      return await res.json();
    },
  });
}

export function useTestMysql() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/servers/${id}/test-mysql`);
      return await res.json();
    },
  });
}
