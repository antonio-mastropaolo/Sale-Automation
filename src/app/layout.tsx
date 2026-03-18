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
  background:var(--background, #000);
  transition:opacity .5s ease,visibility .5s ease;
  font-family:system-ui,-apple-system,sans-serif;
}
.dark #boot-screen { background: var(--background, #000); }
#boot-screen.hidden{opacity:0;visibility:hidden;pointer-events:none}
#boot-screen .boot-logo{margin-bottom:24px;opacity:0.9}
#boot-screen .boot-title{
  font-size:20px;font-weight:700;letter-spacing:-0.3px;
  color:var(--foreground,#fff);margin-bottom:4px;
}
#boot-screen .boot-sub{
  font-size:12px;font-weight:500;
  color:var(--muted-foreground,#888);margin-bottom:32px;
}
#boot-screen .progress-container{
  width:50%;max-width:480px;min-width:280px;
}
#boot-screen .progress-track{
  width:100%;height:6px;border-radius:9999px;
  background:var(--muted,#1a1a1a);overflow:hidden;margin-bottom:16px;
}
#boot-screen .progress-bar{
  height:100%;width:0%;border-radius:inherit;
  background:linear-gradient(90deg,var(--primary,#007aff),color-mix(in srgb,var(--primary,#007aff) 60%,#8b5cf6));
  transition:width 0.4s ease;
}
#boot-screen .boot-steps{
  width:100%;display:flex;flex-direction:column;gap:6px;
}
#boot-screen .boot-step{
  display:flex;align-items:center;gap:10px;
  font-size:12px;font-weight:500;color:var(--muted-foreground,#555);
  transition:color 0.3s,opacity 0.3s;opacity:0.4;
}
#boot-screen .boot-step.active{color:var(--foreground,#fff);opacity:1}
#boot-screen .boot-step.done{color:var(--primary,#007aff);opacity:0.7}
#boot-screen .boot-step .step-icon{
  width:18px;height:18px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:10px;flex-shrink:0;
  border:1.5px solid var(--border,#333);color:var(--muted-foreground,#555);
  transition:all 0.3s;
}
#boot-screen .boot-step.active .step-icon{
  border-color:var(--primary,#007aff);color:var(--primary,#007aff);
  box-shadow:0 0 8px var(--primary,#007aff)40;
}
#boot-screen .boot-step.done .step-icon{
  border-color:var(--primary,#007aff);background:var(--primary,#007aff);color:#fff;
}
#boot-screen .boot-step .step-label{flex:1}
#boot-screen .boot-step .step-status{
  font-size:10px;font-weight:600;font-family:monospace;
  color:var(--muted-foreground,#555);
}
#boot-screen .boot-step.done .step-status{color:var(--primary,#007aff)}
`;

const bootDismissScript = `
(function(){
  var steps=[
    {label:'Dashboard',time:300},
    {label:'Listings Engine',time:250},
    {label:'AI Pipeline',time:350},
    {label:'Platform Connectors',time:200},
    {label:'Analytics',time:200},
    {label:'Ops Monitor',time:150},
    {label:'Photo Studio',time:200},
    {label:'Cross-Market Search',time:150}
  ];
  var bar=document.getElementById('boot-bar');
  var stepEls=document.querySelectorAll('.boot-step');
  var total=steps.length;
  var current=0;

  function runStep(){
    if(current>=total){
      if(bar)bar.style.width='100%';
      stepEls.forEach(function(el){el.classList.add('done');el.classList.remove('active')});
      setTimeout(function(){
        var el=document.getElementById('boot-screen');
        if(el){el.classList.add('hidden');setTimeout(function(){el.remove()},500)}
      },400);
      return;
    }
    var pct=Math.round(((current+1)/total)*100);
    if(bar)bar.style.width=pct+'%';
    stepEls.forEach(function(el,i){
      el.classList.remove('active','done');
      if(i<current)el.classList.add('done');
      if(i===current)el.classList.add('active');
    });
    var statusEl=stepEls[current]&&stepEls[current].querySelector('.step-status');
    if(statusEl)statusEl.textContent='Loading...';
    setTimeout(function(){
      if(statusEl)statusEl.textContent='Ready';
      if(stepEls[current])stepEls[current].classList.remove('active');
      if(stepEls[current])stepEls[current].classList.add('done');
      current++;
      runStep();
    },steps[current].time);
  }

  // Start after a brief delay so the screen renders first
  setTimeout(runStep,200);

  // Safety fallback
  window.addEventListener('app:ready',function(){
    if(bar)bar.style.width='100%';
    stepEls.forEach(function(el){el.classList.add('done')});
    setTimeout(function(){
      var el=document.getElementById('boot-screen');
      if(el){el.classList.add('hidden');setTimeout(function(){el.remove()},500)}
    },300);
  });
  setTimeout(function(){
    var el=document.getElementById('boot-screen');
    if(el){el.classList.add('hidden');setTimeout(function(){el.remove()},500)}
  },8000);
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
            <img src="/logo-icon.svg" alt="" width="48" height="48" class="boot-logo" />
            <div class="boot-title">ListBlitz</div>
            <div class="boot-sub">Preparing your dashboard...</div>
            <div class="progress-container">
              <div class="progress-track"><div class="progress-bar" id="boot-bar"></div></div>
              <div class="boot-steps">
                <div class="boot-step"><div class="step-icon">1</div><div class="step-label">Dashboard</div><div class="step-status"></div></div>
                <div class="boot-step"><div class="step-icon">2</div><div class="step-label">Listings Engine</div><div class="step-status"></div></div>
                <div class="boot-step"><div class="step-icon">3</div><div class="step-label">AI Pipeline</div><div class="step-status"></div></div>
                <div class="boot-step"><div class="step-icon">4</div><div class="step-label">Platform Connectors</div><div class="step-status"></div></div>
                <div class="boot-step"><div class="step-icon">5</div><div class="step-label">Analytics</div><div class="step-status"></div></div>
                <div class="boot-step"><div class="step-icon">6</div><div class="step-label">Ops Monitor</div><div class="step-status"></div></div>
                <div class="boot-step"><div class="step-icon">7</div><div class="step-label">Photo Studio</div><div class="step-status"></div></div>
                <div class="boot-step"><div class="step-icon">8</div><div class="step-label">Cross-Market Search</div><div class="step-status"></div></div>
              </div>
            </div>
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
