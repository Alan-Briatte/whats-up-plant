"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Droplets,
  Stethoscope,
  MapPin,
  Sun,
  CloudRain,
  Calendar,
  Trash2,
  Edit3,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  History,
  FileText,
} from "lucide-react";
import { getWateringUrgency } from "@/lib/utils";
import { DiagnosisIssue, DiagnosisTreatmentStep } from "@/lib/gemini";

interface WateringLog {
  id: string;
  wateredAt: string;
  notes: string | null;
}

interface HealthDiagnosisRecord {
  id: string;
  status: string;
  confidence: number;
  summary: string;
  issuesJson: string;
  treatmentJson: string;
  createdAt: string;
}

interface PlantDetail {
  id: string;
  nickname: string;
  species: string;
  scientificName: string | null;
  imageUrl: string | null;
  location: string;
  wateringIntervalDays: number;
  lastWateredAt: string;
  nextWateringAt: string;
  lightRequirement: string;
  humidityRequirement: string;
  careNotes: string | null;
  healthStatus: string;
  wateringLogs: WateringLog[];
  diagnoses: HealthDiagnosisRecord[];
}

export default function PlantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [plant, setPlant] = useState<PlantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [watering, setWatering] = useState(false);
  const [waterNote, setWaterNote] = useState("");
  const [editing, setEditing] = useState(false);

  // Edit form states
  const [editNickname, setEditNickname] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editInterval, setEditInterval] = useState(7);
  const [editCareNotes, setEditCareNotes] = useState("");

  const fetchPlant = useCallback(async () => {
    try {
      const res = await fetch(`/api/plants/${params.id}`);
      if (!res.ok) {
        router.push("/");
        return;
      }
      const data = await res.json();
      setPlant(data.plant);
      setEditNickname(data.plant.nickname);
      setEditLocation(data.plant.location);
      setEditInterval(data.plant.wateringIntervalDays);
      setEditCareNotes(data.plant.careNotes || "");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchPlant();
  }, [fetchPlant]);

  const handleWater = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plant) return;
    setWatering(true);
    try {
      const res = await fetch(`/api/plants/${plant.id}/water`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: waterNote.trim() || "Arrosage effectué",
        }),
      });
      if (res.ok) {
        setWaterNote("");
        await fetchPlant();
      }
    } finally {
      setWatering(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!plant) return;
    const res = await fetch(`/api/plants/${plant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nickname: editNickname,
        location: editLocation,
        wateringIntervalDays: editInterval,
        careNotes: editCareNotes,
      }),
    });
    if (res.ok) {
      setEditing(false);
      await fetchPlant();
    }
  };

  const handleDelete = async () => {
    if (!plant) return;
    if (
      !window.confirm(
        `Voulez-vous vraiment supprimer la fiche de "${plant.nickname}" ?`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/plants/${plant.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    }
  };

  if (loading || !plant) {
    return (
      <div className="py-20 text-center text-sm text-stone-500">
        Chargement du profil de la plante...
      </div>
    );
  }

  const urgency = getWateringUrgency(plant.nextWateringAt);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-botanical-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à mes plantes
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Modifier
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer
          </button>
        </div>
      </div>

      {/* Main Hero Card */}
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        <div className="grid md:grid-cols-12">
          {/* Left Image */}
          <div className="relative aspect-[16/11] md:aspect-auto md:col-span-5 bg-botanical-100">
            {plant.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={plant.imageUrl}
                alt={plant.nickname}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[260px] w-full items-center justify-center text-6xl">
                🪴
              </div>
            )}
            <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <MapPin className="h-3.5 w-3.5" />
              {plant.location}
            </div>
          </div>

          {/* Right Info */}
          <div className="p-6 sm:p-8 md:col-span-7 flex flex-col justify-between">
            {editing ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-stone-900">
                    Modifier le profil
                  </h2>
                  <button
                    onClick={() => setEditing(false)}
                    className="text-stone-400 hover:text-stone-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Surnom
                    </label>
                    <input
                      type="text"
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Emplacement
                    </label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Intervalle d&apos;arrosage (jours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={editInterval}
                      onChange={(e) =>
                        setEditInterval(Number(e.target.value) || 7)
                      }
                      className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Notes d&apos;entretien
                  </label>
                  <textarea
                    rows={3}
                    value={editCareNotes}
                    onChange={(e) => setEditCareNotes(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 p-3 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-botanical-700 px-4 py-2 text-xs font-semibold text-white"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
                      {plant.nickname}
                    </h1>
                    <p className="text-sm font-medium text-stone-600">
                      {plant.species}{" "}
                      {plant.scientificName && (
                        <span className="italic text-stone-400">
                          ({plant.scientificName})
                        </span>
                      )}
                    </p>
                  </div>

                  {plant.healthStatus === "CRITICAL" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
                      <AlertTriangle className="h-4 w-4" />
                      État critique
                    </span>
                  ) : plant.healthStatus === "WARNING" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      <AlertTriangle className="h-4 w-4" />
                      Attention requise
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4" />
                      Plante saine
                    </span>
                  )}
                </div>

                {/* Care Specs Grid */}
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-sky-50/80 border border-sky-100 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-800">
                      <Droplets className="h-4 w-4 text-sky-600" />
                      Cycle d&apos;arrosage
                    </div>
                    <p className="mt-1 text-sm font-bold text-stone-900">
                      Tous les {plant.wateringIntervalDays} jours
                    </p>
                  </div>

                  <div className="rounded-2xl bg-amber-50/80 border border-amber-100 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                      <Sun className="h-4 w-4 text-amber-500" />
                      Lumière
                    </div>
                    <p className="mt-1 text-xs font-semibold text-stone-800 line-clamp-2">
                      {plant.lightRequirement}
                    </p>
                  </div>

                  <div className="col-span-2 sm:col-span-1 rounded-2xl bg-teal-50/80 border border-teal-100 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-800">
                      <CloudRain className="h-4 w-4 text-teal-600" />
                      Humidité
                    </div>
                    <p className="mt-1 text-xs font-semibold text-stone-800 line-clamp-2">
                      {plant.humidityRequirement}
                    </p>
                  </div>
                </div>

                {plant.careNotes && (
                  <div className="mt-4 rounded-2xl border border-botanical-200/70 bg-botanical-50/50 p-3.5 text-xs text-stone-700">
                    <span className="font-semibold text-botanical-900 flex items-center gap-1.5 mb-1">
                      <FileText className="h-3.5 w-3.5 text-botanical-700" />
                      Conseils d&apos;entretien :
                    </span>
                    {plant.careNotes}
                  </div>
                )}
              </div>
            )}

            {/* Quick AI Diagnosis CTA */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
              <div className="text-xs text-stone-500">
                Une feuille jaune, des taches ou un doute sur sa santé ?
              </div>
              <Link
                href={`/diagnose?plantId=${plant.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-botanical-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-botanical-800 transition-colors"
              >
                <Stethoscope className="h-4 w-4" />
                Lancer un diagnostic IA pour {plant.nickname}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 2 Columns: Watering Tracker & Health Diagnoses */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Watering Tracker */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Droplets className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Suivi & Rappel d&apos;arrosage
                </h2>
                <p className="text-xs text-stone-500">
                  Prochaine échéance :{" "}
                  <strong>
                    {new Date(plant.nextWateringAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                    })}
                  </strong>{" "}
                  ({urgency.label})
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleWater}
            className="flex flex-col sm:flex-row gap-2 rounded-2xl bg-sky-50/70 border border-sky-200/80 p-3"
          >
            <input
              type="text"
              value={waterNote}
              onChange={(e) => setWaterNote(e.target.value)}
              placeholder="Note optionnelle (ex: + engrais liquide)..."
              className="flex-1 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs focus:border-sky-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={watering}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
            >
              <Droplets className="h-4 w-4" />
              {watering ? "Enregistrement..." : "Arroser maintenant"}
            </button>
          </form>

          <div>
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-500">
              <History className="h-3.5 w-3.5" />
              Historique des arrosages ({plant.wateringLogs.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {plant.wateringLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50 px-3.5 py-2.5 text-xs"
                >
                  <span className="font-medium text-stone-800">
                    {log.notes || "Arrosage régulier"}
                  </span>
                  <span className="flex items-center gap-1 text-stone-500">
                    <Calendar className="h-3 w-3" />
                    {new Date(log.wateredAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Diagnoses History */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-botanical-100 text-botanical-700">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Carnet de Santé IA ({plant.diagnoses.length})
                </h2>
                <p className="text-xs text-stone-500">
                  Diagnostics de maladies et plans de soin enregistrés
                </p>
              </div>
            </div>

            <Link
              href={`/diagnose?plantId=${plant.id}`}
              className="rounded-xl bg-botanical-50 border border-botanical-200 px-3 py-1.5 text-xs font-semibold text-botanical-800 hover:bg-botanical-100"
            >
              + Nouveau diagnostic
            </Link>
          </div>

          {plant.diagnoses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center">
              <p className="text-sm font-medium text-stone-700">
                Aucun diagnostic enregistré pour cette plante
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Prenez une photo d&apos;une feuille si vous observez des taches
                ou un jaunissement.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {plant.diagnoses.map((diag) => {
                let issues: DiagnosisIssue[] = [];
                let treatments: DiagnosisTreatmentStep[] = [];
                try {
                  issues = JSON.parse(diag.issuesJson);
                  const parsedT = JSON.parse(diag.treatmentJson);
                  treatments = parsedT.treatments || [];
                } catch {
                  // ignore
                }

                return (
                  <div
                    key={diag.id}
                    className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          diag.status === "CRITICAL"
                            ? "bg-red-100 text-red-800"
                            : diag.status === "WARNING"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {diag.status === "CRITICAL"
                          ? "Critique"
                          : diag.status === "WARNING"
                          ? "Attention"
                          : "Saine"}{" "}
                        ({diag.confidence}%)
                      </span>
                      <span className="text-xs text-stone-500">
                        {new Date(diag.createdAt).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed">
                      {diag.summary}
                    </p>

                    {issues.length > 0 && (
                      <div className="text-xs text-amber-900 bg-amber-50/90 rounded-xl p-2.5 border border-amber-200/60">
                        <strong>Détecté :</strong>{" "}
                        {issues.map((i) => i.name).join(", ")}
                      </div>
                    )}

                    {treatments.length > 0 && (
                      <div className="text-xs text-botanical-900 bg-botanical-50/90 rounded-xl p-2.5 border border-botanical-200/60">
                        <strong>Soin recommandé :</strong> {treatments[0].title}{" "}
                        — {treatments[0].description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
