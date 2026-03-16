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
      {/* Left panel — fashion image with overlay */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background image — high-quality fashion/reselling */}
        <img
          src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&q=80&auto=format"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(10,14,26,0.92) 0%, rgba(10,14,26,0.75) 40%, rgba(10,14,26,0.88) 100%)" }} />

        {/* Animated orbs on top of image */}
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] animate-orb-1" style={{ background: "radial-gradient(circle, #3a7bd5, transparent 70%)", top: "10%", left: "10%" }} />
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-10 blur-[100px] animate-orb-2" style={{ background: "radial-gradient(circle, #f97316, transparent 70%)", bottom: "10%", right: "5%" }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          {/* Top: logo */}
          <div>
            <img src="/logo-full.png" alt="ListBlitz" className="h-8 object-contain" />
          </div>

          {/* Center: tagline */}
          <div className="max-w-md">
            <h2 className="text-5xl font-bold text-white tracking-tight leading-[1.1] mb-5 animate-fade-up">
              List once.
              <br />
              <span className="bg-gradient-to-r from-[#5b9bd5] via-[#7bb5e8] to-[#f59e0b] bg-clip-text text-transparent">
                Sell everywhere.
              </span>
            </h2>
            <p className="text-[#94a3b8] text-base leading-relaxed mb-8 animate-fade-up-delay">
              AI-powered cross-listing to 8 marketplaces in seconds. Photograph, optimize, publish — all on autopilot.
            </p>

            {/* Platform logos row */}
            <div className="flex flex-wrap gap-2 mb-8 animate-fade-up-delay-2">
              {["Depop", "Grailed", "Poshmark", "Mercari", "eBay", "Vinted", "FB", "Vestiaire"].map((p, i) => (
                <span key={p} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/70 animate-badge-pop" style={{
                  animationDelay: `${0.8 + i * 0.08}s`,
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(10px)",
                }}>
                  {p}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div className="flex gap-8 animate-fade-up-delay-2">
              {[
                { value: "8", label: "Platforms" },
                { value: "10s", label: "Per Listing" },
                { value: "300%", label: "More Sales" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-[10px] text-[#64748b] uppercase tracking-widest mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: testimonial */}
          <div className="animate-fade-up-delay-2">
            <div className="flex items-center gap-3 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)" }}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3a7bd5] to-[#f59e0b] flex items-center justify-center text-white font-bold text-sm shrink-0">
                J
              </div>
              <div>
                <p className="text-[13px] text-white/80 italic leading-relaxed">&ldquo;Listed 200 items in one afternoon. Used to take me a full week.&rdquo;</p>
                <p className="text-[11px] text-[#64748b] mt-1">Jordan M. — Full-time reseller</p>
              </div>
            </div>
          </div>
        </div>

        {/* CSS animations */}
        <style>{`
          @keyframes orb1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(40px, -30px); } }
          @keyframes orb2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-30px, 40px); } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes badgePop { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
          .animate-orb-1 { animation: orb1 8s ease-in-out infinite; }
          .animate-orb-2 { animation: orb2 10s ease-in-out infinite; }
          .animate-fade-up { animation: fadeUp 0.8s ease-out both; animation-delay: 0.2s; }
          .animate-fade-up-delay { animation: fadeUp 0.8s ease-out both; animation-delay: 0.5s; }
          .animate-fade-up-delay-2 { animation: fadeUp 0.8s ease-out both; animation-delay: 0.8s; }
          .animate-badge-pop { animation: badgePop 0.4s ease-out both; }
        `}</style>
      </div>

      {/* Right login panel — dark sleek style */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: "linear-gradient(160deg, #1a1f2e 0%, #141824 40%, #0f1219 100%)" }}>
        <div className="w-full max-w-xs">
          {/* Logo + heading */}
          <div className="text-center mb-8">
            <img src="/logo-full.png" alt="ListBlitz.io" className="h-10 object-contain mx-auto mb-3" />
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
