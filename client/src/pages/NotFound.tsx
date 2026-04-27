import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-4">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-neon-coral/10 rounded-full animate-pulse" />
            <AlertCircle className="relative h-16 w-16 text-neon-coral" />
          </div>
        </div>

        <h1 className="font-display text-5xl font-bold text-foreground mb-2">404</h1>
        <h2 className="font-display text-xl font-semibold text-muted-foreground mb-4">
          Page Not Found
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed text-sm">
          Sorry, the page you are looking for doesn't exist.
          <br />
          It may have been moved or deleted.
        </p>

        <Button
          onClick={() => setLocation("/")}
          className="bg-neon-coral hover:bg-neon-coral/90 text-white font-medium px-6"
        >
          <Home className="w-4 h-4 mr-2" />
          Go Home
        </Button>
      </div>
    </div>
  );
}
