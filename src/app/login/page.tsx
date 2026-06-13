"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PulseSyncLoginScreen from "@/components/PulseSyncLoginScreen";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return") || "/responses";

  return <PulseSyncLoginScreen variant="admin" returnTo={returnTo} />;
}
