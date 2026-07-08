"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({ children, requiredRole }) {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("careerForgeUser");

    if (!storedUser) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(storedUser);

    if (requiredRole && user.role !== requiredRole) {
      router.push("/");
      return;
    }

    setAllowed(true);
    setChecking(false);
  }, [router, requiredRole]);

  if (checking) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 py-10">
        <p className="text-[var(--text-muted)]">Checking access...</p>
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  return children;
}
