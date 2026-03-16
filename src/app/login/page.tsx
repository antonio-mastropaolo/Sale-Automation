"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Mail, Lock, Rocket } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      toast.success(`Welcome back, ${data.user.username}!`);

      if (!data.user.onboarded) {
        window.location.href = "/onboard";
      } else {
        window.location.href = "/";
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-[#0b1026]">
        <img
          src="/login-bg.png"
          alt="ListBlitz"
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>

      {/* Right login panel — dark sleek style */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: "linear-gradient(160deg, #1a1f2e 0%, #141824 40%, #0f1219 100%)" }}>
        <div className="w-full max-w-xs">
          {/* Logo + heading */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Rocket className="h-6 w-6 text-[#5b9bd5]" />
              <span className="text-xl font-bold text-white tracking-tight">ListBlitz.io</span>
            </div>
            <p className="text-sm text-[#8899aa]">Access your dashboard</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5b9bd5]" />
              <input
                type="email"
                placeholder="demo@listblitz.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-[#0d1117] border border-[#2a3444] text-white text-sm placeholder:text-[#4a5568] focus:border-[#5b9bd5] focus:ring-1 focus:ring-[#5b9bd5]/30 outline-none transition-colors"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5b9bd5]" />
              <input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-[#0d1117] border border-[#2a3444] text-white text-sm placeholder:text-[#4a5568] focus:border-[#5b9bd5] focus:ring-1 focus:ring-[#5b9bd5]/30 outline-none transition-colors"
              />
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #3a7bd5 0%, #2b6cb0 50%, #1a5a9e 100%)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Log In"
              )}
            </button>
          </form>

          {/* Forgot password */}
          <div className="mt-5 text-center">
            <Link href="/forgot-password" className="text-xs text-[#5b9bd5] hover:text-[#7bb5e8] transition-colors">
              Forgot password?
            </Link>
          </div>

          {/* Sign up */}
          <div className="mt-6 text-center text-xs text-[#4a5568]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#5b9bd5] font-medium hover:text-[#7bb5e8] transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
