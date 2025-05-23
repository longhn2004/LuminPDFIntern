"use client";

import TokenExpirationChecker from "@/components/TokenExpirationChecker";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TokenExpirationChecker />
      {children}
    </>
  );
} 