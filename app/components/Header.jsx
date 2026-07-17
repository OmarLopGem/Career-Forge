"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { requestJsonWithoutBody } from "@/lib/job-tracker/client/api.js";

function BellIcon({ className = "" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}

// The header reads the server-provided user snapshot and derives the navigation
// model locally so role-based links stay consistent across desktop and mobile.
export default function Header({ currentUser = null }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isLoggedIn = !!currentUser;
  const isAdmin = currentUser?.role === "admin";

  const publicLinks = [
    {
      name: "Home",
      href: "/",
    },
  ]

  const authenticatedLinks = [
    {
      name: "CV Assistant",
      href: "/cv-assistant",
    },
    {
      name: "Job Matches",
      href: "/jobs",
    },
    {
      name: "Practice",
      href: "/quiz",
    },
  ];

  const userLinks = [
    {
      name: "Calendar",
      href: "/calendar",
    },
    {
      name: "Notifications",
      href: "/notifications",
      desktopHidden: true,
    },
    {
      name: "Profile",
      href: "/profile",
    },
    {
      name: "Progress",
      href: "/progress",
    },
  ];

  const adminLinks = [
    {
      name: "Admin Users",
      href: "/admin/users",
    },
    {
      name: "Admin Notifications",
      href: "/admin/notifications",
    },
  ];

  const navLinks = [
    ...publicLinks,
    ...(isLoggedIn ? authenticatedLinks : []),
    ...(isLoggedIn ? userLinks : []),
    ...(isAdmin ? adminLinks : []),
  ];

  const isActiveLink = (href) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await requestJsonWithoutBody("/api/auth/logout", { method: "POST" });
      } catch {}
      // Refresh after redirect so every server component re-evaluates the session.
      setIsOpen(false);
      router.push("/");
      router.refresh();
    });
  };

  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-md border-b border-border">
      <nav className="max-w-7xl mx-auto px-5 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 group"
            onClick={() => setIsOpen(false)}
          >
            <Image
              src="/career-forge-logo.png"
              alt="Career Forge Logo"
              width={44}
              height={44}
              className="h-10 w-10 sm:h-11 sm:w-11 object-contain translate-y-[1px] transition-transform duration-300 group-hover:scale-105"
            />

            <span className="text-xl sm:text-2xl font-bold leading-none text-navy tracking-tight">
              Career <span className="text-brand-blue">Forge</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2">
            {navLinks.filter((link) => !link.desktopHidden).map((link) => {
              const isActive = isActiveLink(link.href);

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`
                    group relative rounded-lg text-sm font-medium transition-all duration-300
                    ${
                      isActive
                        ? "text-brand-blue bg-blue-soft"
                        : "text-text-muted hover:text-brand-blue hover:bg-cyan-soft"
                    }
                    px-4 py-2
                  `}
                >
                  {link.name}

                  <span
                    className={`
                      absolute -bottom-1 h-0.5 rounded-full bg-brand-blue
                      transition-all duration-300 origin-center
                      ${
                        isActive
                          ? "opacity-100 scale-x-100"
                          : "opacity-0 scale-x-0 group-hover:opacity-100 group-hover:scale-x-100"
                      }
                      left-4 right-4
                    `}
                  />
                </Link>
              );
            })}

            {isLoggedIn ? (
              <>
                <Link
                  href="/notifications"
                  aria-label="Notifications"
                  title="Notifications"
                  className={`ml-2 rounded-xl p-3 transition-all duration-300 ${
                    isActiveLink("/notifications")
                      ? "bg-blue-soft text-brand-blue"
                      : "text-text-muted hover:bg-cyan-soft hover:text-brand-blue"
                  }`}
                >
                  <BellIcon className="h-5 w-5" />
                </Link>

                <Link
                  href="/cv-assistant"
                  className="ml-2 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover hover:-translate-y-0.5 hover:shadow-md"
                >
                  Upload Resume
                </Link>

                <button
                  onClick={handleLogout}
                  disabled={isPending}
                  className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-text-muted transition-all duration-300 hover:text-brand-blue hover:bg-cyan-soft"
                >
                  {isPending ? "Signing out..." : "Logout"}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="ml-3 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-text-muted transition-all duration-300 hover:text-brand-blue hover:bg-cyan-soft"
                >
                  Login
                </Link>

                <Link
                  href="/register"
                  className="rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover hover:-translate-y-0.5 hover:shadow-md"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
            className="lg:hidden flex flex-col items-center justify-center gap-1.5 h-10 w-10 rounded-lg hover:bg-cyan-soft transition-colors"
          >
            <span
              className={`
                h-0.5 w-6 bg-navy rounded-full transition-all duration-300
                ${isOpen ? "rotate-45 translate-y-2" : ""}
              `}
            />
            <span
              className={`
                h-0.5 w-6 bg-navy rounded-full transition-all duration-300
                ${isOpen ? "opacity-0" : "opacity-100"}
              `}
            />
            <span
              className={`
                h-0.5 w-6 bg-navy rounded-full transition-all duration-300
                ${isOpen ? "-rotate-45 -translate-y-2" : ""}
              `}
            />
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`
            lg:hidden overflow-hidden transition-all duration-300 ease-in-out
            ${isOpen ? "max-h-[600px] opacity-100 mt-4" : "max-h-0 opacity-0"}
          `}
        >
          <div className="flex flex-col gap-2 pt-4 border-t border-border">
            {navLinks.map((link) => {
              const isActive = isActiveLink(link.href);

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300
                    ${
                      isActive
                        ? "text-brand-blue bg-blue-soft"
                        : "text-text-muted hover:text-brand-blue hover:bg-cyan-soft"
                    }
                  `}
                >
                  {link.name}
                </Link>
              );
            })}

            {isLoggedIn ? (
              <>
                <Link
                  href="/cv-assistant"
                  onClick={() => setIsOpen(false)}
                  className="mt-2 rounded-xl bg-brand-blue px-4 py-3 text-center text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover"
                >
                  Upload Resume
                </Link>

                <button
                  onClick={handleLogout}
                  disabled={isPending}
                  className="rounded-xl border border-border px-4 py-3 text-center text-sm font-semibold text-text-muted transition-all duration-300 hover:text-brand-blue hover:bg-cyan-soft"
                >
                  {isPending ? "Signing out..." : "Logout"}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="mt-2 rounded-xl border border-border px-4 py-3 text-center text-sm font-semibold text-text-muted transition-all duration-300 hover:text-brand-blue hover:bg-cyan-soft"
                >
                  Login
                </Link>

                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl bg-brand-blue px-4 py-3 text-center text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
