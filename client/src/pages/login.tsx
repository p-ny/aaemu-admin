import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Lock, Server, Cpu, Activity, User } from "lucide-react";
import { useLocation } from "wouter";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoggingIn, loginError, isAuthenticated } = useAuth();
  const [_, setLocation] = useLocation();

  if (isAuthenticated) {
    setLocation("/");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    login({ username, password });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,23,0.8),rgba(18,18,23,0.9)),url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center -z-20" />
      <div className="absolute inset-0 bg-grid-white/[0.02] -z-10" />

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[128px] -z-10" />

      <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />

        <CardHeader className="pt-10 pb-2 text-center relative z-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl overflow-hidden shadow-lg shadow-primary/25 border border-white/10">
            <img src="/aaemu-icon-64.png" alt="AAEmu" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-wider">
            SYSTEM ACCESS
          </h1>
          <p className="text-sm text-muted-foreground mt-2 font-mono uppercase tracking-widest">
            AAEmu Panel
          </p>
        </CardHeader>

        <CardContent className="pb-10 px-8 relative z-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative group">
                <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  type="text"
                  placeholder="Username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-12 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 text-white placeholder:text-white/20 font-mono tracking-widest transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative group">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  type="password"
                  placeholder="Password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 text-white placeholder:text-white/20 font-mono tracking-widest transition-all"
                />
              </div>
              {loginError && (
                <p className="text-xs text-red-400 font-mono animate-in slide-in-from-left-2">
                  ERROR: {loginError.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold tracking-widest uppercase shadow-lg shadow-primary/20 transition-all active:scale-[0.98] tech-button"
            >
              {isLoggingIn ? (
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 animate-spin" /> Authenticating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Connect <Cpu className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 grid grid-cols-2 gap-4 text-[10px] text-muted-foreground font-mono uppercase opacity-50">
            <div>
              <span className="block text-white/40">Status</span>
              <span className="text-green-400">Online</span>
            </div>
            <div className="text-right">
              <span className="block text-white/40">Protocol</span>
              <span>AAEMU-SEC-V1</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
