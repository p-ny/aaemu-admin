import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Terminal, 
  LayoutDashboard, 
  History as HistoryIcon, 
  LogOut, 
  Server as ServerIcon, 
  ShieldCheck, 
  Plus,
  Trash2,
  ChevronRight,
  Users,
  Swords,
  ShoppingCart,
  Mail,
  Store,
  Settings,
  Network
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useServers, useSelectedServer, useAddServer, useDeleteServer } from "@/hooks/use-aaemu";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, isAuthenticated, isLoading } = useAuth();
  const { data: servers } = useServers();
  const { serverId, setServerId } = useSelectedServer();
  const addServer = useAddServer();
  const deleteServer = useDeleteServer();
  
  const [newServer, setNewServer] = useState({ name: "", ip: "127.0.0.1", port: 1280 });
  const [isAddOpen, setIsAddOpen] = useState(false);

  if (isLoading) return null;

  if (!isAuthenticated && location !== "/login") {
    window.location.href = "/login";
    return null;
  }

  if (location === "/login") {
    return <>{children}</>;
  }

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/console", label: "Console", icon: Terminal },
    { href: "/characters", label: "Characters", icon: Users },
    { href: "/expeditions", label: "Expeditions", icon: Swords },
    { href: "/auction", label: "Auction House", icon: ShoppingCart },
    { href: "/mail", label: "Mail System", icon: Mail },
    { href: "/cashshop", label: "Cash Shop", icon: Store },
    { href: "/history", label: "History", icon: HistoryIcon },
  ];

  const adminItems = [
    { href: "/servers", label: "Servers", icon: Network },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const handleAddServer = (e: React.FormEvent) => {
    e.preventDefault();
    addServer.mutate(newServer, {
      onSuccess: () => {
        setIsAddOpen(false);
        setNewServer({ name: "", ip: "127.0.0.1", port: 1280 });
      }
    });
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground font-sans">
      <aside className="w-72 border-r border-white/5 bg-card/30 backdrop-blur-xl flex flex-col fixed inset-y-0 z-50">
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <img src="/aaemu-icon-64.png" alt="AAEmu" className="w-10 h-10 rounded-xl shadow-lg shadow-primary/20" />
          <div>
            <h1 className="font-display font-bold text-xl tracking-wider text-white">AAEMU</h1>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Global Admin</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Game Servers</h2>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-white/5">
                    <Plus className="w-3 h-3 text-primary" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-white/10">
                  <DialogHeader>
                    <DialogTitle className="text-white">Add New Server</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddServer} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Server Name</Label>
                      <Input 
                        id="name" 
                        value={newServer.name} 
                        onChange={e => setNewServer({...newServer, name: e.target.value})}
                        placeholder="e.g. Production Cluster"
                        className="bg-black/20 border-white/10"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="ip">IP Address</Label>
                        <Input 
                          id="ip" 
                          value={newServer.ip} 
                          onChange={e => setNewServer({...newServer, ip: e.target.value})}
                          placeholder="127.0.0.1"
                          className="bg-black/20 border-white/10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="port">Port</Label>
                        <Input 
                          id="port" 
                          type="number"
                          value={newServer.port} 
                          onChange={e => setNewServer({...newServer, port: parseInt(e.target.value)})}
                          className="bg-black/20 border-white/10"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={addServer.isPending}>
                      {addServer.isPending ? "Connecting..." : "Add Server"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="space-y-1">
              {servers?.map((server) => (
                <div 
                  key={server.id}
                  className={cn(
                    "group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all border border-transparent",
                    serverId === server.id ? "bg-primary/10 border-primary/20 text-primary" : "hover:bg-white/5 text-muted-foreground"
                  )}
                  onClick={() => setServerId(server.id)}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className={cn("w-2 h-2 rounded-full", serverId === server.id ? "bg-primary animate-pulse" : "bg-white/10")} />
                    <span className="text-sm font-medium truncate">{server.name}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteServer.mutate(server.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              {servers?.length === 0 && (
                <p className="text-[10px] text-center text-muted-foreground/50 py-4 font-mono">NO SERVERS CONFIGURED</p>
              )}
            </div>
          </div>

          <nav className="p-4 space-y-1">
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4 px-2">Navigation</h2>
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group",
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_-5px_hsl(var(--primary))]" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}>
                  <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-white")} />
                  <span className="text-sm font-medium tracking-wide">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          <nav className="p-4 pt-0 space-y-1">
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4 px-2">Admin</h2>
            {adminItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group",
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_-5px_hsl(var(--primary))]" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}>
                  <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-white")} />
                  <span className="text-sm font-medium tracking-wide">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="mb-4 px-4 py-3 rounded-lg bg-green-500/5 border border-green-500/10 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-xs text-green-500 font-bold uppercase tracking-wider">Secure Access</p>
              <p className="text-[10px] text-green-400/70">Encrypted Admin Mode</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-muted-foreground hover:text-red-400 hover:bg-red-950/20 transition-colors"
            onClick={() => logout()}
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 ml-72 p-8 relative overflow-hidden min-h-screen">
        {!serverId && !["/login", "/servers", "/settings"].includes(location) ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 animate-pulse">
              <ServerIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="max-w-xs">
              <h2 className="text-xl font-bold text-white mb-2 tracking-wide">NO SERVER SELECTED</h2>
              <p className="text-sm text-muted-foreground">Select an active server from the sidebar or add a new one to begin administration.</p>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
