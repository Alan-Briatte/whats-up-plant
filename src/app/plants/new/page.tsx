"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Droplets,
  Sun,
  MapPin,
  Check,
  Loader2,
  CloudRain,
  FileText,
} from "lucide-react";
import { ImagePicker } from "@/components/ImagePicker";

const ROOM_PRESETS = [
  "Salon",
  "Chambre",
  "Cuisine",
  "Bureau",
  "Salle de bain",
  "Entrée",
  "Véranda / Balcon",
];

export default function NewPlantPage() {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState("");
  const [nickname, setNickname] = useState("");
  const [species, setSpecies] = useState("");
  const [scientificName, setScientificName] = useState("");
  const [location, setLocation] = useState("Salon");
  const [wateringIntervalDays, setWateringIntervalDays] = useState(7);
  const [lightRequirement, setLightRequirement] = useState(
    "Lumière vive indirecte"
  );
  const [humidityRequirement, setHumidityRequirement] =
    useState("Moyenne (40-60%)");
  const [careNotes, setCareNotes] = useState("");

  const [identifying, setIdentifying] = useState(false);
  const [aiBadge, setAiBadge] = useState<{
    confidence: number;
    isDemo?: boolean;
    fallbackReason?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleIdentifyWithAI = async () => {
    if (!imageUrl) {
      setError("Ajoutez d'abord une photo de la plante pour l'identifier.");
      return;
    }
    setError("");
    setIdentifying(true);
    try {
      const res = await fetch("/api/ai/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageUrl,
          hintName: species || nickname,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'identification IA.");
        setIdentifying(false);
        return;
      }

      const id = data.identification;
      setSpecies(id.species || "");
      setScientificName(id.scientificName || "");
      if (!nickname.trim() && id.suggestedNickname) {
        setNickname(id.suggestedNickname);
      }
      if (id.wateringIntervalDays) {
        setWateringIntervalDays(id.wateringIntervalDays);
      }
      if (id.lightRequirement) {
        setLightRequirement(id.lightRequirement);
      }
      if (id.humidityRequirement) {
        setHumidityRequirement(id.humidityRequirement);
      }
      if (id.careNotes) {
        setCareNotes(id.careNotes);
      }
      setAiBadge({
        confidence: id.confidence || 90,
        isDemo: id.isDemoMode,
        fallbackReason: id.fallbackReason,
      });
    } catch {
      setError("Erreur réseau lors de l'appel à l'IA.");
    } finally {
      setIdentifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!nickname.trim() || !species.trim()) {
      setError("Veuillez renseigner un surnom et l'espèce de la plante.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/plants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          species,
          scientificName,
          location,
          wateringIntervalDays,
          lightRequirement,
          humidityRequirement,
          careNotes,
          imageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Impossible de créer la plante.");
        setSaving(false);
        return;
      }
      router.push(`/plants/${data.plant.id}`);
      router.refresh();
    } catch {
      setError("Erreur réseau lors de la sauvegarde.");
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-botanical-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à mes plantes
        </Link>
      </div>

      <div className="overflow-hidden rounded-3xl border border-botanical-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-stone-900">
            Nouveau Profil Plante 🪴
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Prenez une photo pour identifier automatiquement l&apos;espèce et
            ses besoins d&apos;arrosage grâce à l&apos;IA.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Photo + AI Identification */}
          <div className="rounded-2xl border border-botanical-200/80 bg-botanical-50/40 p-5">
            <ImagePicker
              value={imageUrl}
              onChange={(val) => {
                setImageUrl(val);
                setAiBadge(null);
              }}
              label="1. Photo de la plante"
            />

            {imageUrl && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  type="button"
                  onClick={handleIdentifyWithAI}
                  disabled={identifying}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-botanical-700 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-botanical-800 hover:to-emerald-700 disabled:opacity-60 transition-all"
                >
                  {identifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyse botanique en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Identifier l&apos;espèce & pré-remplir avec l&apos;IA
                    </>
                  )}
                </button>

                {aiBadge && (
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-900">
                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                      Identifiée ({aiBadge.confidence}% de confiance)
                      {aiBadge.isDemo ? " • Mode Démo" : " • Gemini 3.8 Flash"}
                    </span>
                    {aiBadge.fallbackReason && (
                      <span className="text-[11px] text-amber-800">
                        ℹ️ {aiBadge.fallbackReason}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Identity */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-stone-800">
                Surnom de la plante *
              </label>
              <input
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ex: Monty du Salon"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-botanical-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-stone-800">
                Espèce / Nom commun *
              </label>
              <input
                type="text"
                required
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                placeholder="Ex: Monstera Deliciosa, Ficus, Pothos..."
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-botanical-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                Nom scientifique (optionnel)
              </label>
              <input
                type="text"
                value={scientificName}
                onChange={(e) => setScientificName(e.target.value)}
                placeholder="Ex: Monstera deliciosa"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm italic focus:border-botanical-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-stone-700">
                <MapPin className="h-4 w-4 text-botanical-600" />
                Pièce / Emplacement
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-botanical-600 focus:bg-white focus:outline-none"
              >
                {ROOM_PRESETS.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 3: Watering & Environment */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700">
              Rappels d&apos;arrosage & Besoins
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                  <Droplets className="h-3.5 w-3.5 text-sky-600" />
                  Fréquence d&apos;arrosage (jours)
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  required
                  value={wateringIntervalDays}
                  onChange={(e) =>
                    setWateringIntervalDays(Number(e.target.value) || 7)
                  }
                  className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold focus:border-botanical-600 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  Rappel automatique tous les {wateringIntervalDays} jour(s)
                </p>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  Exposition lumineuse
                </label>
                <input
                  type="text"
                  value={lightRequirement}
                  onChange={(e) => setLightRequirement(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm focus:border-botanical-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                  <CloudRain className="h-3.5 w-3.5 text-teal-600" />
                  Humidité idéale
                </label>
                <input
                  type="text"
                  value={humidityRequirement}
                  onChange={(e) => setHumidityRequirement(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm focus:border-botanical-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                <FileText className="h-3.5 w-3.5 text-botanical-700" />
                Conseils d&apos;entretien & notes
              </label>
              <textarea
                rows={3}
                value={careNotes}
                onChange={(e) => setCareNotes(e.target.value)}
                placeholder="Ex: Utiliser de l'eau non calcaire, laisser sécher le terreau sur 3 cm..."
                className="w-full rounded-xl border border-stone-200 bg-white p-3 text-sm focus:border-botanical-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/"
              className="rounded-xl border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-botanical-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-botanical-800 disabled:opacity-60 transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Enregistrer ma plante
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
