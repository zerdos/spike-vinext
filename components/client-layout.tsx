"use client";

import { AuthProvider } from "@/components/auth-provider";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
