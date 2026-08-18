"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { requestJson, requestJsonWithoutBody } from "@/lib/job-tracker/client/api.js";

const NOTIFICATION_BADGE_MAX = 99;
const NOTIFICATION_POLL_INTERVAL_MS = 30_000;
const NOTIFICATION_SEEN_KEY_PREFIX = "career-forge.notifications.last-seen";

function BellIcon({ className = "" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9.5 19H5.617c-.744 0-1.226-.782-.893-1.447l.854-1.708c.278-.555.422-1.167.422-1.788V11c0-2 1-6 6-6s6 4 6 6v3.056c0 .621.145 1.233.422 1.789l.854 1.708c.333.665-.149 1.447-.893 1.447H14.5" />
      <path d="M12 5V3" />
      <path d="M9.5 19C9.5 21 10.5 22 12 22s2.5-1 2.5-3" />
    </svg>
  );
}

function ChevronIcon({ isOpen = false, className = "" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function getNotificationSeenStorageKey(userId) {
  return `${NOTIFICATION_SEEN_KEY_PREFIX}:${userId}`;
}

function readLastSeenNotification(userId) {
  if (typeof window === "undefined" || !userId) return null;
  return window.localStorage.getItem(getNotificationSeenStorageKey(userId));
}

function writeLastSeenNotification(userId, value) {
  if (typeof window === "undefined" || !userId || !value) return;
  window.localStorage.setItem(getNotificationSeenStorageKey(userId), value);
}

function getLatestNotificationTimestamp(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) return null;

  return notifications.reduce((latest, notification) => {
    const candidate = String(notification?.createdAt ?? "").trim();
    if (!candidate) return latest;
    if (!latest) return candidate;
    return new Date(candidate).getTime() > new Date(latest).getTime() ? candidate : latest;
  }, null);
}

function countUnreadNotifications(notifications, lastSeenAt) {
  if (!Array.isArray(notifications) || notifications.length === 0) return 0;
  if (!lastSeenAt) return notifications.length;

  const seenTime = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seenTime)) return notifications.length;

  return notifications.filter((notification) => {
    const createdAt = new Date(String(notification?.createdAt ?? "")).getTime();
    return Number.isFinite(createdAt) && createdAt > seenTime;
  }).length;
}

// The header reads the server-provided user snapshot and derives the navigation
// model locally so role-based links stay consistent across desktop and mobile.
export default function Header({ currentUser = null }) {
  const pathname = usePathname();
  return <HeaderNavigation key={pathname} currentUser={currentUser} pathname={pathname} />;
}

function HeaderNavigation({ currentUser = null, pathname }) {
  const router = useRouter();
  const workspaceMenuRef = useRef(null);
  const adminMenuRef = useRef(null);
  const employerMenuRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [openDesktopMenu, setOpenDesktopMenu] = useState(null);
  const [openMobileSections, setOpenMobileSections] = useState({
    workspace: false,
    admin: false,
    employer: false,
  });
  const [isPending, startTransition] = useTransition();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const isLoggedIn = !!currentUser;
  const isAdmin = currentUser?.role === "admin";
  const isEmployer = currentUser?.role === "employer";

  const publicLinks = [
    {
      name: "Home",
      href: "/",
    },
  ];

  const authenticatedLinks = [
    {
      name: "CV Assistant",
      href: "/cv-assistant",
    },
    {
      name: "Job Listings",
      href: "/jobs",
    },
    {
      name: "Practice",
      href: "/quiz",
    },
  ];

  const workspaceLinks = [
    {
      name: "Calendar",
      href: "/calendar",
    },
    {
      name: "Progress",
      href: "/progress",
    },
    {
      name: "Profile",
      href: "/profile",
    },
    {
      name: "Notifications",
      href: "/notifications",
    },
    {
      name: "Support",
      href: "/support",
    },
  ];

  const adminLinks = [
    {
      name: "Admin Users",
      href: "/admin/users",
    },
    {
      name: "Admin Employers",
      href: "/admin/employers",
    },
    {
      name: "Admin Notifications",
      href: "/admin/notifications",
    },
    {
      name: "Job Listings",
      href: "/admin/job-listings",
    },
    {
      name: "Quiz Library",
      href: "/admin/quiz",
    },
    {
      name: "Admin Support",
      href: "/admin/support",
    },
  ];

  const employerLinks = [
    {
      name: "My Listings",
      href: "/employer/listings",
    },
    {
      name: "Applicants",
      href: "/employer/applicants",
    },
  ];

  const primaryLinks = [
    ...publicLinks,
    ...(isLoggedIn ? authenticatedLinks : []),
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

  const toggleDesktopMenu = (menuName) => {
    setOpenDesktopMenu((current) => (current === menuName ? null : menuName));
  };

  const toggleMobileSection = (sectionName) => {
    setOpenMobileSections((current) => ({
      ...current,
      [sectionName]: !current[sectionName],
    }));
  };

  useEffect(() => {
    function handlePointerDown(event) {
      const target = event.target;
      const clickedWorkspace = workspaceMenuRef.current?.contains(target);
      const clickedAdmin = adminMenuRef.current?.contains(target);
      const clickedEmployer = employerMenuRef.current?.contains(target);
      if (!clickedWorkspace && !clickedAdmin && !clickedEmployer) {
        setOpenDesktopMenu(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !currentUser?._id) {
      setUnreadNotificationCount(0);
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadNotificationBadge() {
      try {
        const data = await requestJson("/api/notifications", {
          signal: controller.signal,
        });
        if (cancelled) return;

        const notifications = Array.isArray(data?.notifications) ? data.notifications : [];
        const latestNotificationAt = getLatestNotificationTimestamp(notifications);

        if (pathname.startsWith("/notifications")) {
          if (latestNotificationAt) {
            writeLastSeenNotification(currentUser._id, latestNotificationAt);
          }
          setUnreadNotificationCount(0);
          return;
        }

        const lastSeenAt = readLastSeenNotification(currentUser._id);
        setUnreadNotificationCount(countUnreadNotifications(notifications, lastSeenAt));
      } catch (error) {
        if (cancelled || error?.name === "AbortError") return;
        if (error?.status === 401 || error?.status === 403) {
          setUnreadNotificationCount(0);
          return;
        }
        if (error?.code === "NETWORK_ERROR") {
          return;
        }
        console.error("Failed to load notification badge:", error);
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void loadNotificationBadge();
      }
    }

    void loadNotificationBadge();
    const intervalId = window.setInterval(loadNotificationBadge, NOTIFICATION_POLL_INTERVAL_MS);
    window.addEventListener("focus", loadNotificationBadge);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", loadNotificationBadge);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [currentUser?._id, isLoggedIn, pathname]);

  const notificationCountLabel =
    unreadNotificationCount > NOTIFICATION_BADGE_MAX
      ? `${NOTIFICATION_BADGE_MAX}+`
      : String(unreadNotificationCount);
  const notificationLinkLabel =
    unreadNotificationCount > 0
      ? `Notifications (${notificationCountLabel} new)`
      : "Notifications";

  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-md border-b border-border">
      <nav className="max-w-7xl mx-auto px-5 sm:px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
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
          <div className="hidden xl:flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
            {primaryLinks.map((link) => {
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
              <div ref={workspaceMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => toggleDesktopMenu("workspace")}
                  aria-expanded={openDesktopMenu === "workspace"}
                  aria-haspopup="menu"
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 ${
                    openDesktopMenu === "workspace" ||
                    workspaceLinks.some((link) => isActiveLink(link.href))
                      ? "bg-blue-soft text-brand-blue"
                      : "text-text-muted hover:bg-cyan-soft hover:text-brand-blue"
                  }`}
                >
                  Workspace
                  <ChevronIcon isOpen={openDesktopMenu === "workspace"} className="h-4 w-4" />
                </button>

                {openDesktopMenu === "workspace" ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-3 min-w-56 rounded-2xl border border-border bg-surface p-2 shadow-xl"
                  >
                    {workspaceLinks.map((link) => {
                      const isActive = isActiveLink(link.href);
                      return (
                        <Link
                          key={link.name}
                          href={link.href}
                          className={`block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-blue-soft text-brand-blue"
                              : "text-text-muted hover:bg-cyan-soft hover:text-brand-blue"
                          }`}
                        >
                          {link.name}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}

            {isEmployer ? (
              <div ref={employerMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => toggleDesktopMenu("employer")}
                  aria-expanded={openDesktopMenu === "employer"}
                  aria-haspopup="menu"
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 ${
                    openDesktopMenu === "employer" ||
                    employerLinks.some((link) => isActiveLink(link.href))
                      ? "bg-blue-soft text-brand-blue"
                      : "text-text-muted hover:bg-cyan-soft hover:text-brand-blue"
                  }`}
                >
                  Employer
                  <ChevronIcon isOpen={openDesktopMenu === "employer"} className="h-4 w-4" />
                </button>

                {openDesktopMenu === "employer" ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-3 min-w-56 rounded-2xl border border-border bg-surface p-2 shadow-xl"
                  >
                    {employerLinks.map((link) => {
                      const isActive = isActiveLink(link.href);
                      return (
                        <Link
                          key={link.name}
                          href={link.href}
                          className={`block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-blue-soft text-brand-blue"
                              : "text-text-muted hover:bg-cyan-soft hover:text-brand-blue"
                          }`}
                        >
                          {link.name}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}

            {isAdmin ? (
              <div ref={adminMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => toggleDesktopMenu("admin")}
                  aria-expanded={openDesktopMenu === "admin"}
                  aria-haspopup="menu"
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 ${
                    openDesktopMenu === "admin" ||
                    adminLinks.some((link) => isActiveLink(link.href))
                      ? "bg-blue-soft text-brand-blue"
                      : "text-text-muted hover:bg-cyan-soft hover:text-brand-blue"
                  }`}
                >
                  Admin
                  <ChevronIcon isOpen={openDesktopMenu === "admin"} className="h-4 w-4" />
                </button>

                {openDesktopMenu === "admin" ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-3 min-w-64 rounded-2xl border border-border bg-surface p-2 shadow-xl"
                  >
                    {adminLinks.map((link) => {
                      const isActive = isActiveLink(link.href);
                      return (
                        <Link
                          key={link.name}
                          href={link.href}
                          className={`block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-blue-soft text-brand-blue"
                              : "text-text-muted hover:bg-cyan-soft hover:text-brand-blue"
                          }`}
                        >
                          {link.name}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}

            {isLoggedIn ? (
              <>
                <Link
                  href="/notifications"
                  aria-label={notificationLinkLabel}
                  title={notificationLinkLabel}
                  className={`relative ml-2 rounded-xl p-3 transition-all duration-300 ${
                    isActiveLink("/notifications")
                      ? "bg-blue-soft text-brand-blue"
                      : "text-text-muted hover:bg-cyan-soft hover:text-brand-blue"
                  }`}
                >
                  <BellIcon className="h-5 w-5" />
                  {unreadNotificationCount > 0 ? (
                    <span
                      aria-label={`${notificationCountLabel} new notifications`}
                      className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white"
                    >
                      {notificationCountLabel}
                    </span>
                  ) : null}
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
            className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg transition-colors hover:bg-cyan-soft xl:hidden"
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
            overflow-hidden transition-all duration-300 ease-in-out xl:hidden
            ${isOpen ? "max-h-[600px] opacity-100 mt-4" : "max-h-0 opacity-0"}
          `}
        >
          <div className="flex flex-col gap-2 pt-4 border-t border-border">
            {primaryLinks.map((link) => {
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
              <div className="rounded-2xl border border-border bg-background/70">
                <button
                  type="button"
                  onClick={() => toggleMobileSection("workspace")}
                  aria-expanded={openMobileSections.workspace}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-navy"
                >
                  <span>Workspace</span>
                  <ChevronIcon isOpen={openMobileSections.workspace} className="h-4 w-4" />
                </button>

                {openMobileSections.workspace ? (
                  <div className="border-t border-border px-2 pb-2">
                    {workspaceLinks.map((link) => {
                      const isActive = isActiveLink(link.href);
                      return (
                        <Link
                          key={link.name}
                          href={link.href}
                          onClick={() => setIsOpen(false)}
                          className={`mt-2 block rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                            isActive
                              ? "bg-blue-soft text-brand-blue"
                              : "text-text-muted hover:bg-cyan-soft hover:text-brand-blue"
                          }`}
                        >
                          {link.name}
                        </Link>
                      );
                    })}
                  </div>
) : null}
              </div>
            ) : null}

            {isAdmin ? (
              <div className="rounded-2xl border border-border bg-background/70">
                <button
                  type="button"
                  onClick={() => toggleMobileSection("admin")}
                  aria-expanded={openMobileSections.admin}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-navy"
                >
                  <span>Admin</span>
                  <ChevronIcon isOpen={openMobileSections.admin} className="h-4 w-4" />
                </button>

                {openMobileSections.admin ? (
                  <div className="border-t border-border px-2 pb-2">
                    {adminLinks.map((link) => {
                      const isActive = isActiveLink(link.href);
                      return (
                        <Link
                          key={link.name}
                          href={link.href}
                          onClick={() => setIsOpen(false)}
                          className={`mt-2 block rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                            isActive
                              ? "bg-blue-soft text-brand-blue"
                              : "text-text-muted hover:bg-cyan-soft hover:text-brand-blue"
                          }`}
                        >
                          {link.name}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}

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
