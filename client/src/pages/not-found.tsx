import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20 shadow-[0_0_30px_-10px_rgba(239,68,68,0.5)]">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-display font-bold text-white">404</h1>
          <p className="text-muted-foreground font-mono uppercase tracking-widest">
            Resource Not Found
          </p>
        </div>

        <Link href="/">
          <Button variant="outline" className="mt-4 border-white/10 hover:bg-white/5 gap-2">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
