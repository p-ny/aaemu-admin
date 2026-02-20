import { useServerStatus, useSelectedServer } from "@/hooks/use-aaemu";
import { useQuery } from "@tanstack/react-query";
import { Activity, Users, Clock, Cpu, Terminal, Server, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function StatusCard({ 
  label, 
  value, 
  icon: Icon, 
  status = "neutral",
  subtext
}: { 
  label: string; 
  value: string | number | undefined; 
  icon: any; 
  status?: "success" | "warning" | "error" | "neutral" | "primary";
  subtext?: string;
}) {
  const statusColors = {
    success: "text-green-400 bg-green-400/10 border-green-400/20",
    warning: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    error: "text-red-400 bg-red-400/10 border-red-400/20",
    neutral: "text-muted-foreground bg-white/5 border-white/5",
    primary: "text-primary bg-primary/10 border-primary/20",
  };

  return (
    <Card className="bg-card/40 backdrop-blur-sm border-white/5 p-6 hover:border-white/10 transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1 font-mono">
            {label}
          </p>
          <h3 className="text-2xl font-bold font-display text-white tracking-wide">
            {value ?? <Skeleton className="h-8 w-24 bg-white/10 inline-block" />}
          </h3>
          {subtext && (
            <p className="text-xs text-white/40 mt-1 font-mono">{subtext}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl border", statusColors[status])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}

function MiniBarChart({ data, maxHeight = 120 }: { data: number[]; maxHeight?: number }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const barWidth = Math.max(2, Math.min(12, Math.floor(300 / data.length) - 1));
  
  return (
    <div className="flex items-end gap-[2px] h-full justify-end">
      {data.map((val, i) => {
        const height = Math.max(2, (val / max) * maxHeight);
        const isLast = i === data.length - 1;
        return (
          <div
            key={i}
            className={cn(
              "rounded-t-sm transition-all",
              isLast ? "bg-primary" : "bg-primary/40"
            )}
            style={{ width: barWidth, height }}
            title={`${val} players`}
          />
        );
      })}
    </div>
  );
}

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

export default function DashboardPage() {
  const { serverId } = useSelectedServer();
  const { data: status, isLoading } = useServerStatus(serverId);

  const { data: activity } = useQuery({
    queryKey: ["/api/activity"],
    queryFn: async () => {
      const res = await fetch("/api/activity");
      if (!res.ok) return [];
      return await res.json();
    },
    refetchInterval: 30000,
  });

  const { data: snapshots } = useQuery({
    queryKey: ["/api/stats/players", serverId],
    queryFn: async () => {
      if (!serverId) return [];
      const res = await fetch(`/api/stats/players/${serverId}?hours=24`);
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!serverId,
    refetchInterval: 60000,
  });

  const playerCounts: number[] = (snapshots || []).map((s: any) => s.playerCount ?? s.player_count ?? 0);
  const peakPlayers = playerCounts.length > 0 ? Math.max(...playerCounts) : 0;
  const avgPlayers = playerCounts.length > 0 ? Math.round(playerCounts.reduce((a: number, b: number) => a + b, 0) / playerCounts.length) : 0;

  const taskCount = status?.raw?.match(/TaskManager Jobs:\s*(\d+)/i)?.[1] ?? "—";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-display text-white">Dashboard</h2>
          <p className="text-muted-foreground mt-1">Real-time server metrics and status.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
          <div className={cn("w-2 h-2 rounded-full animate-pulse", status?.online ? "bg-green-500" : "bg-red-500")} />
          <span className="text-xs font-mono font-medium text-muted-foreground uppercase">
            {isLoading ? "CONNECTING..." : status?.online ? "SYSTEM OPERATIONAL" : "SYSTEM OFFLINE"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard 
          label="Server Status" 
          value={status?.online ? "Online" : "Offline"} 
          icon={Activity} 
          status={status?.online ? "success" : "error"}
          subtext="World Server"
        />
        <StatusCard 
          label="Active Players" 
          value={status?.players ?? 0} 
          icon={Users} 
          status="primary"
          subtext="Current Session"
        />
        <StatusCard 
          label="Uptime" 
          value={status?.uptime ?? "—"} 
          icon={Clock} 
          status="neutral"
          subtext="Since last restart"
        />
        <StatusCard 
          label="Tasks" 
          value={taskCount} 
          icon={Cpu} 
          status="neutral"
          subtext="TaskManager Jobs"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card/40 backdrop-blur-sm border-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold font-display text-lg flex items-center gap-2">
              <Terminal className="w-5 h-5 text-primary" />
              Activity Feed
            </h3>
            <span className="text-xs font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded">
              {(activity || []).length} recent
            </span>
          </div>
          <div className="space-y-1 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
            {(!activity || activity.length === 0) ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground border border-dashed border-white/5 rounded-xl bg-black/20">
                <div className="text-center">
                  <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="font-mono text-sm">No recent activity</p>
                  <p className="text-xs opacity-60 mt-1">Commands and actions will appear here</p>
                </div>
              </div>
            ) : (
              activity.map((item: any) => (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
                  <div className={cn(
                    "mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                    item.status === "success" ? "bg-green-400/10 border-green-400/20 text-green-400" :
                    item.status === "error" ? "bg-red-400/10 border-red-400/20 text-red-400" :
                    "bg-primary/10 border-primary/20 text-primary"
                  )}>
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-white font-mono truncate">{item.command}</code>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] shrink-0 border",
                          item.status === "success" ? "text-green-400 border-green-400/30" :
                          item.status === "error" ? "text-red-400 border-red-400/30" :
                          "text-muted-foreground border-white/10"
                        )}
                      >
                        {item.status || "sent"}
                      </Badge>
                    </div>
                    {item.response && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono truncate opacity-60">
                        {typeof item.response === 'string' ? item.response.substring(0, 100) : ''}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-white/30 shrink-0 mt-1">
                    {item.timestamp ? formatTimeAgo(item.timestamp) : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="bg-card/40 backdrop-blur-sm border-white/5 p-6">
          <h3 className="font-bold font-display text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-secondary" />
            Player History
          </h3>
          <p className="text-xs text-muted-foreground font-mono mb-4">Last 24 hours</p>
          
          <div className="h-[140px] flex items-end">
            {playerCounts.length > 0 ? (
              <MiniBarChart data={playerCounts} maxHeight={130} />
            ) : (
              <div className="w-full h-full flex items-center justify-center border border-dashed border-white/5 rounded-xl bg-black/20">
                <div className="text-center">
                  <TrendingUp className="w-6 h-6 mx-auto mb-2 opacity-40 text-muted-foreground" />
                  <p className="font-mono text-xs text-muted-foreground">Collecting data...</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground font-mono">Peak Players</span>
              <span className="text-sm font-bold text-white font-mono">{peakPlayers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground font-mono">Avg Players</span>
              <span className="text-sm font-bold text-white font-mono">{avgPlayers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground font-mono">Snapshots</span>
              <span className="text-sm font-bold text-white font-mono">{playerCounts.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground font-mono">Server Tasks</span>
              <span className="text-sm font-bold text-white font-mono">{taskCount}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
