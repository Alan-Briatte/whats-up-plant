"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Stethoscope,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  ArrowLeft,
  ClipboardList,
  Bug,
  HeartPulse,
} from "lucide-react";
import { ImagePicker } from "@/components/ImagePicker";
import { PlantDiagnosisResult } from "@/lib/gemini";

const SYMPTOM_CHIPS = [
  "Feuilles inférieures qui jaunissent",
  "Pointes brunes et sèches",
  "Amas blancs / cochenilles / parasites",
  "Feuilles molles et tombantes",
  "Taches noires sur les feuilles",
  "Vérification de routine (plante en bonne santé)",
];

interface UserPlantOption {
  id: string;
  nickname: string;
  species: string;
  imageUrl: string | null;
}

function DiagnoseContent() {
  const searchParams = useSearchParams();
  const initialPlantId = searchParams.get("plantId") || "";

  const [plants, setPlants] = useState<UserPlantOption[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState(initialPlantId);
  const [imageUrl, setImageUrl] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PlantDiagnosisResult | null>(null);

  useEffect(() => {
    fetch("/api/plants")
      .then((res) => res.json())
      .then((data) => {
        if (data.plants) {
          setPlants(data.plants);
          if (initialPlantId) {
            const match = data.plants.find(
              (p: UserPlantOption) => p.id === initialPlantId
            );
            if (match && match.imageUrl) {
              setImageUrl(match.imageUrl);
            }
          }
        }
      })
      .catch(() => {});
  }, [initialPlantId]);

  const handlePlantSelect = (id: string) => {
    setSelectedPlantId(id);
    const match = plants.find((p) => p.id === id);
    if (match && match.imageUrl && !imageUrl) {
      setImageUrl(match.imageUrl);
    }
  };

  const toggleSymptomChip = (chip: string) => {
    if (symptoms.includes(chip)) {
      setSymptoms(symptoms.replace(chip, "").replace(/,\s*,/g, ",").trim());
    } else {
      setSymptoms((prev) => (prev ? `${prev}, ${chip}` : chip));
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!imageUrl) {
      setError(
        "Veuillez prendre ou sélectionner une photo de la plante ou de la feuille malade."
      );
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageUrl,
          symptoms,
          plantId: selectedPlantId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'analyse IA.");
        setLoading(false);
        return;
      }
      setResult(data.diagnosis);
    } catch {
      setError("Impossible de contacter le service de diagnostic IA.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-botanical-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </Link>
      </div>

      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-botanical-800 via-botanical-700 to-teal-800 p-6 sm:p-8 text-white shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <Stethoscope className="h-6 w-6 text-emerald-200" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              Docteur Plante IA — Diagnostic & Soins 🩺
            </h1>
            <p className="mt-1 text-sm text-botanical-100">
              Photographiez une feuille ou votre plante entière : l&apos;IA
              détecte les maladies, parasites ou carences et génère un protocole
              de soin sur mesure.
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleAnalyze}
        className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm space-y-6"
      >
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Link to existing plant */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-stone-800">
            1. Associer à l&apos;une de vos plantes (optionnel)
          </label>
          <select
            value={selectedPlantId}
            onChange={(e) => handlePlantSelect(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-botanical-600 focus:bg-white focus:outline-none"
          >
            <option value="">
              -- Diagnostic libre (sans associer à un profil existant) --
            </option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                🪴 {p.nickname} ({p.species})
              </option>
            ))}
          </select>
        </div>

        {/* Photo Picker */}
        <ImagePicker
          value={imageUrl}
          onChange={setImageUrl}
          label="2. Photo de la plante ou des feuilles touchées *"
        />

        {/* Symptoms */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-stone-800">
            3. Symptômes observés (cliquez ou décrivez)
          </label>
          <div className="mb-3 flex flex-wrap gap-2">
            {SYMPTOM_CHIPS.map((chip) => {
              const active = symptoms.includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleSymptomChip(chip)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-botanical-700 text-white shadow-sm"
                      : "bg-stone-100 text-stone-700 hover:bg-botanical-50 hover:text-botanical-800"
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
          <textarea
            rows={2}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Décrivez ce que vous observez (ex: feuilles qui jaunissent depuis 1 semaine, terreau humide...)"
            className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm focus:border-botanical-600 focus:bg-white focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-botanical-700 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-botanical-800 disabled:opacity-60 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyse phytopathologique en cours...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Lancer le diagnostic IA & obtenir le plan de soin
            </>
          )}
        </button>
      </form>

      {/* Diagnosis Result Card */}
      {result && (
        <div className="overflow-hidden rounded-3xl border-2 border-botanical-300 bg-white shadow-md space-y-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-5">
            <div className="flex items-center gap-3">
              {result.status === "CRITICAL" ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              ) : result.status === "WARNING" ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <HeartPulse className="h-6 w-6" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-stone-900">
                    Rapport de Diagnostic Botanique
                  </h2>
                  {result.isDemoMode && (
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-600">
                      Simulation IA
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500">
                  Plante analysée : <strong>{result.plantDetected}</strong> •
                  Fiabilité : <strong>{result.confidence}%</strong>
                </p>
                {result.fallbackReason && (
                  <p className="mt-1 text-[11px] text-amber-800">
                    ℹ️ {result.fallbackReason}
                  </p>
                )}
              </div>
            </div>

            <span
              className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                result.status === "CRITICAL"
                  ? "bg-red-100 text-red-800"
                  : result.status === "WARNING"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {result.status === "CRITICAL"
                ? "Intervention urgente requise"
                : result.status === "WARNING"
                ? "Attention & soin recommandés"
                : "Plante en bonne santé"}
            </span>
          </div>

          {/* Summary */}
          <div className="rounded-2xl bg-botanical-50/70 border border-botanical-200/80 p-4 text-sm text-stone-800 leading-relaxed">
            <strong className="block mb-1 text-botanical-900">
              Synthèse de l&apos;analyse :
            </strong>
            {result.summary}
          </div>

          {/* Detected Issues */}
          {result.issues && result.issues.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-700">
                <Bug className="h-4 w-4 text-amber-600" />
                Problèmes & causes identifiés ({result.issues.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {result.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-stone-900">
                        {issue.name}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          issue.severity === "HIGH"
                            ? "bg-red-100 text-red-800"
                            : issue.severity === "MEDIUM"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        Sévérité {issue.severity}
                      </span>
                    </div>
                    <p className="text-xs text-stone-700">
                      <strong>Symptômes :</strong> {issue.symptoms}
                    </p>
                    <p className="text-xs text-stone-600">
                      <strong>Cause probable :</strong> {issue.cause}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step-by-step Treatment Plan */}
          {result.treatments && result.treatments.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-700">
                <ClipboardList className="h-4 w-4 text-botanical-700" />
                Protocole de soin étape par étape
              </h3>
              <div className="space-y-3">
                {result.treatments.map((t) => (
                  <div
                    key={t.step}
                    className="flex items-start gap-3.5 rounded-2xl border border-stone-200 bg-stone-50/70 p-4"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-botanical-700 text-xs font-bold text-white">
                      {t.step}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-stone-900">
                          {t.title}
                        </h4>
                        <span className="rounded-lg bg-white border border-stone-200 px-2.5 py-0.5 text-xs font-medium text-botanical-800">
                          ⏱ {t.timeframe}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                        {t.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prevention Tips */}
          {result.preventionTips && result.preventionTips.length > 0 && (
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 space-y-2">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                Conseils de prévention long terme
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-xs text-emerald-950">
                {result.preventionTips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {selectedPlantId && (
            <div className="flex items-center justify-between border-t border-stone-100 pt-4 text-xs text-stone-600">
              <span>
                ✅ Ce diagnostic a été enregistré sur la fiche de votre plante.
              </span>
              <Link
                href={`/plants/${selectedPlantId}`}
                className="font-semibold text-botanical-700 hover:underline"
              >
                Voir le profil de la plante →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DiagnosePage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm text-stone-500">
          Chargement du module de diagnostic IA...
        </div>
      }
    >
      <DiagnoseContent />
    </Suspense>
  );
}
