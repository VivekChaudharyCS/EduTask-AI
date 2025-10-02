// src/components/auth/ProtectedRoute.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "../../lib/utils/clientAuth";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login"); // redirect if no token
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return <p className="p-6 text-gray-500">Checking authentication...</p>;
  }

  return <>{children}</>;
}
