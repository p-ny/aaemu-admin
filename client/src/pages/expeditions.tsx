import { useSelectedServer, useExpeditions } from "@/hooks/use-aaemu";
import { Shield, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ExpeditionsPage() {
  const { serverId } = useSelectedServer();
  const { data: expeditions, isLoading } = useExpeditions(serverId);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-display text-white">Expeditions</h2>
        <p className="text-muted-foreground mt-1">Guild management and expedition overview.</p>
      </div>

      <Card className="bg-card/40 backdrop-blur-sm border-white/5 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-bold font-display text-lg text-white">All Expeditions</h3>
          {expeditions && (
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 ml-2">
              {expeditions.length} total
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full bg-white/5" />
            ))}
          </div>
        ) : !expeditions || expeditions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground font-mono text-sm">
            No expeditions found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-muted-foreground font-mono uppercase text-xs">ID</TableHead>
                <TableHead className="text-muted-foreground font-mono uppercase text-xs">Name</TableHead>
                <TableHead className="text-muted-foreground font-mono uppercase text-xs">Owner</TableHead>
                <TableHead className="text-muted-foreground font-mono uppercase text-xs">Members</TableHead>
                <TableHead className="text-muted-foreground font-mono uppercase text-xs">Online</TableHead>
                <TableHead className="text-muted-foreground font-mono uppercase text-xs">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expeditions.map((exp: any, idx: number) => (
                <TableRow key={exp.Id ?? exp.id ?? idx} className="border-white/5 hover:bg-white/5">
                  <TableCell className="font-mono text-white/70">{exp.Id ?? exp.id}</TableCell>
                  <TableCell className="font-medium text-white">{exp.Name ?? exp.name}</TableCell>
                  <TableCell className="text-white/70">{exp.Owner ?? exp.owner ?? exp.OwnerName ?? "—"}</TableCell>
                  <TableCell className="font-mono">
                    <Badge variant="outline" className="border-white/10 text-white bg-white/5">
                      {exp.MemberCount ?? exp.memberCount ?? exp.Members ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    <Badge variant="outline" className="border-green-400/30 text-green-400 bg-green-400/10">
                      {exp.OnlineMembers ?? exp.onlineMembers ?? exp.Online ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-white/50 text-sm">
                    {exp.CreatedAt ?? exp.created_at ?? exp.Created ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
