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
  Images,
  Image as ImageIcon,
} from "lucide-react";
import { MultiImagePicker } from "@/components/MultiImagePicker";
import { PlantDiagnosisResult } from "@/lib/gemini";
import { deepDecodeHtmlEntities } from "@/lib/utils";

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

interface DiagnosisResponseWithImages extends PlantDiagnosisResult {
  id?: string;
  images?: string[];
}

function DiagnoseContent() {
  const searchParams = useSearchParams();
  const initialPlantId = searchParams.get("plantId") || "";

  const [plants, setPlants] = useState<UserPlantOption[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState(initialPlantId);
  const [useMainPhoto, setUseMainPhoto] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DiagnosisResponseWithImages | null>(
    null
  );

  useEffect(() => {
    fetch("/api/plants")
      .then((res) => res.json())
      .then((data) => {
        if (data.plants && Array.isArray(data.plants)) {
          setPlants(data.plants);
          if (initialPlantId) {
            setSelectedPlantId(initialPlantId);
          } else if (data.plants.length === 1) {
            setSelectedPlantId(data.plants[0].id);
          }
        }
      })
      .catch(() => {});
  }, [initialPlantId]);

  const selectedPlant = plants.find((p) => p.id === selectedPlantId) || null;
  const hasMainPhoto = Boolean(selectedPlant?.imageUrl);

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

    const finalImages: string[] = [];
    if (hasMainPhoto && useMainPhoto && selectedPlant?.imageUrl) {
      finalImages.push(selectedPlant.imageUrl);
    }
    for (const img of images) {
      if (img && !finalImages.includes(img)) {
        finalImages.push(img);
      }
    }

    if (finalImages.length === 0) {
      setError(
        "Veuillez ajouter au moins une photo ou cocher l'utilisation de la photo principale de la plante."
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
          images: finalImages,
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
      setResult(deepDecodeHtmlEntities(data.diagnosis));
    } catch {
      setError("Impossible de contacter le service de diagnostic IA.");
    } finally {
      setLoading(false);
    }
  };

  const totalPhotosToAnalyze =
    (hasMainPhoto && useMainPhoto ? 1 : 0) + images.length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={selectedPlantId ? `/plants/${selectedPlantId}` : "/"}
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-botanical-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {selectedPlantId
            ? "Retour au profil de la plante"
            : "Retour au tableau de bord"}
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
              Docteur Plante IA — Diagnostic & Carnet Photo 🩺
            </h1>
            <p className="mt-1 text-sm text-botanical-100">
              Analysez directement la photo principale de votre plante ou
              ajoutez des photos supplémentaires (feuilles, tiges, terreau) pour
              enrichir son carnet de santé.
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
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-stone-800">
            1. Plante concernée (pour archiver le diagnostic dans son carnet de
            santé)
          </label>
          <select
            value={selectedPlantId}
            onChange={(e) => {
              setSelectedPlantId(e.target.value);
              setUseMainPhoto(true);
            }}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-botanical-600 focus:bg-white focus:outline-none"
          >
            <option value="">
              -- Diagnostic libre (non rattaché à une plante) --
            </option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                🪴 {p.nickname} ({p.species})
              </option>
            ))}
          </select>

          {/* Main Photo Option when selected plant has an imageUrl */}
          {selectedPlant && hasMainPhoto && selectedPlant.imageUrl && (
            <div
              onClick={() => setUseMainPhoto((prev) => !prev)}
              className={`cursor-pointer flex items-center justify-between gap-4 rounded-2xl border p-3.5 transition-all ${
                useMainPhoto
                  ? "border-botanical-400 bg-botanical-50/70 shadow-sm"
                  : "border-stone-200 bg-stone-50 opacity-75 hover:opacity-100"
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-botanical-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedPlant.imageUrl}
                    alt={selectedPlant.nickname}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-botanical-700" />
                    <p className="text-xs font-bold text-stone-900">
                      Utiliser la photo principale de {selectedPlant.nickname}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-600">
                    {images.length === 0
                      ? "Vous pouvez lancer le diagnostic directement sans ajouter d'autre photo."
                      : "Sera analysée en complément des photos ajoutées ci-dessous."}
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={useMainPhoto}
                onChange={(e) => setUseMainPhoto(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="h-5 w-5 rounded border-stone-300 text-botanical-700 focus:ring-botanical-600 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Multi Photo Picker */}
        <MultiImagePicker
          values={images}
          onChange={setImages}
          label={
            hasMainPhoto && useMainPhoto
              ? "2. Photos supplémentaires (optionnel — jusqu'à 6 photos)"
              : "2. Photos illustrant le problème (jusqu'à 6 photos) *"
          }
          maxImages={6}
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
            placeholder="Décrivez ce que vous observez (ex: feuilles qui jaunissent depuis 1 semaine, taches sous les feuilles...)"
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
              Analyse de {totalPhotosToAnalyze || 1} photo
              {totalPhotosToAnalyze > 1 ? "s" : ""} en cours...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              {images.length === 0 && hasMainPhoto && useMainPhoto
                ? `Diagnostiquer avec la photo principale de ${selectedPlant?.nickname}`
                : "Lancer le diagnostic IA & enregistrer les photos"}
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

          {/* Saved Photos Gallery */}
          {result.images && result.images.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-600">
                <Images className="h-4 w-4 text-botanical-700" />
                Photos archivées dans le diagnostic ({result.images.length})
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {result.images.map((src, i) => (
                  <div
                    key={i}
                    className="aspect-[4/3] overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Photo archivée ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

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
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-4 text-xs text-stone-600">
              <span>
                ✅ Ce diagnostic et ses{" "}
                <strong>{result.images?.length || 1} photo(s)</strong> ont été
                enregistrés dans le carnet de santé de votre plante.
              </span>
              <Link
                href={`/plants/${selectedPlantId}`}
                className="rounded-xl bg-botanical-700 px-4 py-2 font-semibold text-white hover:bg-botanical-800 transition-colors"
              >
                Ouvrir le Carnet de Santé de la plante →
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
