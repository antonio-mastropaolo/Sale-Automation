"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => { window.dispatchEvent(new Event("app:ready")); }, []);
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
        setLoading(false);
        return;
      }

      // Redirect immediately — the boot screen handles the loading experience
      setLoading(false);
      if (!data.user.onboarded) {
        window.location.href = "/onboard";
      } else {
        window.location.href = "/";
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

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
          {/* Logo */}
          <div className="mb-8 animate-fade-up">
            <img src="/logo-icon.svg" alt="" className="h-14 w-14 mx-auto mb-4 drop-shadow-[0_0_24px_rgba(59,130,246,0.3)]" />
          </div>

          {/* Tagline */}
          <h2 className="text-4xl font-bold text-white tracking-tight mb-4 animate-fade-up">
            List once.
            <br />
            <span className="bg-gradient-to-r from-[#3b82f6] via-[#8b5cf6] to-[#f97316] bg-clip-text text-transparent">
              Sell everywhere.
            </span>
          </h2>
          <p className="text-[#6b7a8d] text-base leading-relaxed mb-10 animate-fade-up-delay">
            AI-powered cross-listing to 8 marketplaces — in seconds.
          </p>

          {/* Platform icons grid */}
          <div className="grid grid-cols-4 gap-3 max-w-xs mx-auto mb-10 animate-fade-up-delay-2">
            {[
              { name: "Depop", color: "#FF2300", icon: "/platforms/depop.svg" },
              { name: "Grailed", color: "#333333", icon: "/platforms/grailed.svg" },
              { name: "Poshmark", color: "#7B2D8E", icon: "/platforms/poshmark.svg" },
              { name: "Mercari", color: "#4DC4FF", icon: "/platforms/mercari.svg" },
              { name: "eBay", color: "#E53238", icon: "/platforms/ebay.svg" },
              { name: "Vinted", color: "#09B1BA", icon: "/platforms/vinted.svg" },
              { name: "Facebook", color: "#1877F2", icon: "/platforms/facebook.svg" },
              { name: "Vestiaire", color: "#C9A96E", icon: "/platforms/vestiaire.svg" },
            ].map((p, i) => (
              <div key={p.name} className="group animate-badge-pop" style={{ animationDelay: `${1 + i * 0.08}s` }}>
                <div className="relative mx-auto w-14 h-14 rounded-2xl flex items-center justify-center border border-white/[0.03] bg-white/[0.02] transition-all duration-300 group-hover:scale-110 group-hover:border-white/[0.06]">
                  <img src={p.icon} alt={p.name} className="h-7 w-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.innerHTML = `<span style="color:${p.color};font-weight:700;font-size:16px">${p.name[0]}</span>`; }} />
                </div>
                <p className="text-[10px] text-white/70 mt-1.5 font-medium">{p.name}</p>
              </div>
            ))}
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-4 animate-fade-up-delay-2">
            {[
              { value: "8", label: "Platforms", sub: "Connected" },
              { value: "<10s", label: "Per Listing", sub: "AI Speed" },
              { value: "20+", label: "Design Themes", sub: "Customizable" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
                <p className="text-[10px] text-white/25 uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Feature list */}
          <div className="mt-8 flex flex-wrap justify-center gap-2 animate-fade-up-delay-2">
            {["AI Vision", "Smart Repricer", "Photo Studio", "Cross-Market Search", "Shipping Hub", "Pipeline"].map((f) => (
              <span key={f} className="px-2.5 py-1 rounded-full text-[10px] font-medium border border-white/[0.06] text-white/30 bg-white/[0.02]">
                {f}
              </span>
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
              <img src="/logo-icon.svg" alt="ListBlitz" className="h-8 w-8 drop-shadow-[0_0_8px_rgba(91,155,213,0.4)]" />
              <span className="text-2xl font-bold tracking-tight">
                <span className="text-[#f1f5f9]">List</span><span className="text-[#60a5fa]">Blitz</span><span className="text-[#64748b]">.io</span>
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
