import { useCommandHistory, useSelectedServer } from "@/hooks/use-aaemu";
import { format } from "date-fns";
import { History as HistoryIcon, CheckCircle2, XCircle, Search, Terminal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { type CommandHistory } from "@shared/schema";

export default function HistoryPage() {
  const { serverId } = useSelectedServer();
  const { data: history, isLoading } = useCommandHistory(serverId);
  const [search, setSearch] = useState("");

  const filteredHistory = (history as CommandHistory[])?.filter((item: CommandHistory) => 
    item.command.toLowerCase().includes(search.toLowerCase()) || 
    item.response?.toLowerCase().includes(search.toLowerCase())
  ).reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-display text-white">Command Audit</h2>
          <p className="text-muted-foreground mt-1">Log of all executed administrative actions.</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search logs..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/50 border-white/10 focus:border-primary/50"
          />
        </div>
      </div>

      <Card className="bg-card/40 backdrop-blur-sm border-white/5 shadow-xl overflow-hidden">
        <div className="rounded-md border border-white/5">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="w-[200px] text-muted-foreground font-mono uppercase text-xs tracking-wider">Timestamp</TableHead>
                <TableHead className="text-muted-foreground font-mono uppercase text-xs tracking-wider">Command</TableHead>
                <TableHead className="w-[100px] text-muted-foreground font-mono uppercase text-xs tracking-wider">Status</TableHead>
                <TableHead className="w-[300px] text-muted-foreground font-mono uppercase text-xs tracking-wider">Output Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-white/5">
                    <TableCell><div className="h-4 w-32 bg-white/5 rounded animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 w-48 bg-white/5 rounded animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 w-16 bg-white/5 rounded animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 w-full bg-white/5 rounded animate-pulse" /></TableCell>
                  </TableRow>
                ))
              ) : filteredHistory?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    No command history found for this server.
                  </TableCell>
                </TableRow>
              ) : (
                filteredHistory?.map((entry: CommandHistory) => (
                  <TableRow key={entry.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                    <TableCell className="font-mono text-muted-foreground text-xs">
                      {entry.timestamp ? format(new Date(entry.timestamp), 'MMM dd HH:mm:ss') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-mono text-sm text-primary">
                        <Terminal className="w-3 h-3 opacity-50" />
                        {entry.command}
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.status === 'error' ? (
                        <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-400 gap-1">
                          <XCircle className="w-3 h-3" /> Failed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-400 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Success
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="truncate text-xs text-muted-foreground font-mono">
                        {entry.response || "No output"}
                      </p>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
