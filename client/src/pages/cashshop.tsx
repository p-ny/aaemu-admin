import { useState, Component, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelectedServer } from "@/hooks/use-aaemu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Search,
  Package,
  FileBox,
  ShoppingCart,
  LayoutGrid,
  Database,
  RefreshCw,
  X,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function useIcsSkus(serverId: number | null) {
  return useQuery({
    queryKey: ["/api/cashshop/skus", serverId],
    queryFn: async () => {
      const res = await fetch(`/api/cashshop/skus/${serverId}`);
      if (!res.ok) throw new Error("Failed to load SKUs");
      return (await res.json()) as any[];
    },
    enabled: !!serverId,
  });
}

function useIcsItems(serverId: number | null) {
  return useQuery({
    queryKey: ["/api/cashshop/items", serverId],
    queryFn: async () => {
      const res = await fetch(`/api/cashshop/items/${serverId}`);
      if (!res.ok) throw new Error("Failed to load items");
      return (await res.json()) as any[];
    },
    enabled: !!serverId,
  });
}

function useIcsMenu(serverId: number | null) {
  return useQuery({
    queryKey: ["/api/cashshop/menu", serverId],
    queryFn: async () => {
      const res = await fetch(`/api/cashshop/menu/${serverId}`);
      if (!res.ok) throw new Error("Failed to load menu");
      return (await res.json()) as any[];
    },
    enabled: !!serverId,
  });
}

function useCompactItems(search: string, filename?: string) {
  return useQuery({
    queryKey: ["/api/compact/items", search, filename],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (filename) qs.set("filename", filename);
      qs.set("limit", "100");
      const res = await fetch(`/api/compact/items?${qs}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.items)) return data.items;
      return [];
    },
    enabled: search.length >= 2,
  });
}

function useCompactFiles() {
  return useQuery({
    queryKey: ["/api/compact/files"],
    queryFn: async () => {
      const res = await fetch("/api/compact/files");
      if (!res.ok) return [];
      return (await res.json()) as string[];
    },
  });
}

function useCompactItem(itemId: number, filename?: string) {
  return useQuery({
    queryKey: ["/api/compact/item", itemId, filename],
    queryFn: async () => {
      const qs = filename ? `?filename=${filename}` : "";
      const res = await fetch(`/api/compact/item/${itemId}${qs}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: itemId > 0,
    staleTime: 60 * 60 * 1000, // cache for 1 hour - item data doesn't change
  });
}

function CompactItemIcon({ itemId, className }: { itemId: number; className?: string }) {
  const { data: item } = useCompactItem(itemId);
  const src = item?.icon_filename
    ? `/icons/${item.icon_filename}.png`
    : item?.icon_id
    ? `/icons/icon_item_${String(item.icon_id).padStart(4, "0")}.png`
    : null;
  if (!src) return null;
  return (
    <img
      src={src}
      className={className}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  );
}

function SkuEditor({ serverId }: { serverId: number }) {
  const queryClient = useQueryClient();
  const { data: skus, isLoading } = useIcsSkus(serverId);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/cashshop/skus/${serverId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Create failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashshop/skus", serverId] });
      setEditOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/cashshop/skus/${serverId}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashshop/skus", serverId] });
      setEditOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/cashshop/skus/${serverId}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashshop/skus", serverId] });
    },
  });

  const openNew = () => {
    setEditData({
      _isNew: true,
      sku_id: 0,
      item_template_id: 0,
      item_count: 1,
      select_type: 0,
      is_default: 0,
      event_type: 0,
      event_end_date: "",
      currency: 0,
      price: 0,
      discount_price: 0,
      bonus_item_id: 0,
      bonus_item_count: 0,
    });
    setEditOpen(true);
  };

  const openEdit = (row: any) => {
    setEditData({ ...row, _isNew: false });
    setEditOpen(true);
  };

  const saveItem = () => {
    const { _isNew, ...data } = editData;
    if (!_isNew && data.sku_id) {
      const skuId = data.sku_id;
      updateMutation.mutate({ id: skuId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" /> SKU Definitions
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/cashshop/skus", serverId] })}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Add SKU
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-white/5" />)}
        </div>
      ) : (
        <div className="border border-white/5 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground">SKU</TableHead>
                <TableHead className="text-xs text-muted-foreground">Item Template</TableHead>
                <TableHead className="text-xs text-muted-foreground">Count</TableHead>
                <TableHead className="text-xs text-muted-foreground">Currency</TableHead>
                <TableHead className="text-xs text-muted-foreground">Price</TableHead>
                <TableHead className="text-xs text-muted-foreground">Discount</TableHead>
                <TableHead className="text-xs text-muted-foreground">Event Type</TableHead>
                <TableHead className="text-xs text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skus?.map((row: any) => (
                <TableRow key={row.sku_id} className="border-white/5">
                  <TableCell className="font-mono text-sm">{row.sku_id}</TableCell>
                  <TableCell className="font-mono text-sm">{row.item_template_id}</TableCell>
                  <TableCell>{row.item_count}</TableCell>
                  <TableCell>{row.currency}</TableCell>
                  <TableCell className="text-amber-400">{row.price}</TableCell>
                  <TableCell className="text-green-400">{row.discount_price || "-"}</TableCell>
                  <TableCell><Badge variant="outline">{row.event_type}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(row)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400" onClick={() => {
                        if (confirm("Are you sure? AAEmu guidelines advise against deleting SKUs to maintain log integrity.")) {
                          deleteMutation.mutate(row.sku_id);
                        }
                      }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!skus || skus.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No SKU definitions found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{editData?._isNew === false ? "Edit SKU" : "New SKU"}</DialogTitle>
          </DialogHeader>
          {editData && (
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground border-b border-white/5 pb-2 font-mono uppercase tracking-wider">Identification</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "sku_id", label: "SKU ID", type: "number", hint: "Unique SKU identifier" },
                    { key: "item_template_id", label: "Item Template ID", type: "number", hint: "ID from compact.sqlite3 items table" },
                    { key: "item_count", label: "Quantity", type: "number", hint: "How many items per purchase" },
                    { key: "select_type", label: "Select Type", type: "number", hint: "0 = normal" },
                  ].map(({ key, label, type, hint }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Input type={type} value={editData[key] ?? ""} onChange={(e) => setEditData({ ...editData, [key]: Number(e.target.value) })} className="bg-black/20 border-white/10 h-9" />
                      <p className="text-[10px] text-muted-foreground/60">{hint}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground border-b border-white/5 pb-2 font-mono uppercase tracking-wider">Pricing</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "currency", label: "Currency", type: "number", hint: "0 = credits, 1 = loyalty" },
                    { key: "price", label: "Price", type: "number", hint: "Regular price in currency units" },
                    { key: "discount_price", label: "Sale Price", type: "number", hint: "0 = no discount" },
                  ].map(({ key, label, type, hint }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Input type={type} value={editData[key] ?? ""} onChange={(e) => setEditData({ ...editData, [key]: Number(e.target.value) })} className="bg-black/20 border-white/10 h-9" />
                      <p className="text-[10px] text-muted-foreground/60">{hint}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground border-b border-white/5 pb-2 font-mono uppercase tracking-wider">Event & Bonus</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Default Item</Label>
                    <select value={editData.is_default ?? 0} onChange={(e) => setEditData({ ...editData, is_default: Number(e.target.value) })} className="w-full h-9 rounded-md bg-black/20 border border-white/10 text-sm text-white px-3">
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground/60">Show as default selection</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Event Type</Label>
                    <select value={editData.event_type ?? 0} onChange={(e) => setEditData({ ...editData, event_type: Number(e.target.value) })} className="w-full h-9 rounded-md bg-black/20 border border-white/10 text-sm text-white px-3">
                      <option value={0}>None</option>
                      <option value={1}>Limited Time</option>
                      <option value={2}>Seasonal</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground/60">Event classification</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Event End Date</Label>
                    <Input type="datetime-local" value={editData.event_end_date ?? ""} onChange={(e) => setEditData({ ...editData, event_end_date: e.target.value })} className="bg-black/20 border-white/10 h-9" />
                    <p className="text-[10px] text-muted-foreground/60">Leave empty for no expiry</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bonus Item ID</Label>
                    <Input type="number" value={editData.bonus_item_id ?? 0} onChange={(e) => setEditData({ ...editData, bonus_item_id: Number(e.target.value) })} className="bg-black/20 border-white/10 h-9" />
                    <p className="text-[10px] text-muted-foreground/60">0 = no bonus item</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bonus Quantity</Label>
                    <Input type="number" value={editData.bonus_item_count ?? 0} onChange={(e) => setEditData({ ...editData, bonus_item_count: Number(e.target.value) })} className="bg-black/20 border-white/10 h-9" />
                    <p className="text-[10px] text-muted-foreground/60">Number of bonus items</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button onClick={saveItem} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editData._isNew === false ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShopItemEditor({ serverId }: { serverId: number }) {
  const queryClient = useQueryClient();
  const { data: items, isLoading } = useIcsItems(serverId);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/cashshop/items/${serverId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Create failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashshop/items", serverId] });
      setEditOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/cashshop/items/${serverId}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashshop/items", serverId] });
      setEditOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/cashshop/items/${serverId}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashshop/items", serverId] });
    },
  });

  const openNew = () => {
    setEditData({
      _isNew: true,
      shop_id: 0,
      display_order: 0,
      sku: 0,
      category: 0,
      sub_category: 0,
      is_hidden: 0,
      limited_count: 0,
      limited_stock: 0,
      level_min: 0,
      level_max: 0,
      buy_restrict_type: 0,
      buy_restrict_id: 0,
      is_sale: 0,
      sale_amount: 0,
      is_new: 0,
      is_recommend: 0,
      start_date: "",
      end_date: "",
    });
    setEditOpen(true);
  };

  const openEdit = (row: any) => {
    setEditData({ ...row, _isNew: false });
    setEditOpen(true);
  };

  const saveItem = () => {
    const { _isNew, ...data } = editData;
    if (!_isNew && data.shop_id) {
      const shopId = data.shop_id;
      updateMutation.mutate({ id: shopId, data });
    } else {
      createMutation.mutate(data);
    }
    setEditOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" /> Shop Items
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/cashshop/items", serverId] })}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-white/5" />)}
        </div>
      ) : (
        <div className="border border-white/5 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground">Shop ID</TableHead>
                <TableHead className="text-xs text-muted-foreground">SKU</TableHead>
                <TableHead className="text-xs text-muted-foreground">Category</TableHead>
                <TableHead className="text-xs text-muted-foreground">Order</TableHead>
                <TableHead className="text-xs text-muted-foreground">Flags</TableHead>
                <TableHead className="text-xs text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.map((row: any) => (
                <TableRow key={row.shop_id} className="border-white/5">
                  <TableCell className="font-mono text-sm">{row.shop_id}</TableCell>
                  <TableCell className="font-mono text-sm">{row.sku}</TableCell>
                  <TableCell>{row.category}/{row.sub_category}</TableCell>
                  <TableCell>{row.display_order}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {row.is_sale ? <Badge variant="outline" className="text-amber-400 border-amber-400/30">Sale</Badge> : null}
                      {row.is_new ? <Badge variant="outline" className="text-green-400 border-green-400/30">New</Badge> : null}
                      {row.is_recommend ? <Badge variant="outline" className="text-blue-400 border-blue-400/30">Featured</Badge> : null}
                      {row.is_hidden ? <Badge variant="outline" className="text-red-400 border-red-400/30">Hidden</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(row)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400" onClick={() => {
                        if (confirm("Are you sure? AAEmu guidelines advise against deleting Shop Items to maintain log integrity.")) {
                          deleteMutation.mutate(row.shop_id);
                        }
                      }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!items || items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No shop items found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editData?._isNew === false ? "Edit Shop Item" : "New Shop Item"}</DialogTitle>
          </DialogHeader>
          {editData && (
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground border-b border-white/5 pb-2 font-mono uppercase tracking-wider">Item Setup</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "shop_id", label: "Shop ID", hint: "Unique shop listing ID" },
                    { key: "sku", label: "SKU", hint: "Links to a SKU definition" },
                    { key: "display_order", label: "Display Order", hint: "Sort position in the shop" },
                    { key: "category", label: "Category", hint: "Main category number" },
                    { key: "sub_category", label: "Sub Category", hint: "Sub category number" },
                  ].map(({ key, label, hint }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Input type="number" value={editData[key] ?? 0} onChange={(e) => setEditData({ ...editData, [key]: Number(e.target.value) })} className="bg-black/20 border-white/10 h-9" />
                      <p className="text-[10px] text-muted-foreground/60">{hint}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground border-b border-white/5 pb-2 font-mono uppercase tracking-wider">Level & Purchase Limits</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "level_min", label: "Min Level", hint: "0 = no minimum" },
                    { key: "level_max", label: "Max Level", hint: "0 = no maximum" },
                    { key: "limited_count", label: "Purchase Limit", hint: "0 = unlimited" },
                    { key: "limited_stock", label: "Stock Limit", hint: "0 = unlimited stock" },
                    { key: "buy_restrict_type", label: "Restriction Type", hint: "0 = none" },
                    { key: "buy_restrict_id", label: "Restriction ID", hint: "Related restriction ID" },
                  ].map(({ key, label, hint }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Input type="number" value={editData[key] ?? 0} onChange={(e) => setEditData({ ...editData, [key]: Number(e.target.value) })} className="bg-black/20 border-white/10 h-9" />
                      <p className="text-[10px] text-muted-foreground/60">{hint}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground border-b border-white/5 pb-2 font-mono uppercase tracking-wider">Display Flags</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "is_hidden", label: "Hidden" },
                    { key: "is_sale", label: "On Sale" },
                    { key: "is_new", label: "New Tag" },
                    { key: "is_recommend", label: "Featured" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/10">
                      <input type="checkbox" checked={!!editData[key]} onChange={(e) => setEditData({ ...editData, [key]: e.target.checked ? 1 : 0 })} className="rounded bg-black/20 border-white/20" />
                      <Label className="text-xs cursor-pointer">{label}</Label>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sale Discount (%)</Label>
                  <Input type="number" value={editData.sale_amount ?? 0} onChange={(e) => setEditData({ ...editData, sale_amount: Number(e.target.value) })} className="bg-black/20 border-white/10 h-9" />
                  <p className="text-[10px] text-muted-foreground/60">Discount percentage when on sale</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground border-b border-white/5 pb-2 font-mono uppercase tracking-wider">Schedule</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Start Date</Label>
                    <Input type="datetime-local" value={editData.start_date ?? ""} onChange={(e) => setEditData({ ...editData, start_date: e.target.value })} className="bg-black/20 border-white/10 h-9" />
                    <p className="text-[10px] text-muted-foreground/60">When item becomes available</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End Date</Label>
                    <Input type="datetime-local" value={editData.end_date ?? ""} onChange={(e) => setEditData({ ...editData, end_date: e.target.value })} className="bg-black/20 border-white/10 h-9" />
                    <p className="text-[10px] text-muted-foreground/60">Leave empty for permanent</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button onClick={saveItem} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editData._isNew === false ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MenuEditor({ serverId }: { serverId: number }) {
  const queryClient = useQueryClient();
  const { data: menu, isLoading } = useIcsMenu(serverId);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/cashshop/menu/${serverId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Create failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashshop/menu", serverId] });
      setEditOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/cashshop/menu/${serverId}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashshop/menu", serverId] });
      setEditOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/cashshop/menu/${serverId}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashshop/menu", serverId] });
    },
  });

  const openNew = () => {
    setEditData({
      _isNew: true,
      main_tab: 0,
      sub_tab: 0,
      tab_name: "",
      display_order: 0,
    });
    setEditOpen(true);
  };

  const saveItem = () => {
    const { _isNew, ...data } = editData;
    if (!_isNew && data.id) {
      const menuId = data.id;
      updateMutation.mutate({ id: menuId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-primary" /> Menu / Categories
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/cashshop/menu", serverId] })}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Add Menu
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-white/5" />)}
        </div>
      ) : (
        <div className="border border-white/5 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground">Main Tab</TableHead>
                <TableHead className="text-xs text-muted-foreground">Sub Tab</TableHead>
                <TableHead className="text-xs text-muted-foreground">Name</TableHead>
                <TableHead className="text-xs text-muted-foreground">Order</TableHead>
                <TableHead className="text-xs text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menu?.map((row: any) => (
                <TableRow key={row.id || `${row.main_tab}-${row.sub_tab}`} className="border-white/5">
                  <TableCell>{row.main_tab}</TableCell>
                  <TableCell>{row.sub_tab}</TableCell>
                  <TableCell className="font-medium">{row.tab_name}</TableCell>
                  <TableCell>{row.display_order}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditData({ ...row, _isNew: false }); setEditOpen(true); }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400" onClick={() => deleteMutation.mutate(row.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!menu || menu.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No menu entries found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editData?._isNew === false ? "Edit Menu" : "New Menu Entry"}</DialogTitle>
          </DialogHeader>
          {editData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Main Tab</Label>
                  <Input type="number" value={editData.main_tab ?? 0} onChange={(e) => setEditData({ ...editData, main_tab: Number(e.target.value) })} className="bg-black/20 border-white/10 h-9" />
                  <p className="text-[10px] text-muted-foreground/60">Top-level category number</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sub Tab</Label>
                  <Input type="number" value={editData.sub_tab ?? 0} onChange={(e) => setEditData({ ...editData, sub_tab: Number(e.target.value) })} className="bg-black/20 border-white/10 h-9" />
                  <p className="text-[10px] text-muted-foreground/60">Sub-category within the main tab</p>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tab Name</Label>
                <Input type="text" value={editData.tab_name ?? ""} onChange={(e) => setEditData({ ...editData, tab_name: e.target.value })} placeholder="e.g. Weapons, Armor, Mounts..." className="bg-black/20 border-white/10 h-9" />
                <p className="text-[10px] text-muted-foreground/60">Display name shown in the shop menu</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Display Order</Label>
                <Input type="number" value={editData.display_order ?? 0} onChange={(e) => setEditData({ ...editData, display_order: Number(e.target.value) })} className="bg-black/20 border-white/10 h-9" />
                <p className="text-[10px] text-muted-foreground/60">Sort position (lower numbers appear first)</p>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button onClick={saveItem} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editData._isNew === false ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

class ItemBrowserErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-12">
          <Database className="w-12 h-12 mx-auto mb-3 opacity-30 text-red-400" />
          <p className="text-red-400 font-medium">Item Browser encountered an error</p>
          <p className="text-sm text-muted-foreground mt-1">{this.state.error?.message}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => this.setState({ hasError: false })}>
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ItemBrowser() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const { data: files } = useCompactFiles();
  const [selectedFile, setSelectedFile] = useState<string | undefined>(undefined);
  const { data: items, isLoading } = useCompactItems(search, selectedFile);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const handleSearch = () => setSearch(searchInput);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      await fetch("/api/compact/upload", { method: "POST", body: form });
      queryClient.invalidateQueries({ queryKey: ["/api/compact/files"] });
    } catch {}
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" /> Item Browser (compact.sqlite3)
        </h3>
        <label className="cursor-pointer">
          <input type="file" className="hidden" accept=".sqlite3,.sqlite,.db" onChange={handleUpload} />
          <Button size="sm" variant="outline" asChild disabled={uploading}>
            <span><Upload className="w-4 h-4 mr-1" /> {uploading ? "Uploading..." : "Upload DB"}</span>
          </Button>
        </label>
      </div>

      {files && files.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={!selectedFile ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedFile(undefined)}
          >
            Default
          </Badge>
          {files.map((f: string) => (
            <Badge
              key={f}
              variant={selectedFile === f ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedFile(f)}
            >
              {f}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Search items by name or ID..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="bg-black/20 border-white/10"
        />
        <Button onClick={handleSearch}>
          <Search className="w-4 h-4 mr-1" /> Search
        </Button>
      </div>

      {search.length < 2 ? (
        <div className="text-center text-muted-foreground py-12">
          <FileBox className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Enter at least 2 characters to search items</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full bg-white/5" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items?.map((item: any) => (
            <div key={item.id} className="bg-card/40 border border-white/5 rounded-lg p-3 flex gap-3 items-start">
              {(item.icon_filename || item.icon_id) && (
                <img
                  src={item.icon_filename ? `/icons/${item.icon_filename}.png` : `/icons/icon_item_${String(item.icon_id).padStart(4, "0")}.png`}
                  alt=""
                  className="w-10 h-10 rounded border border-white/10 bg-black/20"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{item.name || `Item #${item.id}`}</p>
                <div className="flex gap-3 text-xs text-muted-foreground font-mono">
                  <span>ID: {item.id}</span>
                  {item.level != null && <span>Lv: {item.level}</span>}
                  {item.price != null && item.price > 0 && <span>Price: {item.price}</span>}
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                )}
              </div>
            </div>
          ))}
          {items?.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-8">No items found</div>
          )}
        </div>
      )}
    </div>
  );
}

import shopBg from "@/assets/images/shop-bg.png";

function ShopPreview({ serverId }: { serverId: number }) {
  const { data: menu } = useIcsMenu(serverId);
  const { data: items } = useIcsItems(serverId);
  const { data: skus } = useIcsSkus(serverId);
  const [activeTab, setActiveTab] = useState<number | null>(null);

  const displayItems = items?.filter(item => {
    if (activeTab === null) return true;
    return item.category === activeTab;
  }) || [];

  return (
    <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black mb-8">
      <img src={shopBg} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="Shop Background" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80" />
      
      <div className="relative h-full flex flex-col p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.5)]">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">Marketplace</h2>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-1.5 rounded-full bg-black/60 border border-white/10 flex items-center gap-2 backdrop-blur-sm">
              <span className="text-amber-400 font-bold">1,250</span>
              <span className="text-[10px] text-muted-foreground uppercase font-mono">Credits</span>
            </div>
            <div className="px-4 py-1.5 rounded-full bg-black/60 border border-white/10 flex items-center gap-2 backdrop-blur-sm">
              <span className="text-blue-400 font-bold">450</span>
              <span className="text-[10px] text-muted-foreground uppercase font-mono">Loyalty</span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 gap-6 min-h-0">
          <div className="w-48 flex flex-col gap-1 overflow-y-auto pr-2 custom-scrollbar">
            <button
              onClick={() => setActiveTab(null)}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all duration-200 border border-transparent ${
                activeTab === null 
                  ? "bg-primary/20 text-primary border-primary/30 shadow-[inset_0_0_10px_rgba(var(--primary),0.1)] font-semibold" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              }`}
            >
              All Items
            </button>
            {menu?.map((m: any) => (
              <button
                key={m.id}
                onClick={() => setActiveTab(m.id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all duration-200 border border-transparent ${
                  activeTab === m.id 
                    ? "bg-primary/20 text-primary border-primary/30 shadow-[inset_0_0_10px_rgba(var(--primary),0.1)] font-semibold" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                }`}
              >
                {m.name || m.tab_name}
              </button>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar content-start">
            {displayItems.map((item: any) => {
              // SKUs link to items via shop_id, pick the default one (is_default=1) or first
              const itemSkus = skus?.filter(s => s.shop_id === item.shop_id) || [];
              const sku = itemSkus.find(s => s.is_default === 1) || itemSkus[0];
              const itemId = sku?.item_template_id || sku?.item_id || 0;
              return (
                <div key={item.shop_id} className="group relative bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col gap-3 transition-all duration-300 hover:border-primary/40 hover:bg-black/60 hover:shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                  <div className="aspect-square rounded-lg bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center relative overflow-hidden">
                    {itemId > 0 && (
                      <CompactItemIcon itemId={itemId} className="w-16 h-16 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] group-hover:scale-110 transition-transform duration-300" />
                    )}
                    {item.is_new ? (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-green-500 text-[10px] font-bold text-white uppercase tracking-tighter shadow-lg">New</div>
                    ) : null}
                    {item.is_sale ? (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-500 text-[10px] font-bold text-white uppercase tracking-tighter shadow-lg">Sale</div>
                    ) : null}
                  </div>
                  
                  <div className="flex flex-col gap-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors">
                      Item #{itemId || "???"}
                    </h4>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex flex-col">
                        {sku?.discount_price > 0 && (
                          <span className="text-[10px] text-muted-foreground line-through opacity-60">{sku.price}</span>
                        )}
                        <span className={`text-lg font-bold ${sku?.currency === 1 ? "text-blue-400" : "text-amber-400"}`}>
                          {sku?.discount_price > 0 ? sku.discount_price : (sku?.price || 0)}
                        </span>
                      </div>
                      <Button size="sm" className="h-8 px-3 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm">
                        Buy
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CashShopPage() {
  const { serverId } = useSelectedServer();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-display text-white">Cash Shop Editor</h2>
        <p className="text-muted-foreground mt-1">
          Manage in-game cash shop (ICS) items, SKUs, and menu categories via MySQL. Browse item data from compact.sqlite3 files.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-primary" /> In-Game Preview
        </h2>
        {serverId ? (
          <ShopPreview serverId={serverId} />
        ) : (
          <div className="w-full aspect-[16/9] rounded-xl border border-white/10 bg-black/40 flex flex-col items-center justify-center text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
            <p>Select a server to see preview</p>
          </div>
        )}
      </section>

      <Separator className="bg-white/5 my-8" />

      <Tabs defaultValue="skus" className="space-y-6">
        <TabsList className="bg-card/40 border border-white/5">
          <TabsTrigger value="skus" className="gap-2">
            <Package className="w-4 h-4" /> SKUs
          </TabsTrigger>
          <TabsTrigger value="items" className="gap-2">
            <ShoppingCart className="w-4 h-4" /> Shop Items
          </TabsTrigger>
          <TabsTrigger value="menu" className="gap-2">
            <LayoutGrid className="w-4 h-4" /> Menu
          </TabsTrigger>
          <TabsTrigger value="browser" className="gap-2">
            <Database className="w-4 h-4" /> Item Browser
          </TabsTrigger>
        </TabsList>

        <TabsContent value="skus">
          {serverId ? (
            <SkuEditor serverId={serverId} />
          ) : (
            <p className="text-center text-muted-foreground py-12">Select a server with MySQL configured to manage SKUs.</p>
          )}
        </TabsContent>

        <TabsContent value="items">
          {serverId ? (
            <ShopItemEditor serverId={serverId} />
          ) : (
            <p className="text-center text-muted-foreground py-12">Select a server with MySQL configured to manage shop items.</p>
          )}
        </TabsContent>

        <TabsContent value="menu">
          {serverId ? (
            <MenuEditor serverId={serverId} />
          ) : (
            <p className="text-center text-muted-foreground py-12">Select a server with MySQL configured to manage menu.</p>
          )}
        </TabsContent>

        <TabsContent value="browser">
          <ItemBrowserErrorBoundary>
            <ItemBrowser />
          </ItemBrowserErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
