import { useState } from "react";
import { useSelectedServer, useLoggedCharacters, useCharacterList, useCommand } from "@/hooks/use-aaemu";
import {
  Users, Search, Loader2, Ban, LogOut, VolumeX, Lock,
  MoreHorizontal, UserCog, MapPin, Package, ArrowUpCircle,
  Shield, ShieldOff, Volume2, Unlock, AlertTriangle, CheckCircle2,
  XCircle, Eye
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type PlayerAction = {
  id: string;
  label: string;
  icon: React.ReactNode;
  command: string;
  description: string;
  variant: "default" | "destructive" | "warning";
  needsReason?: boolean;
  needsArgs?: boolean;
  argsLabel?: string;
  argsPlaceholder?: string;
};

const PLAYER_ACTIONS: PlayerAction[] = [
  {
    id: "kick",
    label: "Kick",
    icon: <LogOut className="w-4 h-4" />,
    command: "kick",
    description: "Force disconnect this player from the server. They can reconnect immediately.",
    variant: "warning",
    needsReason: true,
  },
  {
    id: "ban",
    label: "Ban",
    icon: <Ban className="w-4 h-4" />,
    command: "ban",
    description: "Ban this player from the server. They will not be able to reconnect until unbanned.",
    variant: "destructive",
    needsReason: true,
  },
  {
    id: "unban",
    label: "Unban",
    icon: <ShieldOff className="w-4 h-4" />,
    command: "unban",
    description: "Remove the ban from this player, allowing them to reconnect.",
    variant: "default",
  },
  {
    id: "mute",
    label: "Mute",
    icon: <VolumeX className="w-4 h-4" />,
    command: "mute",
    description: "Prevent this player from sending chat messages.",
    variant: "warning",
    needsReason: true,
  },
  {
    id: "unmute",
    label: "Unmute",
    icon: <Volume2 className="w-4 h-4" />,
    command: "unmute",
    description: "Restore this player's ability to send chat messages.",
    variant: "default",
  },
  {
    id: "jail",
    label: "Jail",
    icon: <Lock className="w-4 h-4" />,
    command: "jail",
    description: "Send this player to jail, restricting their movement.",
    variant: "warning",
    needsReason: true,
  },
  {
    id: "unjail",
    label: "Unjail",
    icon: <Unlock className="w-4 h-4" />,
    command: "unjail",
    description: "Release this player from jail.",
    variant: "default",
  },
];

const ADVANCED_ACTIONS: PlayerAction[] = [
  {
    id: "teleport",
    label: "Teleport",
    icon: <MapPin className="w-4 h-4" />,
    command: "teleport",
    description: "Teleport this player to specific coordinates (x y z).",
    variant: "default",
    needsArgs: true,
    argsLabel: "Coordinates",
    argsPlaceholder: "x y z (e.g. 100 200 300)",
  },
  {
    id: "give_item",
    label: "Give Item",
    icon: <Package className="w-4 h-4" />,
    command: "add_item",
    description: "Give an item to this player by template ID and quantity.",
    variant: "default",
    needsArgs: true,
    argsLabel: "Item ID & Count",
    argsPlaceholder: "templateId count (e.g. 500 10)",
  },
  {
    id: "set_level",
    label: "Set Level",
    icon: <ArrowUpCircle className="w-4 h-4" />,
    command: "set_level",
    description: "Set this player's character level.",
    variant: "default",
    needsArgs: true,
    argsLabel: "Level",
    argsPlaceholder: "level (e.g. 55)",
  },
];

function getCharField(char: any, ...keys: string[]) {
  for (const k of keys) {
    if (char[k] !== undefined && char[k] !== null) return char[k];
  }
  return undefined;
}

function ActionConfirmDialog({
  open,
  onOpenChange,
  action,
  characterName,
  serverId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: PlayerAction | null;
  characterName: string;
  serverId: number;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [args, setArgs] = useState("");
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  if (!action) return null;

  const handleExecute = async () => {
    setExecuting(true);
    setResult(null);
    try {
      let cmdArgs = "";
      if (action.needsArgs && args) {
        cmdArgs = args;
      } else if (action.needsReason && reason) {
        cmdArgs = reason;
      }

      const res = await fetch("/api/aaemu/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverId,
          command: action.command,
          character: characterName,
          arguments: cmdArgs || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: data.result || "Command executed successfully" });
        toast({
          title: `${action.label} executed`,
          description: `${action.label} action on ${characterName} completed.`,
        });
        onSuccess();
      } else {
        setResult({ success: false, message: data.message || "Command failed" });
      }
    } catch (e: any) {
      setResult({ success: false, message: e.message || "Failed to execute command" });
    } finally {
      setExecuting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setArgs("");
    setResult(null);
    onOpenChange(false);
  };

  const variantColors = {
    destructive: "bg-red-500/10 border-red-500/30 text-red-400",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    default: "bg-primary/10 border-primary/30 text-primary",
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="bg-card border-white/10 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-white">
            <div className={`p-2 rounded-lg border ${variantColors[action.variant]}`}>
              {action.icon}
            </div>
            {action.label} Player
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {action.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <UserCog className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-white font-mono">{characterName}</span>
          </div>

          {action.needsReason && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase">Reason (optional)</label>
              <Textarea
                placeholder="Enter reason..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 min-h-[60px] resize-none"
              />
            </div>
          )}

          {action.needsArgs && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase">{action.argsLabel}</label>
              <Input
                placeholder={action.argsPlaceholder}
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
              />
            </div>
          )}

          {result && (
            <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-sm ${
              result.success
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <span className="break-all font-mono text-xs">{result.message}</span>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={handleClose}>
            {result ? "Close" : "Cancel"}
          </AlertDialogCancel>
          {!result && (
            <Button
              onClick={handleExecute}
              disabled={executing || (action.needsArgs && !args)}
              className={
                action.variant === "destructive"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : action.variant === "warning"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-primary hover:bg-primary/90 text-white"
              }
            >
              {executing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <span className="mr-2">{action.icon}</span>
              )}
              Confirm {action.label}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PlayerDetailDialog({
  open,
  onOpenChange,
  character,
  serverId,
  onAction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: any;
  serverId: number;
  onAction: (action: PlayerAction) => void;
}) {
  if (!character) return null;

  const name = getCharField(character, "Name", "name") || "Unknown";
  const id = getCharField(character, "Id", "id");
  const level = getCharField(character, "Level", "level");
  const isOnline = getCharField(character, "IsOnline", "isOnline", "Online", "online");
  const accountId = getCharField(character, "AccountId", "accountId", "Account", "account");
  const race = getCharField(character, "Race", "race");
  const gender = getCharField(character, "Gender", "gender");
  const hp = getCharField(character, "Hp", "hp");
  const mp = getCharField(character, "Mp", "mp");
  const zone = getCharField(character, "Zone", "zone", "ZoneId", "zoneId");
  const x = getCharField(character, "X", "x", "PosX", "posX");
  const y = getCharField(character, "Y", "y", "PosY", "posY");
  const z = getCharField(character, "Z", "z", "PosZ", "posZ");
  const created = getCharField(character, "CreatedAt", "created_at", "Created");
  const updated = getCharField(character, "UpdatedAt", "updated_at", "Updated");

  const infoRows = [
    { label: "Character ID", value: id },
    { label: "Account ID", value: accountId },
    { label: "Level", value: level },
    { label: "Race", value: race },
    { label: "Gender", value: gender !== undefined ? (gender === 1 ? "Female" : "Male") : undefined },
    { label: "HP / MP", value: hp !== undefined ? `${hp} / ${mp ?? "?"}` : undefined },
    { label: "Zone", value: zone },
    { label: "Position", value: x !== undefined ? `${x}, ${y}, ${z}` : undefined },
    { label: "Created", value: created },
    { label: "Updated", value: updated },
  ].filter((r) => r.value !== undefined && r.value !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-display text-lg">{name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  variant="outline"
                  className={
                    isOnline
                      ? "border-green-400/30 text-green-400 bg-green-400/10 text-[10px]"
                      : "border-white/10 text-muted-foreground bg-white/5 text-[10px]"
                  }
                >
                  {isOnline ? "ONLINE" : "OFFLINE"}
                </Badge>
                {level && (
                  <span className="text-xs text-muted-foreground font-mono">Lv.{level}</span>
                )}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Character details and management actions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            {infoRows.map((row) => (
              <div key={row.label} className="px-3 py-2 rounded-lg bg-white/5 border border-white/5">
                <div className="text-[10px] font-mono text-muted-foreground uppercase">{row.label}</div>
                <div className="text-sm text-white font-mono mt-0.5">{String(row.value)}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Quick Actions</div>
            <div className="grid grid-cols-4 gap-2">
              {PLAYER_ACTIONS.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  className={`flex flex-col items-center gap-1 h-auto py-2.5 border-white/10 hover:border-white/20 ${
                    action.variant === "destructive"
                      ? "hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                      : action.variant === "warning"
                      ? "hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30"
                      : "hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                  }`}
                  onClick={() => onAction(action)}
                >
                  {action.icon}
                  <span className="text-[10px] font-mono">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Advanced</div>
            <div className="grid grid-cols-3 gap-2">
              {ADVANCED_ACTIONS.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  className="flex flex-col items-center gap-1 h-auto py-2.5 border-white/10 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                  onClick={() => onAction(action)}
                >
                  {action.icon}
                  <span className="text-[10px] font-mono">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlayerActionButtons({
  characterName,
  serverId,
  isOnline,
}: {
  characterName: string;
  serverId: number;
  isOnline?: boolean;
}) {
  const [selectedAction, setSelectedAction] = useState<PlayerAction | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleAction = (action: PlayerAction) => {
    setSelectedAction(action);
    setConfirmOpen(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/aaemu/characters"] });
    queryClient.invalidateQueries({ queryKey: ["/api/aaemu/character-list"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {isOnline && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            onClick={() => handleAction(PLAYER_ACTIONS[0])}
            title="Kick"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-white hover:bg-white/10"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-white/10 min-w-[160px]">
            {PLAYER_ACTIONS.map((action) => (
              <DropdownMenuItem
                key={action.id}
                className={`flex items-center gap-2 cursor-pointer ${
                  action.variant === "destructive"
                    ? "text-red-400 focus:text-red-400 focus:bg-red-500/10"
                    : action.variant === "warning"
                    ? "text-amber-400 focus:text-amber-400 focus:bg-amber-500/10"
                    : "text-white focus:text-white focus:bg-white/10"
                }`}
                onClick={() => handleAction(action)}
              >
                {action.icon}
                <span className="font-mono text-xs">{action.label}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-white/10" />
            {ADVANCED_ACTIONS.map((action) => (
              <DropdownMenuItem
                key={action.id}
                className="flex items-center gap-2 cursor-pointer text-white focus:text-white focus:bg-white/10"
                onClick={() => handleAction(action)}
              >
                {action.icon}
                <span className="font-mono text-xs">{action.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ActionConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        action={selectedAction}
        characterName={characterName}
        serverId={serverId}
        onSuccess={handleSuccess}
      />
    </>
  );
}

function CharacterTable({
  data,
  isLoading,
  serverId,
  showActions,
}: {
  data: any[];
  isLoading: boolean;
  serverId: number | null;
  showActions?: boolean;
}) {
  const [selectedChar, setSelectedChar] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionFromDetail, setActionFromDetail] = useState<PlayerAction | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full bg-white/5" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground font-mono text-sm">
        No characters found.
      </div>
    );
  }

  const handleRowClick = (char: any) => {
    setSelectedChar(char);
    setDetailOpen(true);
  };

  const handleDetailAction = (action: PlayerAction) => {
    setActionFromDetail(action);
    setDetailOpen(false);
    setConfirmOpen(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/aaemu/characters"] });
    queryClient.invalidateQueries({ queryKey: ["/api/aaemu/character-list"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="text-muted-foreground font-mono uppercase text-xs">ID</TableHead>
            <TableHead className="text-muted-foreground font-mono uppercase text-xs">Name</TableHead>
            <TableHead className="text-muted-foreground font-mono uppercase text-xs">Level</TableHead>
            <TableHead className="text-muted-foreground font-mono uppercase text-xs">Status</TableHead>
            <TableHead className="text-muted-foreground font-mono uppercase text-xs">Created</TableHead>
            {showActions && serverId && (
              <TableHead className="text-muted-foreground font-mono uppercase text-xs text-right">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((char: any, idx: number) => {
            const name = getCharField(char, "Name", "name") || "Unknown";
            const isOnline = getCharField(char, "IsOnline", "isOnline", "Online", "online");
            return (
              <TableRow
                key={getCharField(char, "Id", "id") ?? idx}
                className="border-white/5 hover:bg-white/5 cursor-pointer group"
                onClick={() => handleRowClick(char)}
              >
                <TableCell className="font-mono text-white/70">{getCharField(char, "Id", "id")}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{name}</span>
                    <Eye className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </TableCell>
                <TableCell className="font-mono">{getCharField(char, "Level", "level") ?? "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      isOnline
                        ? "border-green-400/30 text-green-400 bg-green-400/10"
                        : "border-white/10 text-muted-foreground bg-white/5"
                    }
                  >
                    {isOnline ? "Online" : "Offline"}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-white/50 text-sm">
                  {getCharField(char, "CreatedAt", "created_at", "Created") ?? "—"}
                </TableCell>
                {showActions && serverId && (
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <PlayerActionButtons
                      characterName={name}
                      serverId={serverId}
                      isOnline={isOnline}
                    />
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {selectedChar && serverId && (
        <>
          <PlayerDetailDialog
            open={detailOpen}
            onOpenChange={setDetailOpen}
            character={selectedChar}
            serverId={serverId}
            onAction={handleDetailAction}
          />
          <ActionConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            action={actionFromDetail}
            characterName={getCharField(selectedChar, "Name", "name") || "Unknown"}
            serverId={serverId}
            onSuccess={handleSuccess}
          />
        </>
      )}
    </>
  );
}

export default function CharactersPage() {
  const { serverId } = useSelectedServer();
  const { data: onlineChars, isLoading: onlineLoading } = useLoggedCharacters(serverId);

  const [searchName, setSearchName] = useState("");
  const [searchAccountId, setSearchAccountId] = useState("");
  const [searchParams, setSearchParams] = useState<{ Name?: string; AccountId?: string }>({});

  const { data: searchResults, isLoading: searchLoading } = useCharacterList(serverId, searchParams);

  const handleSearch = () => {
    setSearchParams({
      Name: searchName || undefined,
      AccountId: searchAccountId || undefined,
    });
  };

  const onlineCount = onlineChars?.length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-display text-white">Characters</h2>
        <p className="text-muted-foreground mt-1">
          View online players, search characters, and manage player actions.
        </p>
      </div>

      <Card className="bg-card/40 backdrop-blur-sm border-white/5 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-bold font-display text-lg text-white">Online Characters</h3>
            {onlineChars && (
              <Badge variant="outline" className="border-green-400/30 text-green-400 bg-green-400/10 ml-2">
                {onlineCount} online
              </Badge>
            )}
          </div>
          {onlineCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
              Click a row for details, or use action buttons
            </div>
          )}
        </div>
        <CharacterTable data={onlineChars ?? []} isLoading={onlineLoading} serverId={serverId} showActions />
      </Card>

      <Card className="bg-card/40 backdrop-blur-sm border-white/5 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Search className="w-5 h-5 text-secondary" />
          <h3 className="font-bold font-display text-lg text-white">Character Search</h3>
        </div>

        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase">Name</label>
            <Input
              placeholder="Character name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-48 bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase">Account ID</label>
            <Input
              placeholder="Account ID..."
              value={searchAccountId}
              onChange={(e) => setSearchAccountId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-48 bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={searchLoading}
            className="bg-primary hover:bg-primary/90 text-white font-bold tracking-wider uppercase tech-button"
          >
            {searchLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            Search
          </Button>
        </div>

        <CharacterTable data={searchResults ?? []} isLoading={searchLoading} serverId={serverId} showActions />
      </Card>
    </div>
  );
}
