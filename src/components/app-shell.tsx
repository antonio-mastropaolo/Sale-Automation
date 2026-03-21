"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { RightRail } from "@/components/right-rail";
import { PageTransition } from "@/components/page-transition";

const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/showcase"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.includes(pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <main className="flex-1">
          <PageTransition>
            <div className="w-full px-4 pb-10 pt-16 sm:px-6 sm:pt-16 md:pt-10 lg:px-8 lg:pt-6 xl:px-10 2xl:px-12 2xl:pb-12">
              {children}
            </div>
          </PageTransition>
        </main>
      </div>
      <RightRail />
    </div>
  );
}
