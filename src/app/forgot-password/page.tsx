"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Leaf,
  Mail,
  ArrowLeft,
  Send,
  CheckCircle2,
  KeyRound,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<{
    emailSent: boolean;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de la demande.");
        setLoading(false);
        return;
      }
      setSubmitted({ emailSent: Boolean(data.emailSent) });
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-6 max-w-md">
      <div className="bento-card overflow-hidden rounded-3xl p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-botanical-600 to-botanical-800 text-white shadow-md">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
            Mot de passe oublié ?
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Saisissez l&apos;adresse email de votre compte pour demander un lien
            de réinitialisation.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-900 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                Demande enregistrée
              </div>
              {submitted.emailSent ? (
                <p className="leading-relaxed">
                  Si un compte correspond à <strong>{email}</strong>, un email
                  contenant votre lien de réinitialisation (valable 24 heures)
                  vient de vous être envoyé.
                </p>
              ) : (
                <p className="leading-relaxed">
                  Votre demande de réinitialisation pour{" "}
                  <strong>{email}</strong> est prête ! Demandez à
                  l&apos;administrateur de vous envoyer votre lien de secours
                  depuis son panneau <strong>Inviter → Comptes inscrits</strong>.
                </p>
              )}
            </div>

            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-botanical-700 py-3 text-sm font-semibold text-white shadow-sm hover:bg-botanical-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                Votre adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm focus:border-botanical-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-botanical-700 py-3 text-sm font-semibold text-white shadow-sm hover:bg-botanical-800 disabled:opacity-60 transition-colors"
            >
              <Send className="h-4 w-4" />
              {loading
                ? "Envoi en cours..."
                : "Demander un lien de réinitialisation"}
            </button>
          </form>
        )}

        <div className="mt-6 border-t border-stone-100 pt-5 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-botanical-700 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à la page de connexion
          </Link>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-stone-500">
        <Leaf className="h-3.5 w-3.5 text-botanical-600" />
        <span>WhatsUpPlant — Récupération sécurisée de compte</span>
      </div>
    </div>
  );
}

