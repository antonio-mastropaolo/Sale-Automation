"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Link2, Unlink, Shield, CheckCircle2, XCircle, Key } from "lucide-react";
import { toast } from "sonner";
import { platformBranding } from "@/lib/colors";

interface PlatformStatus {
  platform: string;
  connected: boolean;
  updatedAt: string | null;
}

const platformInfo = Object.fromEntries(
  Object.entries(platformBranding).map(([k, v]) => [
    k,
    { name: v.label, color: v.color, bg: v.bg, icon: v.icon },
  ])
) as Record<string, { name: string; color: string; bg: string; icon: string }>;

export default function SettingsPage() {
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ username: "", password: "" });

  const fetchPlatforms = () => {
    fetch("/api/platforms/connect")
      .then((r) => r.json())
      .then(setPlatforms)
      .catch(() => {});
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const connect = async (platform: string) => {
    if (!form.username || !form.password) {
      toast.error("Username and password required");
      return;
    }
    setConnecting(platform);
    try {
      const res = await fetch("/api/platforms/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, ...form }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Connected to ${platformInfo[platform].name}`);
      setDialogOpen(null);
      setForm({ username: "", password: "" });
      fetchPlatforms();
    } catch {
      toast.error("Failed to connect");
    }
    setConnecting(null);
  };

  const disconnect = async (platform: string) => {
    if (!confirm(`Disconnect from ${platformInfo[platform].name}?`)) return;
    try {
      await fetch(`/api/platforms/connect?platform=${platform}`, {
        method: "DELETE",
      });
      toast.success(`Disconnected from ${platformInfo[platform].name}`);
      fetchPlatforms();
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const connectedCount = platforms.filter((p) => p.connected).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your platform connections and preferences</p>
      </div>

      {/* Connection summary */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Platform Connections</h3>
              <p className="text-sm text-muted-foreground">
                {connectedCount} of 4 platforms connected
              </p>
            </div>
            <div className="flex gap-1">
              {platforms.map((p) => (
                <div
                  key={p.platform}
                  className={`w-2.5 h-2.5 rounded-full ${p.connected ? "bg-green-500" : "bg-muted-foreground/20"}`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform list */}
      <div className="space-y-3">
        {platforms.map((p) => {
          const info = platformInfo[p.platform];
          return (
            <Card key={p.platform} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl ${info.bg} ${info.color} flex items-center justify-center font-bold`}>
                      {info.icon}
                    </div>
                    <div>
                      <p className="font-semibold">{info.name}</p>
                      {p.connected ? (
                        <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Connected
                          {p.updatedAt && (
                            <span className="text-muted-foreground ml-1">
                              · {new Date(p.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <XCircle className="h-3.5 w-3.5" />
                          Not connected
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    {p.connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnect(p.platform)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Unlink className="h-4 w-4 mr-1" />
                        Disconnect
                      </Button>
                    ) : (
                      <Dialog
                        open={dialogOpen === p.platform}
                        onOpenChange={(open) => {
                          setDialogOpen(open ? p.platform : null);
                          if (!open) setForm({ username: "", password: "" });
                        }}
                      >
                        <DialogTrigger>
                          <Button size="sm" className="bg-primary text-primary-foreground">
                            <Link2 className="h-4 w-4 mr-1" />
                            Connect
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg ${info.bg} ${info.color} flex items-center justify-center font-bold text-sm`}>
                                {info.icon}
                              </div>
                              Connect to {info.name}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                              <Label>Username / Email</Label>
                              <Input
                                value={form.username}
                                onChange={(e) =>
                                  setForm((f) => ({ ...f, username: e.target.value }))
                                }
                                placeholder={`Your ${info.name} username`}
                                className="h-11"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Password</Label>
                              <Input
                                type="password"
                                value={form.password}
                                onChange={(e) =>
                                  setForm((f) => ({ ...f, password: e.target.value }))
                                }
                                placeholder="Password"
                                className="h-11"
                              />
                            </div>
                            <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                              <Key className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                              <p className="text-xs text-muted-foreground">
                                Your credentials are encrypted with AES-256-GCM and stored locally on your machine. They are never sent to any external server.
                              </p>
                            </div>
                            <Button
                              className="w-full h-11 bg-primary text-primary-foreground"
                              onClick={() => connect(p.platform)}
                              disabled={connecting === p.platform}
                            >
                              {connecting === p.platform && (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              )}
                              Save & Connect
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
