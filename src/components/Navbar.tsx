"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Leaf,
  PlusCircle,
  Stethoscope,
  Home,
  LogOut,
  Bell,
  Download,
  User as UserIcon,
} from "lucide-react";

interface NavbarProps {
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [notifPermission, setNotifPermission] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) {
      alert("Votre navigateur ne supporte pas les notifications Web.");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      new Notification("WhatsUpPlant 🌿", {
        body: "Les rappels d'arrosage sont maintenant activés sur cet appareil !",
        icon: "/icon.svg",
      });
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  if (!user) return null;

  const navItems = [
    {
      href: "/",
      label: "Mes Plantes",
      icon: Home,
      active: pathname === "/",
    },
    {
      href: "/plants/new",
      label: "Ajouter",
      icon: PlusCircle,
      active: pathname === "/plants/new",
    },
    {
      href: "/diagnose",
      label: "Diagnostic IA",
      icon: Stethoscope,
      active: pathname.startsWith("/diagnose"),
    },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-botanical-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-botanical-700 text-white shadow-sm transition-transform group-hover:scale-105">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-botanical-900">
                WhatsUpPlant
              </span>
              <span className="hidden sm:inline-block ml-2 rounded-full bg-botanical-100 px-2 py-0.5 text-xs font-medium text-botanical-700">
                PWA & IA
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    item.active
                      ? "bg-botanical-700 text-white shadow-sm"
                      : "text-botanical-800 hover:bg-botanical-100/70"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {deferredPrompt && (
              <button
                onClick={handleInstallPwa}
                className="flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                title="Installer l'application sur votre écran d'accueil"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Installer l&apos;App</span>
              </button>
            )}

            {notifPermission !== "granted" && (
              <button
                onClick={handleEnableNotifications}
                className="flex items-center gap-1.5 rounded-xl border border-botanical-200 bg-botanical-50 px-3 py-1.5 text-xs font-medium text-botanical-800 hover:bg-botanical-100 transition-colors"
                title="Activer les rappels d'arrosage"
              >
                <Bell className="h-3.5 w-3.5 text-botanical-600" />
                <span className="hidden sm:inline">Activer rappels</span>
              </button>
            )}

            <div className="hidden sm:flex items-center gap-1.5 rounded-xl bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700">
              <UserIcon className="h-3.5 w-3.5 text-botanical-700" />
              <span className="max-w-[110px] truncate">{user.name}</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (PWA style) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden items-center justify-around border-t border-botanical-200/80 bg-white/95 backdrop-blur-md py-2 pb-safe shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-xs font-medium transition-colors ${
                item.active
                  ? "text-botanical-700 font-semibold"
                  : "text-stone-500 hover:text-botanical-700"
              }`}
            >
              <div
                className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                  item.active ? "bg-botanical-100 text-botanical-800" : ""
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
