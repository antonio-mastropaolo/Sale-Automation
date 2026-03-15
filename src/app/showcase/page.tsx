"use client";

import Link from "next/link";
import {
  FadeInUp,
  StaggerContainer,
  StaggerItem,
  CountUp,
  GlowCard,
  ScaleOnHover,
  motion,
} from "@/components/motion";

/* ─────────────────────────── Data ─────────────────────────── */

const heroStats = [
  { label: "AI-Powered Features", value: "15+" },
  { label: "Marketplaces", value: "4" },
  { label: "Platform", value: "1" },
];

const painPoints = [
  {
    stat: "3-5 hrs/day",
    text: "Resellers waste 3-5 hours/day copying listings across platforms",
  },
  {
    stat: "15-25%",
    text: "Manual pricing leads to 15-25% revenue loss",
  },
  {
    stat: "40%",
    text: "Inconsistent descriptions reduce visibility by 40%",
  },
  {
    stat: "Lost sales",
    text: "No centralized inventory tracking = lost sales",
  },
];

const features = [
  {
    emoji: "\u{1F9E0}",
    title: "AI Smart Lister",
    desc: "Photo to listing in 10 seconds",
  },
  {
    emoji: "\u{1F310}",
    title: "Cross-Platform Optimization",
    desc: "AI rewrites for each marketplace's audience",
  },
  {
    emoji: "\u{1F680}",
    title: "One-Click Publishing",
    desc: "Publish to Depop, Grailed, Poshmark, Mercari simultaneously",
  },
  {
    emoji: "\u{1F4B0}",
    title: "Price Intelligence",
    desc: "AI market analysis with sell-through predictions",
  },
  {
    emoji: "\u{1F4C8}",
    title: "Bulk Repricing",
    desc: "Optimize entire inventory pricing at once",
  },
  {
    emoji: "\u{1F916}",
    title: "Negotiation Copilot",
    desc: "AI-drafted buyer responses with strategy",
  },
  {
    emoji: "\u{1F3AF}",
    title: "Listing Health Score",
    desc: "AI grades your listings with improvement tips",
  },
  {
    emoji: "\u{1F4CA}",
    title: "Market Trends",
    desc: "Real-time trend reports and sleeper picks",
  },
  {
    emoji: "\u{1F50D}",
    title: "Competitor Analysis",
    desc: "AI-powered competitive intelligence",
  },
  {
    emoji: "\u{1F4CB}",
    title: "Inventory & P&L",
    desc: "Full revenue/profit/COGS tracking",
  },
  {
    emoji: "\u{1F4E5}",
    title: "Bulk CSV Import",
    desc: "Import hundreds of listings in seconds",
  },
  {
    emoji: "\u{1F4DD}",
    title: "Template System",
    desc: "Save & reuse listing templates",
  },
  {
    emoji: "\u{1F4E6}",
    title: "Shipping Calculator",
    desc: "Compare carriers, calculate net profit",
  },
  {
    emoji: "\u{1F4C5}",
    title: "Post Scheduler",
    desc: "Schedule listings for optimal times",
  },
  {
    emoji: "\u{2728}",
    title: "Prompt Studio",
    desc: "Customize every AI prompt to your style",
  },
  {
    emoji: "\u{1F50C}",
    title: "Multi-Provider AI",
    desc: "Use OpenAI, Gemini, Groq, or any provider",
  },
  {
    emoji: "\u{1F4BE}",
    title: "Export & Reports",
    desc: "CSV export for accounting",
  },
  {
    emoji: "\u{1F6E0}\uFE0F",
    title: "Seller Tools",
    desc: "Profit calculator, hashtag generator, description writer",
  },
];

const steps = [
  {
    num: "01",
    emoji: "\u{1F4F8}",
    title: "Snap or Enter",
    desc: "Snap a photo or enter details about your item",
  },
  {
    num: "02",
    emoji: "\u{2728}",
    title: "AI Optimizes",
    desc: "AI optimizes title, description, and pricing for all 4 platforms",
  },
  {
    num: "03",
    emoji: "\u{1F4E3}",
    title: "Publish & Track",
    desc: "Publish everywhere and track sales from one dashboard",
  },
];

const impactStats = [
  { value: 68, suffix: "%", label: "Faster listing creation" },
  { value: 23, suffix: "%", label: "Higher sell-through rate" },
  { value: 3.2, suffix: "x", label: "More daily listings", decimals: true },
  {
    value: 2400,
    prefix: "$",
    suffix: "/mo",
    label: "Average revenue increase",
  },
];

const techPoints = [
  {
    emoji: "\u{26A1}",
    title: "Next.js 16 + React 19",
    desc: "Cutting-edge performance and developer experience",
  },
  {
    emoji: "\u{1F9E0}",
    title: "AI-Powered",
    desc: "GPT-4o, Gemini, or your own provider",
  },
  {
    emoji: "\u{1F4BB}",
    title: "Local-First",
    desc: "Your data stays on your machine",
  },
  {
    emoji: "\u{1F512}",
    title: "Encrypted Credentials",
    desc: "AES-256-GCM encryption for all secrets",
  },
  {
    emoji: "\u{1F527}",
    title: "Open & Customizable",
    desc: "Edit every AI prompt to match your style",
  },
  {
    emoji: "\u{1F3A8}",
    title: "Beautiful UI",
    desc: "Dark mode, animations, fully responsive",
  },
];

const pricingTiers = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    desc: "Get started with the basics",
    features: [
      "10 listings/month",
      "1 platform",
      "Basic AI descriptions",
      "Community support",
    ],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    desc: "For serious resellers",
    features: [
      "Unlimited listings",
      "All 4 platforms",
      "Full AI feature suite",
      "Bulk repricing",
      "Priority support",
    ],
    cta: "Go Pro",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$79",
    period: "/mo",
    desc: "Scale your operation",
    features: [
      "Everything in Pro",
      "Bulk CSV import",
      "API access",
      "Advanced analytics",
      "Priority support",
    ],
    cta: "Get Business",
    highlighted: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "White-label solutions",
    features: [
      "Everything in Business",
      "White-label branding",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

/* ─────────────────────── Section Wrapper ─────────────────────── */

function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`py-20 sm:py-28 ${className}`}
    >
      {children}
    </motion.section>
  );
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
  light = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  light?: boolean;
}) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20 px-4">
      {eyebrow && (
        <span
          className={`inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-3 ${
            light
              ? "text-emerald-300/80"
              : "text-[oklch(0.36_0.10_155)]"
          }`}
        >
          {eyebrow}
        </span>
      )}
      <h2
        className={`text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight ${
          light ? "text-white" : "text-[oklch(0.18_0.04_155)]"
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-4 text-base sm:text-lg leading-relaxed ${
            light
              ? "text-emerald-100/70"
              : "text-[oklch(0.45_0.02_155)]"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────── Page Component ─────────────────────── */

export default function ShowcasePage() {
  return (
    <div className="-mx-4 sm:-mx-5 lg:-mx-10 -mt-20 sm:-mt-24">
      {/* ───────── HERO ───────── */}
      <section
        className="relative overflow-hidden px-4 sm:px-8 pt-28 sm:pt-36 pb-20 sm:pb-28"
        style={{
          background:
            "linear-gradient(145deg, oklch(0.28 0.07 155), oklch(0.33 0.09 155), oklch(0.36 0.10 155))",
        }}
      >
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Radial glow */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, oklch(0.55 0.15 155), transparent 70%)",
          }}
        />

        <div className="relative max-w-5xl mx-auto text-center">
          <FadeInUp>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-emerald-200 backdrop-blur-sm border border-white/10 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Now in Public Beta
            </span>
          </FadeInUp>

          <FadeInUp delay={0.05}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.08]">
              CrossList
              <span className="block mt-1 sm:mt-2 bg-gradient-to-r from-emerald-300 to-green-200 bg-clip-text text-transparent">
                The AI-Powered Sales
              </span>
              <span className="block mt-1 sm:mt-2 bg-gradient-to-r from-green-200 to-emerald-400 bg-clip-text text-transparent">
                Automation Hub
              </span>
            </h1>
          </FadeInUp>

          <FadeInUp delay={0.1}>
            <p className="mt-6 text-lg sm:text-xl text-emerald-100/80 max-w-2xl mx-auto leading-relaxed">
              List once, sell everywhere. Automate your entire reselling
              business with AI that writes, prices, and publishes for you.
            </p>
          </FadeInUp>

          <FadeInUp delay={0.15}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[oklch(0.28_0.07_155)] font-semibold px-8 py-3.5 text-sm shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                Start Free
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 text-white font-medium px-8 py-3.5 text-sm backdrop-blur-sm border border-white/15 hover:bg-white/15 transition-colors"
              >
                See Features
              </Link>
            </div>
          </FadeInUp>

          {/* Stats row */}
          <FadeInUp delay={0.2}>
            <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
              {heroStats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs sm:text-sm text-emerald-200/60">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* ───────── THE PROBLEM ───────── */}
      <Section className="bg-[oklch(0.97_0.003_155)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <SectionTitle
            eyebrow="The Problem"
            title="Reselling Is Broken"
            subtitle="Manual workflows are killing your margins and burning you out."
          />

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            {painPoints.map((p) => (
              <StaggerItem key={p.stat}>
                <GlowCard className="h-full">
                  <div className="rounded-2xl border border-[oklch(0.90_0.01_155)] bg-white p-6 sm:p-8 h-full sf-shadow">
                    <div className="text-2xl sm:text-3xl font-bold text-[oklch(0.50_0.20_20)] mb-2">
                      {p.stat}
                    </div>
                    <p className="text-sm sm:text-base text-[oklch(0.45_0.02_155)] leading-relaxed">
                      {p.text}
                    </p>
                  </div>
                </GlowCard>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </Section>

      {/* ───────── FEATURE GRID ───────── */}
      <Section className="bg-white" id="features">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <SectionTitle
            eyebrow="The Solution"
            title="Everything You Need to Sell Smarter"
            subtitle="18 powerful features designed to automate every part of your reselling workflow."
          />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.04, delayChildren: 0.1 },
              },
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={{
                  hidden: { opacity: 0, y: 18, scale: 0.97 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 300,
                      damping: 24,
                    },
                  },
                }}
              >
                <ScaleOnHover className="h-full">
                  <div className="rounded-2xl border border-[oklch(0.92_0.005_155)] bg-[oklch(0.98_0.003_155)] p-5 sm:p-6 h-full hover:border-[oklch(0.80_0.04_155)] transition-colors">
                    <span className="text-2xl sm:text-3xl block mb-3">
                      {f.emoji}
                    </span>
                    <h3 className="font-semibold text-[oklch(0.20_0.04_155)] text-sm sm:text-base">
                      {f.title}
                    </h3>
                    <p className="mt-1 text-sm text-[oklch(0.50_0.02_155)] leading-relaxed">
                      {f.desc}
                    </p>
                  </div>
                </ScaleOnHover>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ───────── HOW IT WORKS ───────── */}
      <Section className="bg-[oklch(0.97_0.003_155)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
          <SectionTitle
            eyebrow="How It Works"
            title="Three Steps to Automated Selling"
            subtitle="From photo to published listing in under a minute."
          />

          <div className="relative">
            {/* Connecting line (desktop) */}
            <div className="hidden sm:block absolute top-16 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-[oklch(0.36_0.10_155)] to-transparent opacity-30" />

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
              {steps.map((s, i) => (
                <StaggerItem key={s.num}>
                  <div className="text-center relative">
                    {/* Step number badge */}
                    <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[oklch(0.32_0.09_155)] to-[oklch(0.36_0.10_155)] text-white text-xl sm:text-2xl mb-5 shadow-lg relative z-10">
                      {s.emoji}
                    </div>
                    <div className="text-[10px] font-bold text-[oklch(0.36_0.10_155)] tracking-[0.2em] uppercase mb-2">
                      Step {s.num}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-[oklch(0.18_0.04_155)] mb-2">
                      {s.title}
                    </h3>
                    <p className="text-sm text-[oklch(0.50_0.02_155)] leading-relaxed max-w-xs mx-auto">
                      {s.desc}
                    </p>
                    {/* Arrow (between steps on mobile) */}
                    {i < steps.length - 1 && (
                      <div className="sm:hidden flex justify-center py-4 text-[oklch(0.36_0.10_155)] opacity-40 text-2xl">
                        &#x2193;
                      </div>
                    )}
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </Section>

      {/* ───────── REVENUE IMPACT ───────── */}
      <Section
        className="text-white"
        id="impact"
      >
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(160deg, oklch(0.28 0.07 155), oklch(0.32 0.09 155), oklch(0.36 0.10 155))",
          }}
        />
        <div
          className="max-w-5xl mx-auto px-4 sm:px-8 relative"
          style={{ position: "relative" }}
        >
          {/* We need the gradient background on this section, using a wrapper */}
          <div
            className="absolute -inset-x-[9999px] inset-y-0 -z-10"
            style={{
              background:
                "linear-gradient(160deg, oklch(0.28 0.07 155), oklch(0.32 0.09 155), oklch(0.36 0.10 155))",
            }}
          />

          <SectionTitle
            eyebrow="Revenue Impact"
            title="Results That Speak for Themselves"
            subtitle="Resellers using CrossList report transformative improvements across their business."
            light
          />

          <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {impactStats.map((s) => (
              <StaggerItem key={s.label}>
                <div className="text-center rounded-2xl bg-white/[0.07] backdrop-blur-sm border border-white/10 p-6 sm:p-8">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-2">
                    {s.prefix || ""}
                    <CountUp
                      value={s.value}
                      suffix={s.suffix || ""}
                      duration={1.5}
                    />
                  </div>
                  <p className="text-sm text-emerald-200/70">{s.label}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="text-center mt-8 text-xs text-emerald-300/40"
          >
            * Projected / illustrative figures based on early user data
          </motion.p>
        </div>
      </Section>

      {/* ───────── TECH STACK ───────── */}
      <Section className="bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <SectionTitle
            eyebrow="Under the Hood"
            title="Built on Modern Technology"
            subtitle="A best-in-class tech stack designed for speed, security, and extensibility."
          />

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {techPoints.map((t) => (
              <StaggerItem key={t.title}>
                <GlowCard className="h-full">
                  <div className="rounded-2xl border border-[oklch(0.92_0.005_155)] bg-[oklch(0.98_0.003_155)] p-6 sm:p-8 h-full">
                    <span className="text-2xl block mb-3">{t.emoji}</span>
                    <h3 className="font-semibold text-[oklch(0.20_0.04_155)] mb-1">
                      {t.title}
                    </h3>
                    <p className="text-sm text-[oklch(0.50_0.02_155)] leading-relaxed">
                      {t.desc}
                    </p>
                  </div>
                </GlowCard>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </Section>

      {/* ───────── PRICING ───────── */}
      <Section className="bg-[oklch(0.97_0.003_155)]" id="pricing">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <SectionTitle
            eyebrow="Pricing"
            title="Simple, Transparent Pricing"
            subtitle="Start free and scale as you grow. No hidden fees, cancel anytime."
          />

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {pricingTiers.map((tier) => (
              <StaggerItem key={tier.name}>
                <GlowCard className="h-full">
                  <div
                    className={`rounded-2xl border p-6 sm:p-8 h-full flex flex-col ${
                      tier.highlighted
                        ? "border-[oklch(0.36_0.10_155)] bg-gradient-to-b from-[oklch(0.36_0.10_155)] to-[oklch(0.30_0.08_155)] text-white shadow-xl shadow-[oklch(0.36_0.10_155)]/20 relative"
                        : "border-[oklch(0.92_0.005_155)] bg-white"
                    }`}
                  >
                    {tier.highlighted && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-400 text-[oklch(0.15_0.04_155)] text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    )}
                    <div className="mb-4">
                      <h3
                        className={`text-lg font-bold ${
                          tier.highlighted
                            ? "text-white"
                            : "text-[oklch(0.20_0.04_155)]"
                        }`}
                      >
                        {tier.name}
                      </h3>
                      <p
                        className={`text-xs mt-0.5 ${
                          tier.highlighted
                            ? "text-emerald-200/70"
                            : "text-[oklch(0.50_0.02_155)]"
                        }`}
                      >
                        {tier.desc}
                      </p>
                    </div>
                    <div className="mb-6">
                      <span
                        className={`text-3xl sm:text-4xl font-extrabold ${
                          tier.highlighted
                            ? "text-white"
                            : "text-[oklch(0.20_0.04_155)]"
                        }`}
                      >
                        {tier.price}
                      </span>
                      {tier.period && (
                        <span
                          className={`text-sm ${
                            tier.highlighted
                              ? "text-emerald-200/60"
                              : "text-[oklch(0.50_0.02_155)]"
                          }`}
                        >
                          {tier.period}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-2.5 mb-8 flex-1">
                      {tier.features.map((feat) => (
                        <li
                          key={feat}
                          className={`flex items-start gap-2 text-sm ${
                            tier.highlighted
                              ? "text-emerald-100/80"
                              : "text-[oklch(0.45_0.02_155)]"
                          }`}
                        >
                          <span
                            className={`mt-0.5 text-xs ${
                              tier.highlighted
                                ? "text-emerald-300"
                                : "text-[oklch(0.36_0.10_155)]"
                            }`}
                          >
                            &#x2713;
                          </span>
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/"
                      className={`block text-center rounded-xl font-semibold py-3 text-sm transition-all hover:-translate-y-0.5 ${
                        tier.highlighted
                          ? "bg-white text-[oklch(0.28_0.07_155)] hover:shadow-lg"
                          : "bg-[oklch(0.36_0.10_155)] text-white hover:bg-[oklch(0.32_0.09_155)] hover:shadow-lg"
                      }`}
                    >
                      {tier.cta}
                    </Link>
                  </div>
                </GlowCard>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </Section>

      {/* ───────── CTA ───────── */}
      <section
        className="relative overflow-hidden py-24 sm:py-32 px-4 sm:px-8"
        style={{
          background:
            "linear-gradient(145deg, oklch(0.28 0.07 155), oklch(0.33 0.09 155), oklch(0.36 0.10 155))",
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, oklch(0.60 0.15 155), transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, oklch(0.55 0.15 155), transparent 70%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Ready to automate your
            <span className="block mt-1 bg-gradient-to-r from-emerald-300 to-green-200 bg-clip-text text-transparent">
              reselling business?
            </span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-emerald-100/70 max-w-xl mx-auto leading-relaxed">
            Join thousands of resellers who are listing faster, pricing
            smarter, and selling more with CrossList.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[oklch(0.28_0.07_155)] font-semibold px-10 py-4 text-base shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              Start Free
              <span aria-hidden="true">&rarr;</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 text-white font-medium px-10 py-4 text-base backdrop-blur-sm border border-white/15 hover:bg-white/15 transition-colors"
            >
              View Demo
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer className="bg-[oklch(0.16_0.03_155)] py-10 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-emerald-200/40">
          <span>&copy; {new Date().getFullYear()} CrossList. All rights reserved.</span>
          <span>
            Built with Next.js, React, and a lot of{" "}
            <span className="text-emerald-400/60">&#x2665;</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
