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
  background:#0a0a0f;
  transition:opacity .6s cubic-bezier(0.16,1,0.3,1),visibility .6s;
  font-family:system-ui,-apple-system,sans-serif;
}
#boot-screen.hidden{opacity:0;visibility:hidden;pointer-events:none}
#boot-screen .boot-logo{
  margin-bottom:20px;opacity:0;
  animation:bootFadeUp .6s cubic-bezier(0.16,1,0.3,1) .1s forwards;
}
#boot-screen .boot-title{
  font-size:22px;font-weight:800;letter-spacing:-0.5px;
  color:#fff;margin-bottom:6px;opacity:0;
  animation:bootFadeUp .6s cubic-bezier(0.16,1,0.3,1) .2s forwards;
}
#boot-screen .boot-sub{
  font-size:13px;font-weight:500;
  color:rgba(255,255,255,0.35);margin-bottom:36px;opacity:0;
  animation:bootFadeUp .6s cubic-bezier(0.16,1,0.3,1) .3s forwards;
}
#boot-screen .progress-container{
  width:50%;max-width:480px;min-width:300px;opacity:0;
  animation:bootFadeUp .6s cubic-bezier(0.16,1,0.3,1) .4s forwards;
}
#boot-screen .progress-track{
  width:100%;height:4px;border-radius:9999px;
  background:rgba(255,255,255,0.06);overflow:hidden;margin-bottom:24px;
}
#boot-screen .progress-bar{
  height:100%;width:0%;border-radius:inherit;
  background:linear-gradient(90deg,#3b82f6,#8b5cf6);
  transition:width .6s cubic-bezier(0.16,1,0.3,1);
}
#boot-screen .boot-steps{width:100%;display:flex;flex-direction:column;gap:0}
#boot-screen .boot-step{
  display:flex;align-items:center;gap:12px;
  padding:7px 0;font-size:13px;font-weight:500;
  color:rgba(255,255,255,0.15);
  transition:all .4s cubic-bezier(0.16,1,0.3,1);
  transform:translateX(0);
}
#boot-screen .boot-step.active{
  color:rgba(255,255,255,0.9);
  transform:translateX(4px);
}
#boot-screen .boot-step.done{
  color:rgba(255,255,255,0.3);
}
#boot-screen .boot-step .step-icon{
  width:20px;height:20px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:10px;font-weight:700;flex-shrink:0;
  border:1.5px solid rgba(255,255,255,0.08);
  color:rgba(255,255,255,0.15);
  transition:all .4s cubic-bezier(0.16,1,0.3,1);
}
#boot-screen .boot-step.active .step-icon{
  border-color:#3b82f6;color:#3b82f6;
  box-shadow:0 0 12px rgba(59,130,246,0.3);
  background:rgba(59,130,246,0.1);
}
#boot-screen .boot-step.done .step-icon{
  border-color:transparent;background:#3b82f6;color:#fff;
}
#boot-screen .boot-step .step-label{flex:1}
#boot-screen .boot-step .step-status{
  font-size:11px;font-weight:600;font-variant-numeric:tabular-nums;
  color:rgba(255,255,255,0.1);
  transition:all .3s;
}
#boot-screen .boot-step.active .step-status{color:rgba(255,255,255,0.5)}
#boot-screen .boot-step.done .step-status{color:#3b82f6}
@keyframes bootFadeUp{
  from{opacity:0;transform:translateY(8px)}
  to{opacity:1;transform:translateY(0)}
}
`;

const bootDismissScript = `
(function(){
  var bar=document.getElementById('boot-bar');
  var stepEls=document.querySelectorAll('.boot-step');
  var total=stepEls.length;
  var current=0;
  var dismissed=false;

  function dismiss(){
    if(dismissed)return;
    dismissed=true;
    if(bar)bar.style.width='100%';
    stepEls.forEach(function(el){el.classList.add('done');el.classList.remove('active')});
    setTimeout(function(){
      var el=document.getElementById('boot-screen');
      if(el){el.classList.add('hidden');setTimeout(function(){el.remove()},600)}
    },500);
  }

  function runStep(){
    if(current>=total){dismiss();return;}
    // Smooth progress
    if(bar)bar.style.width=Math.round(((current+0.5)/total)*100)+'%';
    // Update step states
    stepEls.forEach(function(el,i){
      el.classList.remove('active','done');
      if(i<current)el.classList.add('done');
      if(i===current)el.classList.add('active');
    });
    var statusEl=stepEls[current]&&stepEls[current].querySelector('.step-status');
    if(statusEl)statusEl.textContent='...';
    // Each step takes 350-500ms for smooth feel
    var delay=350+Math.random()*150;
    setTimeout(function(){
      if(statusEl)statusEl.textContent='OK';
      if(bar)bar.style.width=Math.round(((current+1)/total)*100)+'%';
      stepEls[current].classList.remove('active');
      stepEls[current].classList.add('done');
      current++;
      // Small gap between steps
      setTimeout(runStep,80);
    },delay);
  }

  // Start after entrance animations finish
  setTimeout(runStep,600);

  // React app signals ready — fast-forward
  window.addEventListener('app:ready',function(){
    // Complete remaining steps quickly
    for(var i=current;i<total;i++){
      stepEls[i].classList.add('done');
      stepEls[i].classList.remove('active');
      var s=stepEls[i].querySelector('.step-status');
      if(s)s.textContent='OK';
    }
    dismiss();
  });
  // Safety: never block longer than 6s
  setTimeout(dismiss,6000);
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
