"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, Lock, Mail, ArrowRight, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur de connexion");
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

  return (
    <div className="mx-auto mt-6 max-w-md">
      <div className="overflow-hidden rounded-3xl border border-botanical-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-botanical-700 text-white shadow-md">
            <Leaf className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">
            Bon retour sur WhatsUpPlant
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Retrouvez vos plantes, vos rappels d&apos;arrosage et le docteur IA.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Adresse email
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

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm focus:border-botanical-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-botanical-700 py-3 text-sm font-semibold text-white shadow-sm hover:bg-botanical-800 disabled:opacity-60 transition-colors"
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 border-t border-stone-100 pt-5 text-center">
          <p className="text-sm text-stone-600">
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              className="font-semibold text-botanical-700 hover:underline"
            >
              Créer un espace jardin
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-botanical-200/70 bg-botanical-50/80 p-4 text-center text-xs text-botanical-900">
        <Sparkles className="mr-1.5 inline h-4 w-4 text-botanical-700" />
        Astuce : sur mobile (iOS Safari ou Android Chrome), ajoutez
        l&apos;application à votre écran d&apos;accueil pour l&apos;utiliser en
        plein écran comme une application native.
      </div>
    </div>
  );
}
