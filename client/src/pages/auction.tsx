import { useState } from "react";
import { useSelectedServer, useAuctionList } from "@/hooks/use-aaemu";
import { Gavel, Search, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

export default function AuctionPage() {
  const { serverId } = useSelectedServer();
  const { data, isLoading } = useAuctionList(serverId);

  const [itemId, setItemId] = useState("");
  const [clientName, setClientName] = useState("");
  const [stackSize, setStackSize] = useState("");
  const [directMoney, setDirectMoney] = useState("");
  const [bidMoney, setBidMoney] = useState("");
  const [bidderName, setBidderName] = useState("");

  const items = data?.items ?? data ?? [];

  const filtered = Array.isArray(items)
    ? items.filter((item: any) => {
        if (itemId && String(item.ItemId ?? item.itemId ?? item.item_id ?? "").indexOf(itemId) === -1) return false;
        if (clientName && !String(item.ClientName ?? item.clientName ?? item.client_name ?? "").toLowerCase().includes(clientName.toLowerCase())) return false;
        if (stackSize && String(item.StackSize ?? item.stackSize ?? item.stack_size ?? "") !== stackSize) return false;
        if (directMoney && String(item.DirectMoney ?? item.directMoney ?? item.direct_money ?? "") !== directMoney) return false;
        if (bidMoney && String(item.BidMoney ?? item.bidMoney ?? item.bid_money ?? "") !== bidMoney) return false;
        if (bidderName && !String(item.BidderName ?? item.bidderName ?? item.bidder_name ?? "").toLowerCase().includes(bidderName.toLowerCase())) return false;
        return true;
      })
    : [];

  const clearFilters = () => {
    setItemId("");
    setClientName("");
    setStackSize("");
    setDirectMoney("");
    setBidMoney("");
    setBidderName("");
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-display text-white">Auction House</h2>
        <p className="text-muted-foreground mt-1">Browse and search auction listings.</p>
      </div>

      <Card className="bg-card/40 backdrop-blur-sm border-white/5 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Search className="w-5 h-5 text-secondary" />
          <h3 className="font-bold font-display text-lg text-white">Search Filters</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase">Item ID</label>
            <Input
              placeholder="Item ID..."
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase">Client Name</label>
            <Input
              placeholder="Client name..."
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase">Stack Size</label>
            <Input
              placeholder="Stack size..."
              value={stackSize}
              onChange={(e) => setStackSize(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase">Direct Money</label>
            <Input
              placeholder="Direct money..."
              value={directMoney}
              onChange={(e) => setDirectMoney(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase">Bid Money</label>
            <Input
              placeholder="Bid money..."
              value={bidMoney}
              onChange={(e) => setBidMoney(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase">Bidder Name</label>
            <Input
              placeholder="Bidder name..."
              value={bidderName}
              onChange={(e) => setBidderName(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={clearFilters}
            className="border-white/10 hover:bg-white/5 text-muted-foreground"
          >
            Clear Filters
          </Button>
        </div>
      </Card>

      <Card className="bg-card/40 backdrop-blur-sm border-white/5 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Gavel className="w-5 h-5 text-primary" />
          <h3 className="font-bold font-display text-lg text-white">Auction Listings</h3>
          {filtered.length > 0 && (
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 ml-2">
              {filtered.length} items
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full bg-white/5" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground font-mono text-sm">
            No auction items found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-mono uppercase text-xs">Item ID</TableHead>
                  <TableHead className="text-muted-foreground font-mono uppercase text-xs">Client Name</TableHead>
                  <TableHead className="text-muted-foreground font-mono uppercase text-xs">Stack Size</TableHead>
                  <TableHead className="text-muted-foreground font-mono uppercase text-xs">Direct Money</TableHead>
                  <TableHead className="text-muted-foreground font-mono uppercase text-xs">Bid Money</TableHead>
                  <TableHead className="text-muted-foreground font-mono uppercase text-xs">Bidder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item: any, idx: number) => (
                  <TableRow key={item.Id ?? item.id ?? idx} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-mono text-white/70">
                      {item.ItemId ?? item.itemId ?? item.item_id ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      {item.ClientName ?? item.clientName ?? item.client_name ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono">
                      {item.StackSize ?? item.stackSize ?? item.stack_size ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-amber-400">
                      {item.DirectMoney ?? item.directMoney ?? item.direct_money ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-amber-400">
                      {item.BidMoney ?? item.bidMoney ?? item.bid_money ?? "—"}
                    </TableCell>
                    <TableCell className="text-white/70">
                      {item.BidderName ?? item.bidderName ?? item.bidder_name ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
