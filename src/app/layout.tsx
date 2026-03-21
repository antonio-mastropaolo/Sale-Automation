import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { HelpProvider } from "@/components/help-context";
// import { HelpAssistant } from "@/components/help-assistant"; // Removed: AI assistant now accessible from right rail Actions
// Footer removed — user profile + branding moved to sidebar
import { InboxNotifications } from "@/components/inbox-notifications";
import { AppShell } from "@/components/app-shell";

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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen font-sans`}
        suppressHydrationWarning
      >
        <HelpProvider>
          <AppShell>
            {children}
          </AppShell>
          <InboxNotifications />
          <Toaster position="bottom-right" richColors />
        </HelpProvider>
      </body>
    </html>
  );
}
