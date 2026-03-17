import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { RightRail } from "@/components/right-rail";
import { Toaster } from "@/components/ui/sonner";
import { HelpProvider } from "@/components/help-context";
// import { HelpAssistant } from "@/components/help-assistant"; // Removed: AI assistant now accessible from right rail Actions
// Footer removed — user profile + branding moved to sidebar
import { InboxNotifications } from "@/components/inbox-notifications";
import { PageTransition } from "@/components/page-transition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ListBlitz — AI-Powered Cross-Platform Listing Tool",
  description:
    "List once, sell everywhere. AI-optimized listings for Depop, Grailed, Poshmark, Mercari, eBay, Vinted, Facebook Marketplace, and Vestiaire Collective.",
};

/* Inline scripts executed before React hydrates to prevent flash */

const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('theme');
    var dark = theme === 'dark' ||
      (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch(e) {}
})();
`;

const layoutScript = `
(function() {
  try {
    var layout = localStorage.getItem('listblitz-layout');
    if (layout && ['default','ios','material','flat','neumorphism','glassmorphism','skeuomorphism'].indexOf(layout) !== -1) {
      document.documentElement.setAttribute('data-layout', layout);
    }
  } catch(e) {}
})();
`;

/**
 * Boot screen — renders as raw HTML before React mounts so there is
 * NEVER a blank page. Pages dismiss it via `window.dispatchEvent(new Event('app:ready'))`.
 * Fallback: auto-dismiss after 6 seconds.
 */
const bootScreenStyle = `
#boot-screen {
  position:fixed;inset:0;z-index:99999;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:var(--background, #f2f2f7);
  transition:opacity .4s ease,visibility .4s ease;
}
.dark #boot-screen { background: var(--background, #000000); }
#boot-screen.hidden{opacity:0;visibility:hidden;pointer-events:none}
#boot-screen .spinner{
  width:28px;height:28px;border:3px solid var(--border, #e5e5ea);
  border-top-color:var(--primary, #007aff);border-radius:50%;
  animation:bspin .8s linear infinite;
}
@keyframes bspin{to{transform:rotate(360deg)}}
#boot-screen .label{
  margin-top:12px;font-size:13px;font-weight:600;
  color:var(--muted-foreground, #8e8e93);font-family:system-ui,sans-serif;
}
#boot-screen .progress-track{
  margin-top:16px;width:192px;height:3px;border-radius:9999px;
  background:var(--muted, #e5e5ea);overflow:hidden;
}
#boot-screen .progress-bar{
  height:100%;width:40%;border-radius:inherit;
  background:linear-gradient(to right,var(--primary, #007aff),color-mix(in srgb, var(--primary, #007aff) 60%, #5856d6));
  animation:bslide 1.2s ease-in-out infinite;
}
@keyframes bslide{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}
`;

const bootDismissScript = `
(function(){
  function hide(){
    var el=document.getElementById('boot-screen');
    if(el){el.classList.add('hidden');setTimeout(function(){el.remove()},500)}
  }
  window.addEventListener('app:ready',hide);
  setTimeout(hide,6000);
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: layoutScript }} />
        <style dangerouslySetInnerHTML={{ __html: bootScreenStyle }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen font-sans`}
        suppressHydrationWarning
      >
        {/* Boot screen — raw HTML so React never hydrates it */}
        <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `
          <div id="boot-screen">
            <img src="/logo-icon.svg" alt="" width="48" height="48" style="margin-bottom:8px" />
            <div class="spinner"></div>
            <div class="label">Loading…</div>
            <div class="progress-track"><div class="progress-bar"></div></div>
          </div>
          <script>${bootDismissScript}</script>
        ` }} />
        <HelpProvider>
          <div className="flex min-h-screen">
            {/* Left rail — navigation + user profile + branding */}
            <Sidebar />
            {/* Center workspace — hero area */}
            <div className="flex flex-1 flex-col overflow-x-hidden">
              <main className="flex-1">
                <PageTransition>
                  <div className="w-full px-4 pb-10 pt-16 sm:px-6 sm:pt-16 md:pt-10 lg:px-8 lg:pt-6 xl:px-10 2xl:px-12 2xl:pb-12">
                    {children}
                  </div>
                </PageTransition>
              </main>
            </div>
            {/* Right rail — live ops telemetry */}
            <RightRail />
          </div>
          {/* HelpAssistant removed — AI assistant will be accessible from right rail Actions */}
          <InboxNotifications />
          <Toaster position="bottom-right" richColors />
        </HelpProvider>
      </body>
    </html>
  );
}
