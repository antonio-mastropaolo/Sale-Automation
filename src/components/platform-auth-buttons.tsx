"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Globe, Apple, Key, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

// Platform × Auth Method Matrix (matches iOS PlatformAuthConfigs)
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
  const [activeMethod, setActiveMethod] = useState<string | null>(null);
  const methods = PLATFORM_AUTH_METHODS[platform] || ["credentials"];

  const handleBrowserLogin = () => {
    const url = PLATFORM_LOGIN_URLS[platform];
    if (!url) return;

    setActiveMethod("browser");
    const popup = window.open(url, `${platform}_login`, "width=500,height=700,scrollbars=yes");

    // Poll for popup close
    const interval = setInterval(() => {
      if (popup?.closed) {
        clearInterval(interval);
        setActiveMethod(null);
        // After popup closes, save as web_session
        onAuthMethodSelected("web_session");
        toast.success(`Signed in to ${platform} via browser`);
      }
    }, 500);

    // Auto-clear after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      setActiveMethod(null);
    }, 300000);
  };

  const handleOAuthMethod = (method: string) => {
    const url = PLATFORM_LOGIN_URLS[platform];
    if (!url) return;

    setActiveMethod(method);
    const popup = window.open(url, `${platform}_${method}`, "width=500,height=700,scrollbars=yes");

    const interval = setInterval(() => {
      if (popup?.closed) {
        clearInterval(interval);
        setActiveMethod(null);
        onAuthMethodSelected(method);
        toast.success(`Connected to ${platform} via ${method}`);
      }
    }, 500);

    setTimeout(() => {
      clearInterval(interval);
      setActiveMethod(null);
    }, 300000);
  };

  if (isConnected && connectedMethod) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-500 font-medium">
          Connected via {formatMethodName(connectedMethod)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2 mb-3">
      {/* Google */}
      {methods.includes("google") && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 bg-white text-black hover:bg-gray-100 border-gray-300"
          onClick={() => handleOAuthMethod("google")}
          disabled={loading || activeMethod !== null}
        >
          {activeMethod === "google" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
          Continue with Google
        </Button>
      )}

      {/* Apple */}
      {methods.includes("apple") && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 bg-black text-white hover:bg-gray-900 border-gray-700"
          onClick={() => handleOAuthMethod("apple")}
          disabled={loading || activeMethod !== null}
        >
          {activeMethod === "apple" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Apple className="h-4 w-4" />
          )}
          Sign in with Apple
        </Button>
      )}

      {/* Facebook */}
      {methods.includes("facebook") && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 bg-[#1877F2] text-white hover:bg-[#1565D8] border-[#1877F2]"
          onClick={() => handleOAuthMethod("facebook")}
          disabled={loading || activeMethod !== null}
        >
          {activeMethod === "facebook" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          )}
          Continue with Facebook
        </Button>
      )}

      {/* Browser */}
      {methods.includes("browser") && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleBrowserLogin}
          disabled={loading || activeMethod !== null}
        >
          {activeMethod === "browser" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          Sign in via Browser
        </Button>
      )}

      {/* API Key */}
      {methods.includes("api_key") && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => onAuthMethodSelected("api_key")}
          disabled={loading || activeMethod !== null}
        >
          <Key className="h-4 w-4" />
          Enter API Key
        </Button>
      )}

      {/* Divider before credentials */}
      {methods.includes("credentials") && methods.length > 1 && (
        <div className="flex items-center gap-2 py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] text-muted-foreground uppercase">or use email & password</span>
          <div className="flex-1 h-px bg-border" />
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
