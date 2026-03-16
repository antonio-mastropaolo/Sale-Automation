import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { TopHeader } from "@/components/top-header";
import { Toaster } from "@/components/ui/sonner";
import { MainContent } from "@/components/main-content";
import { HelpProvider } from "@/components/help-context";
import { HelpAssistant } from "@/components/help-assistant";
import { Footer } from "@/components/footer";
import { InboxNotifications } from "@/components/inbox-notifications";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen font-sans`}
      >
        <HelpProvider>
          <div className="flex min-h-screen">
            <Sidebar className="hidden lg:flex" />
            <MainContent>
              <TopHeader />
              {children}
              <Footer />
            </MainContent>
          </div>
          <HelpAssistant />
          <InboxNotifications />
          <Toaster position="bottom-right" richColors />
        </HelpProvider>
      </body>
    </html>
  );
}
