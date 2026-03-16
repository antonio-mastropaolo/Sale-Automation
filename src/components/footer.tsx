"use client";

export function Footer() {
  return (
    <footer className="mt-10 border-t border-border py-4 px-2 flex items-center justify-between text-[11px] text-muted-foreground">
      <span>&copy; {new Date().getFullYear()} ListBlitz</span>
      <span className="hidden sm:inline">8 platforms &middot; AI-optimized cross-listing</span>
    </footer>
  );
}
