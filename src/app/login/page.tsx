"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, Eye, EyeOff, Lock, AlertCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function LoginPage() {
  const { login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) return;
    
    setIsSubmitting(true);
    try {
      await login(email, password);
      // Wait indefinitely to keep the loading visual active during router transition
      await new Promise(() => {});
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
      setIsSubmitting(false); // Only reset on error so user can retry
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-secondary/5">
      <div className="w-full max-w-[400px] space-y-6 animate-in fade-in duration-700">
        
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-section-title uppercase tracking-[0.2em] text-text-muted font-bold">Institutional Portal</h1>
            <p className="text-caption mt-1 font-semibold text-text-muted/60 uppercase tracking-widest">Onscreen Evaluation System</p>
          </div>
        </div>

        <Card className="border-border/50 shadow-premium overflow-hidden">
          <CardHeader className="space-y-1 pb-5 border-b border-border/10 bg-secondary/10">
            <CardTitle className="text-section-title">Sign in</CardTitle>
            <CardDescription className="text-caption font-medium">
              Authenticate to access the administrative workstation.
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 px-8 pt-6">
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-label-text">Email address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@institution.edu" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary/20"
                  required
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-label-text">Password</Label>
                  <button 
                    type="button" 
                    className="text-[11px] font-bold text-primary hover:underline transition-all"
                    onClick={() => toast.info("Contact coordination for password recovery")}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-secondary/20 pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1 w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-secondary/50 rounded transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error Area - No fixed min-height to avoid dead space */}
              <div className="mt-2">
                {error && (
                  <div className="flex items-center gap-2.5 p-3 rounded bg-destructive/5 border border-destructive/10 text-destructive animate-in fade-in duration-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p className="text-[11px] font-bold leading-tight">{error}</p>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="px-8 pb-8 pt-0">
              <Button 
                type="submit" 
                className="w-full font-bold h-11" 
                disabled={isSubmitting || authLoading || !email || !password}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Secure Sign In
                  </div>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
