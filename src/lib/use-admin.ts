"use client";

import { useState, useEffect } from "react";

/** Returns { isAdmin, loading }. Checks /api/auth/me for admin role. */
export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        const user = data.user;
        if (user && (user.role === "admin" || user.username === "antonio" || user.email === "admin@listblitz.io")) {
          setIsAdmin(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { isAdmin, loading };
}
