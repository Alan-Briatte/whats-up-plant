"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Check,
  Loader2,
  ShieldAlert,
  KeyRound,
  ArrowLeft,
} from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [reason, setReason] = useState("");
  const [userInfo, setUserInfo] = useState<{
    name: string;
    email: string;
  } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setValid(false);
      setReason("Aucun jeton de réinitialisation fourni dans l'URL.");
      return;
    }

    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setValid(true);
          setUserInfo(data.user || null);
        } else {
          setValid(false);
          setReason(
            data.reason || "Ce lien de réinitialisation est invalide ou expiré."
          );
        }
      })
      .catch(() => {
        setValid(false);
        setReason("Impossible de vérifier le lien de réinitialisation.");
      })
      .finally(() => setChecking(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de la réinitialisation.");
        setSaving(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Erreur réseau.");
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="mx-auto mt-12 max-w-md">
        <div className="bento-card rounded-3xl p-8 text-center space-y-3">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-botanical-700" />
          <p className="text-sm font-bold text-stone-800">
            Vérification du lien de réinitialisation...
          </p>
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="mx-auto mt-6 max-w-md">
        <div className="bento-card overflow-hidden rounded-3xl p-8 text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-700">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-stone-900">
              Lien invalide ou expiré
            </h1>
            <p className="mt-1.5 text-xs text-stone-600">{reason}</p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/forgot-password"
              className="rounded-xl bg-botanical-700 py-2.5 text-xs font-bold text-white hover:bg-botanical-800 transition-colors"
            >
              Faire une nouvelle demande
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-stone-600 hover:text-botanical-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour à la connexion
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
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
            Nouveau mot de passe
          </h1>
          {userInfo && (
            <p className="mt-1 text-xs font-medium text-stone-600">
              Compte : <strong>{userInfo.name}</strong> ({userInfo.email})
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Nouveau mot de passe (min. 6 caractères)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm focus:border-botanical-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Confirmer le nouveau mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm focus:border-botanical-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-botanical-700 py-3 text-sm font-semibold text-white shadow-sm hover:bg-botanical-800 disabled:opacity-60 transition-colors"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {saving
              ? "Enregistrement..."
              : "Enregistrer et me connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm text-stone-500">
          Chargement...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

