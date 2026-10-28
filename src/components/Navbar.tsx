"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  Shield,
  UserPlus,
  Copy,
  Check,
  Trash2,
  Users,
  X,
  Loader2,
  Link2,
  KeyRound,
  Lock,
  Mail,
} from "lucide-react";

interface NavbarProps {
  user?: {
    id: string;
    name: string;
    email: string;
    isAdmin?: boolean;
  } | null;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface AdminInvitationItem {
  id: string;
  token: string;
  label: string | null;
  email: string | null;
  expiresAt: string;
  usedAt: string | null;
  usedByEmail: string | null;
  usedByName: string | null;
  createdAt: string;
}

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  plantsCount: number;
  isAdmin: boolean;
  activeResetToken?: string | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [notifPermission, setNotifPermission] =
    useState<NotificationPermission>("default");
  const [isDark, setIsDark] = useState(false);

  // Profile Modal states
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Admin Modal states
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<"invites" | "users">("invites");
  const [adminLoading, setAdminLoading] = useState(false);
  const [invitations, setInvitations] = useState<AdminInvitationItem[]>([]);
  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [inviteLabel, setInviteLabel] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDays, setInviteDays] = useState(7);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generatingResetForUserId, setGeneratingResetForUserId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfileEmail(user.email);
    }
  }, [user]);

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

  const openProfileModal = () => {
    if (!user) return;
    setProfileName(user.name);
    setProfileEmail(user.email);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setProfileError(null);
    setProfileSuccess(null);
    setProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (newPassword && newPassword !== confirmNewPassword) {
      setProfileError(
        "Le nouveau mot de passe et sa confirmation ne correspondent pas."
      );
      return;
    }

    setProfileSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || "Erreur lors de la mise à jour.");
        setProfileSaving(false);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setProfileSuccess("Votre profil a bien été mis à jour ! ✨");
      router.refresh();
    } catch {
      setProfileError("Impossible de contacter le serveur.");
    } finally {
      setProfileSaving(false);
    }
  };

  const fetchAdminData = useCallback(async () => {
    setAdminLoading(true);
    try {
      const res = await fetch("/api/admin/invitations");
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
        setUsersList(data.users || []);
      }
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const openAdminModal = () => {
    setAdminOpen(true);
    fetchAdminData();
  };

  const buildInviteUrl = (token: string) => {
    if (typeof window === "undefined") return `/register?invite=${token}`;
    return `${window.location.origin}/register?invite=${token}`;
  };

  const buildResetUrl = (token: string) => {
    if (typeof window === "undefined") return `/reset-password?token=${token}`;
    return `${window.location.origin}/reset-password?token=${token}`;
  };

  const copyInviteLink = async (id: string, token: string) => {
    const url = buildInviteUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // fallback
    }
  };

  const copyResetLink = async (userId: string, token: string) => {
    const url = buildResetUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(`reset_${userId}`);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // fallback
    }
  };

  const handleGenerateResetLinkForUser = async (targetUser: AdminUserItem) => {
    if (targetUser.activeResetToken) {
      await copyResetLink(targetUser.id, targetUser.activeResetToken);
      return;
    }

    setGeneratingResetForUserId(targetUser.id);
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_password",
          userId: targetUser.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.resetToken) {
        setUsersList((prev) =>
          prev.map((u) =>
            u.id === targetUser.id
              ? { ...u, activeResetToken: data.resetToken }
              : u
          )
        );
        await copyResetLink(targetUser.id, data.resetToken);
      }
    } finally {
      setGeneratingResetForUserId(null);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingInvite(true);
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: inviteLabel,
          email: inviteEmail,
          expiresInDays: inviteDays,
        }),
      });
      const data = await res.json();
      if (res.ok && data.invitation) {
        setInvitations((prev) => [data.invitation, ...prev]);
        setInviteLabel("");
        setInviteEmail("");
        await copyInviteLink(data.invitation.id, data.invitation.token);
      }
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleDeleteInvitation = async (inviteId: string) => {
    setDeletingId(inviteId);
    try {
      const res = await fetch(
        `/api/admin/invitations?inviteId=${encodeURIComponent(inviteId)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setInvitations((prev) => prev.filter((i) => i.id !== inviteId));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteUser = async (target: AdminUserItem) => {
    if (
      !window.confirm(
        `Voulez-vous vraiment supprimer le compte de "${target.name}" (${target.email}) ainsi que ses ${target.plantsCount} plante(s) ?`
      )
    ) {
      return;
    }
    setDeletingId(target.id);
    try {
      const res = await fetch(
        `/api/admin/invitations?userId=${encodeURIComponent(target.id)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setUsersList((prev) => prev.filter((u) => u.id !== target.id));
      }
    } finally {
      setDeletingId(null);
    }
  };

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
      {/* User Profile Edit Modal */}
      {profileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !profileSaving && setProfileOpen(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 bg-botanical-50/70 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-botanical-700 text-white shadow-sm">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-stone-900">
                    Mon Profil
                  </h2>
                  <p className="text-xs text-stone-600">
                    Modifier mon nom, mon email ou mon mot de passe
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                disabled={profileSaving}
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-200/60 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveProfile}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              {profileError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
                  {profileError}
                </div>
              )}

              {profileSuccess && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
                  {profileSuccess}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold text-stone-700">
                  Prénom ou pseudo
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-sm focus:border-botanical-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-stone-700">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-sm focus:border-botanical-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-stone-200/80 pt-4 space-y-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-stone-500">
                  Changer le mot de passe (optionnel)
                </p>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">
                    Mot de passe actuel
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Requis uniquement si vous changez de MDP"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-xs focus:border-botanical-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-700">
                      Nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 caractères"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs focus:border-botanical-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-700">
                      Confirmer le MDP
                    </label>
                    <input
                      type="password"
                      minLength={6}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Répéter le MDP"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs focus:border-botanical-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProfileOpen(false)}
                  disabled={profileSaving}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-botanical-700 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-botanical-800 disabled:opacity-50 transition-colors"
                >
                  {profileSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Invitations & Users Modal */}
      {adminOpen && user.isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setAdminOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 bg-botanical-50/70 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-botanical-700 text-white shadow-sm">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-stone-900">
                    Administration & Liens d&apos;invitation
                  </h2>
                  <p className="text-xs text-stone-600">
                    Invitations à usage unique, comptes et réinitialisation de
                    mots de passe
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-200/60 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-stone-200/80 bg-stone-50/70 px-6 pt-2 gap-2">
              <button
                type="button"
                onClick={() => setAdminTab("invites")}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-extrabold transition-colors ${
                  adminTab === "invites"
                    ? "border-botanical-700 text-botanical-800"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Liens d&apos;invitation ({invitations.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminTab("users")}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-extrabold transition-colors ${
                  adminTab === "users"
                    ? "border-botanical-700 text-botanical-800"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Comptes inscrits ({usersList.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
              {adminLoading ? (
                <div className="py-12 text-center text-xs text-stone-500 flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-botanical-700" />
                  Chargement des données d&apos;administration...
                </div>
              ) : adminTab === "invites" ? (
                <>
                  {/* Create Invite Form */}
                  <form
                    onSubmit={handleCreateInvitation}
                    className="rounded-2xl border border-botanical-200 bg-botanical-50/40 p-4 space-y-3"
                  >
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-botanical-900 flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-botanical-700" />
                      Nouveau lien d&apos;invitation à usage unique
                    </h3>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          Note / Destinataire (optionnel)
                        </label>
                        <input
                          type="text"
                          value={inviteLabel}
                          onChange={(e) => setInviteLabel(e.target.value)}
                          placeholder="Ex: Pour Camille"
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs focus:border-botanical-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          Email imposé (optionnel)
                        </label>
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="Libre si vide"
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs focus:border-botanical-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          Validité du lien
                        </label>
                        <select
                          value={inviteDays}
                          onChange={(e) =>
                            setInviteDays(Number(e.target.value) || 7)
                          }
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs focus:border-botanical-600 focus:outline-none"
                        >
                          <option value={1}>24 heures (1 jour)</option>
                          <option value={7}>7 jours</option>
                          <option value={30}>30 jours</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={creatingInvite}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-botanical-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-botanical-800 disabled:opacity-50 transition-colors"
                      >
                        {creatingInvite ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                        Générer & copier le lien
                      </button>
                    </div>
                  </form>

                  {/* Invitations List */}
                  <div className="space-y-2.5">
                    {invitations.length === 0 ? (
                      <p className="py-6 text-center text-xs text-stone-500">
                        Aucun lien d&apos;invitation généré pour le moment.
                      </p>
                    ) : (
                      invitations.map((inv) => {
                        const isUsed = Boolean(inv.usedAt);
                        const isExpired =
                          !isUsed && new Date(inv.expiresAt) < new Date();

                        return (
                          <div
                            key={inv.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-stone-50/70 p-3.5 text-xs"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-stone-900">
                                  {inv.label || "Invitation sans note"}
                                </span>
                                {isUsed ? (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                    ✓ Utilisée par {inv.usedByName} (
                                    {inv.usedByEmail})
                                  </span>
                                ) : isExpired ? (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                    Expirée
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">
                                    Active • Expire le{" "}
                                    {new Date(inv.expiresAt).toLocaleDateString(
                                      "fr-FR"
                                    )}
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-stone-500 truncate font-mono">
                                {buildInviteUrl(inv.token)}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!isUsed && !isExpired && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyInviteLink(inv.id, inv.token)
                                  }
                                  className="inline-flex items-center gap-1 rounded-xl border border-botanical-200 bg-white px-3 py-1.5 text-xs font-bold text-botanical-800 hover:bg-botanical-50 transition-colors"
                                >
                                  {copiedId === inv.id ? (
                                    <>
                                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                                      Copié !
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3.5 w-3.5" />
                                      Copier le lien
                                    </>
                                  )}
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={deletingId === inv.id}
                                onClick={() => handleDeleteInvitation(inv.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                                title="Révoquer / supprimer cette invitation"
                              >
                                {deletingId === inv.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                /* Users Tab */
                <div className="space-y-2.5">
                  {usersList.map((u) => (
                    <div
                      key={u.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-stone-50/70 p-3.5 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-stone-900">
                            {u.name}
                          </span>
                          {u.isAdmin && (
                            <span className="rounded-full bg-botanical-100 px-2 py-0.5 text-[10px] font-extrabold text-botanical-800">
                              Administrateur
                            </span>
                          )}
                          <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-[10px] font-bold text-stone-700">
                            {u.plantsCount} plante{u.plantsCount > 1 ? "s" : ""}
                          </span>
                          {u.activeResetToken && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              🔑 Lien reset actif
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {u.email} • Inscrit le{" "}
                          {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          disabled={generatingResetForUserId === u.id}
                          onClick={() => handleGenerateResetLinkForUser(u)}
                          className="inline-flex items-center gap-1 rounded-xl border border-botanical-200 bg-white px-3 py-1.5 text-xs font-bold text-botanical-800 hover:bg-botanical-50 disabled:opacity-50 transition-colors"
                          title="Générer et copier un lien de réinitialisation de mot de passe (valable 24h)"
                        >
                          {generatingResetForUserId === u.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : copiedId === `reset_${u.id}` ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              Lien copié !
                            </>
                          ) : (
                            <>
                              <KeyRound className="h-3.5 w-3.5 text-botanical-700" />
                              {u.activeResetToken
                                ? "Copier lien reset"
                                : "Lien Reset MDP"}
                            </>
                          )}
                        </button>

                        {!u.isAdmin && (
                          <button
                            type="button"
                            disabled={deletingId === u.id}
                            onClick={() => handleDeleteUser(u)}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                          >
                            {deletingId === u.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
              {user.isAdmin && (
                <button
                  type="button"
                  onClick={openAdminModal}
                  className="flex items-center gap-1.5 rounded-xl border border-botanical-300 bg-botanical-50 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-botanical-800 hover:bg-botanical-100 transition-colors"
                  title="Générer des liens d'invitation et gérer les comptes"
                >
                  <UserPlus className="h-3.5 w-3.5 text-botanical-700" />
                  <span className="hidden sm:inline">Inviter</span>
                </button>
              )}

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

              <button
                type="button"
                onClick={openProfileModal}
                className="flex items-center gap-1.5 rounded-xl border border-stone-200/80 bg-stone-50 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-botanical-50 hover:border-botanical-200 transition-colors"
                title="Modifier mon profil (nom, email, mot de passe)"
              >
                <UserIcon className="h-3.5 w-3.5 text-botanical-700" />
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {user.name}
                </span>
              </button>

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
