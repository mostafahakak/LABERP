"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  if (!loading && user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-6 relative">
      <ThemeToggle className="absolute top-4 right-4 text-secondary-foreground/70 hover:text-secondary-foreground" />
      <Card className="w-full max-w-md border-border/30 shadow-2xl">
        <CardHeader className="flex flex-col items-center pb-2">
          <div className="w-28 h-28 rounded-2xl bg-primary/10 p-3 flex items-center justify-center mb-2">
            <Image
              src="/logo.png"
              alt="360 Lab ERP"
              width={88}
              height={88}
              className="object-contain"
              loading="eager"
            />
          </div>
          <h1 className="text-xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">Sign in to 360 Dental Solutions</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@clinic.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
