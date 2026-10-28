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
  Moon,
  Sun,
  Sparkles,
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
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));

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

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("whatsupplant_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("whatsupplant_theme", "light");
    }
  };

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

  if (!user) {
    return (
      <div className="fixed right-4 top-4 z-40">
        <button
          type="button"
          onClick={toggleTheme}
          className="glass-pill flex h-10 w-10 items-center justify-center rounded-2xl text-stone-700 shadow-sm hover:bg-white transition-all"
          title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-botanical-800" />
          )}
        </button>
      </div>
    );
  }

  const navItems = [
    {
      href: "/",
      label: "Ma Jungle",
      icon: Home,
      active: pathname === "/",
    },
    {
      href: "/plants/new",
      label: "Nouvelle Plante",
      icon: PlusCircle,
      active: pathname === "/plants/new",
    },
    {
      href: "/diagnose",
      label: "Docteur IA",
      icon: Stethoscope,
      active: pathname.startsWith("/diagnose"),
    },
  ];

  return (
    <>
      {/* Floating Pill Glass Top Header */}
      <header className="sticky top-0 z-30 pt-3 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="bento-card flex items-center justify-between rounded-2xl px-4 py-2.5">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-botanical-600 to-botanical-800 text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
                <Leaf className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-lg font-extrabold tracking-tight text-stone-900">
                    WhatsUpPlant
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-botanical-100/80 border border-botanical-200/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-botanical-800">
                    <Sparkles className="h-2.5 w-2.5 text-botanical-600" />
                    Bento IA
                  </span>
                </div>
                <span className="hidden lg:block text-[11px] font-medium text-stone-500">
                  Jardin connecté & Carnet de santé
                </span>
              </div>
            </Link>

            {/* Desktop Pill Navigation */}
            <nav className="hidden md:flex items-center gap-1 rounded-xl bg-stone-100/80 p-1 border border-stone-200/60">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                      item.active
                        ? "bg-botanical-700 text-white shadow-sm"
                        : "text-stone-700 hover:bg-white hover:text-botanical-800"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {deferredPrompt && (
                <button
                  onClick={handleInstallPwa}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                  title="Installer l'application sur votre écran d'accueil"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Installer</span>
                </button>
              )}

              {notifPermission !== "granted" && (
                <button
                  onClick={handleEnableNotifications}
                  className="flex items-center gap-1.5 rounded-xl border border-botanical-200 bg-botanical-50 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-botanical-800 hover:bg-botanical-100 transition-colors"
                  title="Activer les rappels d'arrosage"
                >
                  <Bell className="h-3.5 w-3.5 text-botanical-600" />
                  <span className="hidden xl:inline">Rappels</span>
                </button>
              )}

              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200/80 bg-white/90 text-stone-700 hover:bg-stone-100 transition-colors"
                title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
              >
                {isDark ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-botanical-800" />
                )}
              </button>

              <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-stone-200/70 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700">
                <UserIcon className="h-3.5 w-3.5 text-botanical-700" />
                <span className="max-w-[100px] truncate">{user.name}</span>
              </div>

              <button
                onClick={handleLogout}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200/80 bg-white/90 text-stone-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                title="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Floating Glass Dock Navigation Bar */}
      <nav className="fixed bottom-3 left-3 right-3 z-30 flex md:hidden items-center justify-around rounded-2xl bento-card py-2 px-2 shadow-xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-bold transition-all ${
                item.active
                  ? "bg-botanical-700 text-white shadow-sm"
                  : "text-stone-600 hover:text-botanical-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
