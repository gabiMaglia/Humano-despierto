"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/useAuthStore";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) return null;

  return <>{children}</>;
}
