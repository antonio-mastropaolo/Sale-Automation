"use client";

import Link from "next/link";
import { Zap } from "lucide-react";

const platformLinks = [
  { label: "Depop", href: "https://depop.com" },
  { label: "Grailed", href: "https://grailed.com" },
  { label: "Poshmark", href: "https://poshmark.com" },
  { label: "Vinted", href: "https://vinted.com" },
  { label: "Vestiaire", href: "https://vestiairecollective.com" },
  { label: "eBay", href: "https://ebay.com" },
  { label: "Mercari", href: "https://mercari.com" },
];

const productLinks = [
  { label: "Dashboard", href: "/" },
  { label: "Smart Lister", href: "/listings/smart" },
  { label: "Analytics", href: "/analytics" },
  { label: "Trends", href: "/trends" },
  { label: "Inbox", href: "/inbox" },
  { label: "Templates", href: "/templates" },
];

const resourceLinks = [
  { label: "Settings", href: "/settings" },
  { label: "Shipping", href: "/shipping" },
  { label: "Inventory & P/L", href: "/inventory" },
  { label: "AI Pipeline", href: "/workflow" },
];

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border">
      <div className="py-8 px-2">
        {/* Top section: columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "var(--primary)" }}>
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-bold">ListBlitz</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
              AI-powered cross-platform listing tool. List once, sell everywhere.
            </p>
            <div className="flex items-center gap-1.5 mt-3">
              {["Depop", "Grailed", "Poshmark", "Vinted", "VC", "eBay", "M", "FB"].map((p) => (
                <span key={p} className="text-[8px] font-bold bg-muted px-1.5 py-0.5 rounded">{p}</span>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Product</h4>
            <ul className="space-y-1.5">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Resources</h4>
            <ul className="space-y-1.5">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platforms */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Platforms</h4>
            <ul className="space-y-1.5">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            &copy; {new Date().getFullYear()} ListBlitz. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-muted-foreground/60">8 platforms &middot; 22 API endpoints &middot; AI-optimized</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
