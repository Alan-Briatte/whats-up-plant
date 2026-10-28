"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Leaf,
  Lock,
  Mail,
  User,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  TicketCheck,
  Loader2,
  KeyRound,
} from "lucide-react";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken =
    searchParams.get("invite") || searchParams.get("token") || "";

  const [inviteToken, setInviteToken] = useState(urlToken);
  const [manualInput, setManualInput] = useState("");
  const [checkingInvite, setCheckingInvite] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);
  const [adminExists, setAdminExists] = useState(true);
  const [inviteReason, setInviteReason] = useState("");
  const [inviteMeta, setInviteMeta] = useState<{
    label: string | null;
    email: string | null;
    expiresAt: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [seedDemoPlants, setSeedDemoPlants] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyToken = async (tokenToVerify: string) => {
    setCheckingInvite(true);
    setError("");
    try {
      const res = await fetch(
        `/api/auth/invite?token=${encodeURIComponent(tokenToVerify)}`
      );
      const data = await res.json();
      setAdminExists(Boolean(data.adminExists));
      if (data.valid) {
        setInviteValid(true);
        setInviteMeta(data.invitation || null);
        if (data.invitation?.email) {
          setEmail(data.invitation.email);
        }
      } else {
        setInviteValid(false);
        setInviteReason(
          data.reason || "Lien d'invitation invalide ou expiré."
        );
      }
    } catch {
      setInviteValid(false);
      setInviteReason("Impossible de vérifier le lien d'invitation.");
    } finally {
      setCheckingInvite(false);
    }
  };

  useEffect(() => {
    setInviteToken(urlToken);
    verifyToken(urlToken);
  }, [urlToken]);

  const handleApplyManualInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = manualInput.trim();
    if (!raw) return;

    let extracted = raw;
    try {
      if (raw.includes("invite=") || raw.includes("token=")) {
        const u = new URL(
          raw.startsWith("http") ? raw : `https://dummy.local/${raw}`
        );
        extracted =
          u.searchParams.get("invite") || u.searchParams.get("token") || raw;
      }
    } catch {
      // keep raw
    }
    setInviteToken(extracted);
    verifyToken(extracted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          seedDemoPlants,
          inviteToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'inscription");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
    }
  };

  if (checkingInvite) {
    return (
      <div className="mx-auto mt-12 max-w-md">
        <div className="bento-card rounded-3xl p-8 text-center space-y-3">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-botanical-700" />
          <p className="text-sm font-bold text-stone-800">
            Vérification de votre lien d&apos;invitation...
          </p>
        </div>
      </div>
    );
  }

  // Si l'invitation n'est pas valide et que le compte admin existe déjà -> on bloque l'accès
  if (!inviteValid && adminExists) {
    return (
      <div className="mx-auto mt-6 max-w-md">
        <div className="bento-card overflow-hidden rounded-3xl p-8 text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-sm">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-stone-900">
              Inscription sur invitation uniquement 🔒
            </h1>
            <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
              {inviteReason ||
                "Cette instance WhatsUpPlant est privée. Vous devez disposer d'un lien d'invitation généré par l'administrateur pour créer un compte."}
            </p>
          </div>

          <form
            onSubmit={handleApplyManualInvite}
            className="space-y-2.5 text-left border-t border-stone-200/70 pt-4"
          >
            <label className="block text-xs font-bold text-stone-700">
              Vous avez reçu un code ou un lien d&apos;invitation ?
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Collez le lien ou le jeton ici..."
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-xs focus:border-botanical-600 focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-botanical-700 px-4 py-2 text-xs font-bold text-white hover:bg-botanical-800 transition-colors"
              >
                Valider
              </button>
            </div>
          </form>

          <div className="border-t border-stone-100 pt-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-botanical-700 hover:underline"
            >
              Retour à la page de connexion →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-6 max-w-md">
      <div className="bento-card overflow-hidden rounded-3xl p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-botanical-600 to-botanical-800 text-white shadow-md">
            <Leaf className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
            Créer votre jungle intérieure
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Suivez l&apos;arrosage et la santé de vos plantes avec l&apos;IA.
          </p>
        </div>

        {inviteValid && (
          <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-xs text-emerald-900">
            <TicketCheck className="h-5 w-5 flex-shrink-0 text-emerald-700" />
            <div>
              <p className="font-bold">
                Invitation validée
                {inviteMeta?.label ? ` — ${inviteMeta.label}` : ""}
              </p>
              <p className="text-[11px] text-emerald-800">
                Ce lien à usage unique sera activé dès la création de votre
                compte.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Votre prénom ou pseudo
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Camille"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm focus:border-botanical-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Adresse email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type="email"
                required
                readOnly={Boolean(inviteMeta?.email)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm focus:border-botanical-600 focus:bg-white focus:outline-none read-only:opacity-75"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Mot de passe (min. 6 caractères)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm focus:border-botanical-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-botanical-200 bg-botanical-50/70 p-3.5">
            <input
              type="checkbox"
              checked={seedDemoPlants}
              onChange={(e) => setSeedDemoPlants(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-botanical-300 text-botanical-700 focus:ring-botanical-600"
            />
            <span className="text-xs text-stone-700">
              <strong className="font-semibold text-botanical-900">
                Inclure 2 plantes d&apos;exemple (Monstera & Calathea)
              </strong>{" "}
              pour tester immédiatement les rappels d&apos;arrosage et le
              tableau de bord.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-botanical-700 py-3 text-sm font-semibold text-white shadow-sm hover:bg-botanical-800 disabled:opacity-60 transition-colors"
          >
            {loading ? "Création du compte..." : "Créer mon compte"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 border-t border-stone-100 pt-5 text-center">
          <p className="text-sm text-stone-600">
            Déjà inscrit ?{" "}
            <Link
              href="/login"
              className="font-semibold text-botanical-700 hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-stone-500">
        <Sparkles className="h-3.5 w-3.5 text-botanical-600" />
        <span>
          Propulsé par Google Gemini Vision pour le diagnostic botanique
        </span>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm text-stone-500">
          Chargement...
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
