"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, Lock, Mail, User, ArrowRight, Sparkles } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [seedDemoPlants, setSeedDemoPlants] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, seedDemoPlants }),
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

  return (
    <div className="mx-auto mt-6 max-w-md">
      <div className="bento-card overflow-hidden rounded-3xl p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-botanical-700 text-white shadow-md">
            <Leaf className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">
            Créer votre jungle intérieure
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Suivez l&apos;arrosage et la santé de vos plantes avec l&apos;IA.
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm focus:border-botanical-600 focus:bg-white focus:outline-none"
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
        <span>Propulsé par Google Gemini Vision pour le diagnostic botanique</span>
      </div>
    </div>
  );
}
