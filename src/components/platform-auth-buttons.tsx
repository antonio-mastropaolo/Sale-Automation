"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, HelpCircle, X, Key, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const PLATFORM_AUTH_METHODS: Record<string, string[]> = {
  depop: ["google", "apple", "facebook", "browser", "credentials"],
  grailed: ["google", "apple", "browser", "credentials"],
  poshmark: ["google", "apple", "facebook", "browser", "credentials"],
  mercari: ["google", "apple", "facebook", "browser", "credentials"],
  ebay: ["google", "apple", "browser", "credentials", "api_key"],
  vinted: ["google", "apple", "facebook", "browser", "credentials", "api_key"],
  facebook: ["facebook", "browser"],
  vestiaire: ["google", "apple", "facebook", "browser", "credentials"],
};

const PLATFORM_LOGIN_URLS: Record<string, string> = {
  depop: "https://www.depop.com/login/",
  grailed: "https://www.grailed.com/users/sign_in",
  poshmark: "https://poshmark.com/login",
  mercari: "https://www.mercari.com/login/",
  ebay: "https://signin.ebay.com/ws/eBayISAPI.dll?SignIn",
  vinted: "https://www.vinted.com/member/login",
  facebook: "https://www.facebook.com/login/",
  vestiaire: "https://www.vestiairecollective.com/authentication/",
};

const PLATFORM_PASSWORD_URLS: Record<string, string> = {
  depop: "https://www.depop.com/settings/account/",
  grailed: "https://www.grailed.com/account/settings",
  poshmark: "https://poshmark.com/account/info",
  mercari: "https://www.mercari.com/mypage/settings/",
  ebay: "https://www.ebay.com/mye/myebay/acctPrefs",
  vinted: "https://www.vinted.com/member/settings",
  facebook: "https://www.facebook.com/settings/?tab=security",
  vestiaire: "https://www.vestiairecollective.com/settings/",
};

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  google: <svg className="h-3 w-3" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>,
  apple: <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>,
  facebook: <svg className="h-3 w-3" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
};

interface PlatformAuthButtonsProps {
  platform: string;
  onAuthMethodSelected: (method: string) => void;
  isConnected?: boolean;
  connectedMethod?: string | null;
  loading?: boolean;
}

export function PlatformAuthButtons({
  platform,
  onAuthMethodSelected,
  isConnected,
  connectedMethod,
  loading,
}: PlatformAuthButtonsProps) {
  const [showHelp, setShowHelp] = useState(false);
  const methods = PLATFORM_AUTH_METHODS[platform] || ["credentials"];
  const socials = methods.filter(m => ["google", "apple", "facebook"].includes(m));
  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);

  if (isConnected && connectedMethod) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-emerald-500 font-medium text-[10px]">
        via {formatMethodName(connectedMethod)}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      {/* Social icons (informational — shows which login methods the platform supports) */}
      {socials.map((method) => (
        <span key={method} title={`${platformName} supports ${method} login`} className="inline-flex items-center justify-center h-5 w-5 rounded opacity-50">
          {SOCIAL_ICONS[method]}
        </span>
      ))}

      {/* Help button */}
      <button
        title="How to connect"
        onClick={(e) => { e.stopPropagation(); setShowHelp(!showHelp); }}
        className="inline-flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-foreground transition-colors"
      >
        {showHelp ? <ChevronUp className="h-3 w-3" /> : <HelpCircle className="h-3 w-3" />}
      </button>

      {/* Help dropdown */}
      {showHelp && (
        <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border bg-popover text-popover-foreground shadow-lg p-3 space-y-2 text-xs" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">How to connect {platformName}</p>
            <button onClick={() => setShowHelp(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-1.5 text-muted-foreground">
            <p className="font-medium text-foreground">Option 1: Email & Password</p>
            <p>Enter your {platformName} email and password below and click Save.</p>

            {socials.length > 0 && (
              <>
                <p className="font-medium text-foreground pt-1">Signed up with {socials.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("/")}?</p>
                <p>Go to your {platformName} account settings and set a password. Then use that email + password here.</p>
                <a
                  href={PLATFORM_PASSWORD_URLS[platform] || PLATFORM_LOGIN_URLS[platform]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open {platformName} Settings
                </a>
              </>
            )}

            {methods.includes("api_key") && (
              <>
                <p className="font-medium text-foreground pt-1">Option 2: API Key</p>
                <p>If you have a {platformName} API key or developer token, enter it in the password field.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] gap-1"
                  onClick={() => { onAuthMethodSelected("api_key"); setShowHelp(false); }}
                >
                  <Key className="h-2.5 w-2.5" />
                  Use API Key
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatMethodName(method: string): string {
  switch (method) {
    case "google": return "Google";
    case "apple": return "Apple";
    case "facebook": return "Facebook";
    case "web_session": return "Browser";
    case "api_key": return "API Key";
    case "credentials": return "Email";
    default: return method;
  }
}

export { PLATFORM_AUTH_METHODS, PLATFORM_LOGIN_URLS };
