"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Mail, Lock, Rocket } from "lucide-react";

const FUN_FACTS = [
  "The average reseller manages listings on 3.4 platforms simultaneously",
  "Cross-listing can increase sell-through rate by up to 300%",
  "AI-optimized descriptions get 47% more views than manual ones",
  "The best time to list on Depop is between 6-9 PM on Sundays",
  "Vintage Levi's 501s are the #1 resold item worldwide",
  "Resellers who use pricing tools earn 28% more per item",
  "The global secondhand market is projected to reach $350B by 2028",
  "Items with 5+ photos sell 2x faster than those with 1-2",
  "Poshmark sellers who share 30+ items/day see 3x more sales",
  "eBay processes over 1.7 billion listings at any given time",
  "The average reseller spends 45 minutes per listing manually",
  "ListBlitz reduces that to under 30 seconds with AI",
  "Gorpcore items have seen a 200% price increase since 2023",
  "Grailed sellers with detailed measurements get 40% fewer returns",
  "The reselling industry employs over 2 million people in the US",
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [factIndex, setFactIndex] = useState(0);
  const [username, setUsername] = useState("");

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
        setLoading(false);
        return;
      }

      // Show transition screen
      setUsername(data.user.username);
      setLoading(false);
      setTransitioning(true);
      setFactIndex(Math.floor(Math.random() * FUN_FACTS.length));

      // Cycle facts then redirect
      const factTimer = setInterval(() => {
        setFactIndex((prev) => (prev + 1) % FUN_FACTS.length);
      }, 2500);

      setTimeout(() => {
        clearInterval(factTimer);
        if (!data.user.onboarded) {
          window.location.href = "/onboard";
        } else {
          window.location.href = "/";
        }
      }, 4000);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // ── Transition screen ──
  if (transitioning) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "linear-gradient(160deg, #0a0e1a 0%, #111827 50%, #0a0e1a 100%)" }}>
        {/* Animated orbs */}
        <div className="absolute w-[600px] h-[600px] rounded-full opacity-15 blur-[150px] animate-orb-1" style={{ background: "radial-gradient(circle, #3a7bd5, transparent 70%)", top: "20%", left: "20%" }} />
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-10 blur-[120px] animate-orb-2" style={{ background: "radial-gradient(circle, #f97316, transparent 70%)", bottom: "20%", right: "20%" }} />

        <div className="relative z-10 text-center max-w-md px-6">
          {/* Logo */}
          <div className="mb-6 animate-float">
            <Rocket className="h-12 w-12 text-[#5b9bd5] mx-auto drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]" />
          </div>

          {/* Welcome */}
          <h1 className="text-2xl font-bold text-white mb-1 animate-fade-up">
            Welcome back, {username}!
          </h1>
          <p className="text-[#5b9bd5] text-sm mb-8 animate-fade-up-delay">Preparing your dashboard...</p>

          {/* Progress bar */}
          <div className="w-64 mx-auto h-1 bg-[#1a2332] rounded-full overflow-hidden mb-8">
            <div className="h-full rounded-full" style={{
              background: "linear-gradient(90deg, #3a7bd5, #5b9bd5, #f97316)",
              animation: "loadProgress 4s ease-in-out forwards",
            }} />
          </div>

          {/* Fun fact */}
          <div className="min-h-[60px] flex items-center justify-center">
            <div key={factIndex} className="animate-fact-in">
              <p className="text-[13px] text-[#6b7a8d] leading-relaxed italic">
                &ldquo;{FUN_FACTS[factIndex]}&rdquo;
              </p>
            </div>
          </div>

          {/* Dots */}
          <div className="mt-6 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#5b9bd5] animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
            ))}
          </div>
        </div>

        <style>{`
          @keyframes loadProgress { 0% { width: 0%; } 100% { width: 100%; } }
          @keyframes factIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes orb1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30px, -20px); } }
          @keyframes orb2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-20px, 30px); } }
          .animate-float { animation: float 3s ease-in-out infinite; }
          .animate-fade-up { animation: fadeUp 0.6s ease-out both; }
          .animate-fade-up-delay { animation: fadeUp 0.6s ease-out both; animation-delay: 0.2s; }
          .animate-fact-in { animation: factIn 0.5s ease-out both; }
          .animate-orb-1 { animation: orb1 8s ease-in-out infinite; }
          .animate-orb-2 { animation: orb2 10s ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex min-h-screen">
      {/* Left branding panel — animated */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0a0e1a] items-center justify-center">
        {/* Animated background */}
        <div className="absolute inset-0">
          {/* Floating orbs */}
          <div className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[120px] animate-orb-1" style={{ background: "radial-gradient(circle, #3a7bd5, transparent 70%)", top: "10%", left: "10%" }} />
          <div className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-[100px] animate-orb-2" style={{ background: "radial-gradient(circle, #f97316, transparent 70%)", bottom: "10%", right: "5%" }} />
          <div className="absolute w-[300px] h-[300px] rounded-full opacity-10 blur-[80px] animate-orb-3" style={{ background: "radial-gradient(circle, #8b5cf6, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />

          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />

          {/* Floating particles */}
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-white/20 animate-particle"
              style={{
                left: `${10 + (i * 4.2) % 80}%`,
                top: `${5 + (i * 7.3) % 90}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + (i % 4)}s`,
              }}
            />
          ))}
        </div>

        {/* Center content */}
        <div className="relative z-10 text-center px-12 max-w-lg">
          {/* Tagline */}
          <h2 className="text-4xl font-bold text-white tracking-tight mb-4 animate-fade-up">
            List once.
            <br />
            <span className="bg-gradient-to-r from-[#3a7bd5] via-[#5b9bd5] to-[#f97316] bg-clip-text text-transparent">
              Sell everywhere.
            </span>
          </h2>
          <p className="text-[#6b7a8d] text-base leading-relaxed animate-fade-up-delay">
            AI-powered cross-listing to Depop, Grailed, Poshmark, Mercari, eBay, Vinted, Facebook &amp; Vestiaire — in seconds.
          </p>

          {/* Animated platform badges */}
          <div className="mt-8 flex flex-wrap justify-center gap-2 animate-fade-up-delay-2">
            {["Depop", "Grailed", "Poshmark", "Mercari", "eBay", "Vinted", "FB", "Vestiaire"].map((p, i) => (
              <span
                key={p}
                className="px-3 py-1 rounded-full text-[11px] font-medium border border-white/10 text-white/50 backdrop-blur-sm animate-badge-pop"
                style={{
                  animationDelay: `${1.2 + i * 0.1}s`,
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                {p}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-3 gap-6 animate-fade-up-delay-2">
            {[
              { value: "8", label: "Platforms" },
              { value: "10s", label: "Per listing" },
              { value: "AI", label: "Powered" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-[11px] text-[#4a5568] uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CSS animations */}
        <style>{`
          @keyframes orb1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(40px, -30px); } }
          @keyframes orb2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-30px, 40px); } }
          @keyframes orb3 { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.2); } }
          @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
          @keyframes particle { 0% { opacity: 0; transform: translateY(0); } 30% { opacity: 0.6; } 100% { opacity: 0; transform: translateY(-60px); } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes badgePop { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
          .animate-orb-1 { animation: orb1 8s ease-in-out infinite; }
          .animate-orb-2 { animation: orb2 10s ease-in-out infinite; }
          .animate-orb-3 { animation: orb3 12s ease-in-out infinite; }
          .animate-float { animation: float 4s ease-in-out infinite; }
          .animate-particle { animation: particle 3s ease-out infinite; }
          .animate-fade-up { animation: fadeUp 0.8s ease-out both; animation-delay: 0.3s; }
          .animate-fade-up-delay { animation: fadeUp 0.8s ease-out both; animation-delay: 0.6s; }
          .animate-fade-up-delay-2 { animation: fadeUp 0.8s ease-out both; animation-delay: 0.9s; }
          .animate-badge-pop { animation: badgePop 0.4s ease-out both; }
        `}</style>
      </div>

      {/* Right login panel — dark sleek style */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: "linear-gradient(160deg, #1a1f2e 0%, #141824 40%, #0f1219 100%)" }}>
        <div className="w-full max-w-xs">
          {/* Logo + heading */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <Rocket className="h-7 w-7 text-[#5b9bd5] drop-shadow-[0_0_8px_rgba(91,155,213,0.4)]" />
              <span className="text-2xl font-bold tracking-tight">
                <span className="text-[#a0aec0]">List</span><span className="text-[#5b9bd5]">Blitz</span><span className="text-[#718096]">.io</span>
              </span>
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
