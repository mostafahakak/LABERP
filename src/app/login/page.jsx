"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { Lock, Mail, ArrowRight, ShieldCheck, BarChart3, Users, Package } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirect);
    }
  }, [loading, user, router, redirect]);

  if (!loading && user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await login(email, password);
      router.replace(redirect);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: BarChart3, title: "Finance Tracking", desc: "Monitor expenses, income & profits" },
    { icon: Users, title: "HR Management", desc: "Employees, clients & payroll" },
    { icon: Package, title: "Inventory Control", desc: "Stock, categories & usage" },
    { icon: ShieldCheck, title: "Workflow Engine", desc: "Cases, phases & delivery" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left branded panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-secondary relative overflow-hidden flex-col justify-between p-10">
        {/* Decorative background shapes */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-primary/5 blur-2xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-primary/4 blur-2xl" />

        {/* Top brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center backdrop-blur-sm border border-primary/10">
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" loading="eager" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-secondary-foreground">360 Lab ERP</h2>
              <p className="text-xs text-secondary-foreground/50">Dental Solutions Platform</p>
            </div>
          </div>
        </div>

        {/* Center hero text */}
        <div className="relative z-10 space-y-6 -mt-8">
          <div>
            <h1 className="text-4xl xl:text-5xl font-bold text-secondary-foreground leading-tight">
              Manage Your
              <br />
              <span className="text-primary">Dental Lab</span>
              <br />
              With Ease
            </h1>
            <p className="mt-4 text-secondary-foreground/60 text-base max-w-md leading-relaxed">
              Streamline workflows, track inventory, manage finances and keep your team in sync — all from one place.
            </p>
          </div>

          {/* Feature pills */}
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {features.map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-3 rounded-xl bg-secondary-foreground/5 border border-secondary-foreground/8 backdrop-blur-sm p-3 transition-colors hover:bg-secondary-foreground/8"
              >
                <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <f.icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-secondary-foreground">{f.title}</p>
                  <p className="text-xs text-secondary-foreground/50 leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <p className="relative z-10 text-xs text-secondary-foreground/30">
          © {new Date().getFullYear()} 360 Dental Solutions. All rights reserved.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col bg-background">
        <div className="flex justify-between items-center p-4 sm:p-6">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <Image src="/logo.png" alt="Logo" width={28} height={28} className="object-contain" />
            <span className="font-bold text-foreground text-sm">360 Lab ERP</span>
          </div>
          <div className="lg:ml-auto" />
          <ThemeToggle className="text-muted-foreground hover:text-foreground" />
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-sm space-y-8">
            {/* Header */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Welcome back</h1>
              <p className="text-muted-foreground text-sm">Enter your credentials to access your workspace</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@clinic.com"
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2.5 border border-destructive/20">
                  <ShieldCheck className="size-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 text-sm font-semibold gap-2"
                size="lg"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Bottom info */}
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground/60">
                Secure access to your dental lab management system
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
