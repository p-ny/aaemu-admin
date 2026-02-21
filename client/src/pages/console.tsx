import { useState, useRef, useEffect } from "react";
import { useCommand, useSelectedServer, useLoggedCharacters } from "@/hooks/use-aaemu";
import { Terminal as TerminalIcon, Send, Eraser, Loader2, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function getCharName(char: any): string {
  return char?.Name || char?.name || "Unknown";
}

interface ConsoleLog {
  id: string;
  type: "command" | "response" | "error";
  content: string;
  timestamp: Date;
}

export default function ConsolePage() {
  const { serverId } = useSelectedServer();
  const [input, setInput] = useState("");
  const [characterName, setCharacterName] = useState("");
  const { data: onlineChars } = useLoggedCharacters(serverId);
  const charList: any[] = Array.isArray(onlineChars) ? onlineChars : [];
  const [logs, setLogs] = useState<ConsoleLog[]>([
    {
      id: "init",
      type: "response",
      content: "AAEmu Admin Console Initialized v1.1.0\nAvailable commands can be found in the AAEmu docs.\n\nSelect an online character from the dropdown above to execute commands.",
      timestamp: new Date(),
    }
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { mutate: sendCommand, isPending } = useCommand();

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isPending || !serverId) return;

    const cmd = input.trim();
    const newLog: ConsoleLog = {
      id: Math.random().toString(36),
      type: "command",
      content: cmd,
      timestamp: new Date(),
    };

    setLogs(prev => [...prev, newLog]);
    setInput("");

    sendCommand({ command: cmd, serverId, character: characterName || undefined }, {
      onSuccess: (data) => {
        let content = "Command executed successfully.";
        try {
          const parsed = typeof data.result === "string" ? JSON.parse(data.result) : data.result;
          const msgs: string[] = [];
          if (parsed?.ErrorMessages?.length) {
            msgs.push(...parsed.ErrorMessages.map((m: string) => `[ERROR] ${m}`));
          }
          if (parsed?.Messages?.length) {
            msgs.push(...parsed.Messages);
          }
          if (msgs.length) {
            content = msgs.join("\n");
          }
        } catch {
          if (data.result) content = data.result;
        }
        setLogs(prev => [...prev, {
          id: Math.random().toString(36),
          type: (content.includes("[ERROR]") ? "error" : "response") as "error" | "response",
          content,
          timestamp: new Date(),
        }]);
      },
      onError: (error) => {
        setLogs(prev => [...prev, {
          id: Math.random().toString(36),
          type: "error",
          content: error.message,
          timestamp: new Date(),
        }]);
      }
    });
  };

  const clearConsole = () => {
    setLogs([{
      id: Math.random().toString(36),
      type: "response",
      content: "Console cleared.",
      timestamp: new Date(),
    }]);
    inputRef.current?.focus();
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-display text-white">Server Console</h2>
          <p className="text-muted-foreground mt-1">Direct command execution interface.</p>
        </div>
        <Button variant="outline" onClick={clearConsole} className="gap-2 border-white/10 hover:bg-white/5">
          <Eraser className="w-4 h-4" /> Clear
        </Button>
      </div>

      <Card className="flex-1 bg-black/60 border-white/10 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden relative font-mono text-sm">
        <div className="h-10 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2 justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-amber-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            <div className="ml-4 text-xs text-muted-foreground flex items-center gap-2">
              <TerminalIcon className="w-3 h-3" />
              root@aaemu-server:~
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-3 h-3 text-muted-foreground" />
            <select
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              className="bg-black/40 border border-white/10 rounded px-2 py-0.5 text-xs text-foreground w-52 focus:outline-none focus:border-primary/50 font-mono appearance-none cursor-pointer"
            >
              <option value="">Select character...</option>
              {charList.map((char: any, i: number) => {
                const name = getCharName(char);
                return (
                  <option key={i} value={name}>{name}</option>
                );
              })}
            </select>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 p-4 overflow-y-auto space-y-2 scroll-smooth"
        >
          {logs.map((log) => (
            <div key={log.id} className="animate-in fade-in slide-in-from-left-2 duration-200">
              <div className="flex gap-2">
                <span className="text-muted-foreground shrink-0 select-none">
                  [{log.timestamp.toLocaleTimeString([], { hour12: false })}]
                </span>
                
                {log.type === "command" && (
                  <div className="flex gap-2 items-center text-primary font-bold">
                    <ChevronRight className="w-3 h-3" />
                    <span>{log.content}</span>
                  </div>
                )}
                
                {log.type === "response" && (
                  <div className="whitespace-pre-wrap text-green-400/90 pl-5">
                    {log.content}
                  </div>
                )}

                {log.type === "error" && (
                  <div className="whitespace-pre-wrap text-red-400 pl-5">
                    Error: {log.content}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isPending && (
            <div className="flex items-center gap-2 text-muted-foreground pl-20 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Processing...
            </div>
          )}
        </div>

        <div className="p-4 bg-white/5 border-t border-white/10">
          <form onSubmit={handleSend} className="relative flex items-center gap-2">
            <ChevronRight className="w-5 h-5 text-primary absolute left-3 animate-pulse" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={serverId ? "Enter command..." : "Select a server first..."}
              disabled={!serverId || isPending}
              className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-12 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono disabled:opacity-50"
              autoComplete="off"
            />
            <Button 
              size="icon" 
              type="submit" 
              disabled={!input.trim() || isPending || !serverId}
              className="absolute right-1 w-10 h-10 bg-transparent hover:bg-white/10 text-primary disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
