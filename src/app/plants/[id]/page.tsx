"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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
  Camera,
  Images,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Loader2,
  RefreshCw,
  Download,
} from "lucide-react";
import {
  getWateringUrgency,
  decodeHtmlEntities,
  deepDecodeHtmlEntities,
} from "@/lib/utils";
import { DiagnosisIssue, DiagnosisTreatmentStep } from "@/lib/gemini";
import { compressImageFile } from "@/components/MultiImagePicker";

interface WateringLog {
  id: string;
  wateredAt: string;
  notes: string | null;
}

interface HealthDiagnosisRecord {
  id: string;
  imageUrl: string | null;
  imagesJson: string;
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

function getDiagnosisPhotos(diag: HealthDiagnosisRecord): string[] {
  const photos: string[] = [];
  if (diag.imagesJson) {
    try {
      const parsed = JSON.parse(diag.imagesJson);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === "string" && item.trim()) {
            photos.push(item);
          }
        }
      }
    } catch {
      // ignore
    }
  }
  if (diag.imageUrl && diag.imageUrl.trim() && !photos.includes(diag.imageUrl)) {
    photos.unshift(diag.imageUrl);
  }
  return photos;
}

export default function PlantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [plant, setPlant] = useState<PlantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [watering, setWatering] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [waterNote, setWaterNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [exportingPlant, setExportingPlant] = useState(false);

  // Edit form states
  const [editNickname, setEditNickname] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editInterval, setEditInterval] = useState(7);
  const [editCareNotes, setEditCareNotes] = useState("");
  const [generatingNickname, setGeneratingNickname] = useState(false);
  const [seenNicknames, setSeenNicknames] = useState<string[]>([]);
  const [roomSuggestions, setRoomSuggestions] = useState<string[]>([
    "Salon",
    "Chambre",
    "Cuisine",
    "Bureau",
    "Salle de bain",
    "Entrée",
    "Véranda / Balcon",
  ]);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

  // Carnet de Santé photo & status management
  const addPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [activeDiagIdForUpload, setActiveDiagIdForUpload] = useState<
    string | null
  >(null);
  const [uploadingDiagId, setUploadingDiagId] = useState<string | null>(null);
  const [updatingDiagId, setUpdatingDiagId] = useState<string | null>(null);
  const [deletingDiagId, setDeletingDiagId] = useState<string | null>(null);

  // Lightbox state
  const [lightbox, setLightbox] = useState<{
    diagId: string;
    photos: string[];
    index: number;
    dateLabel: string;
  } | null>(null);

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
    fetch("/api/plants")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.plants)) {
          const existingRooms = data.plants
            .map((p: { location?: string }) => (p.location || "").trim())
            .filter(Boolean);
          setRoomSuggestions((prev) =>
            Array.from(new Set([...prev, ...existingRooms]))
          );
        }
      })
      .catch(() => {});
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

  const handleDeleteWateringLog = async (logId: string) => {
    if (!plant) return;
    setDeletingLogId(logId);
    try {
      const res = await fetch(
        `/api/plants/${plant.id}/water?logId=${encodeURIComponent(logId)}`,
        {
          method: "DELETE",
        }
      );
      if (res.ok) {
        await fetchPlant();
      }
    } finally {
      setDeletingLogId(null);
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
      if (editLocation.trim()) {
        setRoomSuggestions((prev) =>
          Array.from(new Set([...prev, editLocation.trim()]))
        );
      }
      setEditing(false);
      await fetchPlant();
    }
  };

  const handleGenerateAnotherNickname = async () => {
    if (!plant) return;
    setGeneratingNickname(true);
    try {
      const excludeList = Array.from(
        new Set([...seenNicknames, editNickname, plant.nickname].filter(Boolean))
      );
      const res = await fetch("/api/ai/nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          species: plant.species,
          scientificName: plant.scientificName || "",
          location: editLocation || plant.location,
          exclude: excludeList,
        }),
      });
      const data = await res.json();
      if (res.ok && data.nickname) {
        setEditNickname(data.nickname);
        setSeenNicknames((prev) =>
          Array.from(new Set([...prev, data.nickname]))
        );
      }
    } finally {
      setGeneratingNickname(false);
    }
  };

  const handleExportPlant = async () => {
    if (!plant) return;
    setExportingPlant(true);
    try {
      const res = await fetch(
        `/api/plants/backup?plantId=${encodeURIComponent(plant.id)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = plant.nickname
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "");
      a.href = url;
      a.download = `whatsupplant-${slug || "plante"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExportingPlant(false);
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

  const triggerAddPhotosToDiagnosis = (diagId: string) => {
    setActiveDiagIdForUpload(diagId);
    addPhotoInputRef.current?.click();
  };

  const handleAddPhotosChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeDiagIdForUpload) return;

    const targetDiagId = activeDiagIdForUpload;
    setUploadingDiagId(targetDiagId);

    try {
      const compressedList: string[] = [];
      for (const file of Array.from(files).slice(0, 6)) {
        const dataUrl = await compressImageFile(file);
        if (dataUrl) compressedList.push(dataUrl);
      }

      if (compressedList.length > 0) {
        const res = await fetch(`/api/diagnoses/${targetDiagId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: compressedList }),
        });
        if (res.ok) {
          await fetchPlant();
        }
      }
    } finally {
      setUploadingDiagId(null);
      setActiveDiagIdForUpload(null);
      e.target.value = "";
    }
  };

  const handleRemovePhotoFromDiagnosis = async (
    diagId: string,
    photoUrl: string
  ) => {
    const res = await fetch(`/api/diagnoses/${diagId}/photos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl }),
    });
    if (res.ok) {
      setLightbox(null);
      await fetchPlant();
    }
  };

  const handleToggleDiagnosisResolved = async (
    diagId: string,
    resolved: boolean
  ) => {
    setUpdatingDiagId(diagId);
    try {
      const res = await fetch(`/api/diagnoses/${diagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved }),
      });
      if (res.ok) {
        await fetchPlant();
        router.refresh();
      }
    } finally {
      setUpdatingDiagId(null);
    }
  };

  const handleToggleIssueResolved = async (
    diagId: string,
    issueIndex: number,
    resolved: boolean
  ) => {
    setUpdatingDiagId(diagId);
    try {
      const res = await fetch(`/api/diagnoses/${diagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueIndex, resolved }),
      });
      if (res.ok) {
        await fetchPlant();
        router.refresh();
      }
    } finally {
      setUpdatingDiagId(null);
    }
  };

  const handleDeleteDiagnosis = async (diagId: string) => {
    if (
      !window.confirm(
        "Voulez-vous vraiment supprimer ce diagnostic du carnet de santé ?"
      )
    ) {
      return;
    }
    setDeletingDiagId(diagId);
    try {
      const res = await fetch(`/api/diagnoses/${diagId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchPlant();
        router.refresh();
      }
    } finally {
      setDeletingDiagId(null);
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
  const totalHealthPhotos = plant.diagnoses.reduce(
    (acc, d) => acc + getDiagnosisPhotos(d).length,
    0
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Hidden input to add photos to an existing diagnosis in Carnet de Santé */}
      <input
        ref={addPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleAddPhotosChange}
        className="hidden"
      />

      {/* Lightbox Modal for Carnet de Santé Photos */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-3xl w-full overflow-hidden rounded-3xl bg-stone-900 border border-white/15 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 text-white">
              <div>
                <p className="text-sm font-bold">
                  Carnet de Santé — {plant.nickname}
                </p>
                <p className="text-xs text-stone-400">
                  Diagnostic du {lightbox.dateLabel} • Photo{" "}
                  {lightbox.index + 1} sur {lightbox.photos.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleRemovePhotoFromDiagnosis(
                      lightbox.diagId,
                      lightbox.photos[lightbox.index]
                    )
                  }
                  className="flex items-center gap-1 rounded-xl bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/30 transition-colors"
                  title="Supprimer cette photo du carnet"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer
                </button>
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative flex aspect-[16/11] w-full items-center justify-center bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.photos[lightbox.index]}
                alt="Zoom photo diagnostic"
                className="max-h-[70vh] w-full object-contain"
              />

              {lightbox.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightbox({
                        ...lightbox,
                        index:
                          (lightbox.index - 1 + lightbox.photos.length) %
                          lightbox.photos.length,
                      })
                    }
                    className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLightbox({
                        ...lightbox,
                        index: (lightbox.index + 1) % lightbox.photos.length,
                      })
                    }
                    className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-botanical-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à mes plantes
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportPlant}
            disabled={exportingPlant}
            className="inline-flex items-center gap-1.5 rounded-xl border border-botanical-200 bg-botanical-50 px-3.5 py-2 text-xs font-semibold text-botanical-800 hover:bg-botanical-100 disabled:opacity-50"
            title="Exporter cette plante avec son carnet de santé (.json)"
          >
            {exportingPlant ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Exporter la fiche
          </button>
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
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="block text-xs font-semibold text-stone-700">
                        Surnom
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateAnotherNickname}
                        disabled={generatingNickname}
                        className="inline-flex items-center gap-1 rounded-lg bg-botanical-50 border border-botanical-200 px-2 py-0.5 text-[11px] font-semibold text-botanical-800 hover:bg-botanical-100 disabled:opacity-50"
                        title="Générer un autre surnom"
                      >
                        <RefreshCw
                          className={`h-3 w-3 text-botanical-700 ${
                            generatingNickname ? "animate-spin" : ""
                          }`}
                        />
                        Autre surnom
                      </button>
                    </div>
                    <input
                      type="text"
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Pièce / Emplacement
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editLocation}
                        onFocus={() => setLocationDropdownOpen(true)}
                        onBlur={() =>
                          setTimeout(() => setLocationDropdownOpen(false), 180)
                        }
                        onChange={(e) => {
                          setEditLocation(e.target.value);
                          setLocationDropdownOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setLocationDropdownOpen(false);
                          }
                        }}
                        placeholder="Ex: Salon, Chambre, Terrasse..."
                        className="w-full rounded-xl border border-stone-200 px-3 py-2 pr-8 text-sm focus:border-botanical-600 focus:outline-none"
                      />
                      <MapPin className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-stone-400" />
                    </div>

                    {locationDropdownOpen && (
                      <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
                        {roomSuggestions
                          .filter((r) =>
                            !editLocation.trim() ||
                            r.toLowerCase() === editLocation.trim().toLowerCase()
                              ? true
                              : r
                                  .toLowerCase()
                                  .includes(editLocation.trim().toLowerCase())
                          )
                          .map((room) => {
                            const isSelected =
                              room.toLowerCase() ===
                              editLocation.trim().toLowerCase();
                            return (
                              <button
                                key={room}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setEditLocation(room);
                                  setLocationDropdownOpen(false);
                                }}
                                className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                                  isSelected
                                    ? "bg-botanical-50 font-semibold text-botanical-800"
                                    : "text-stone-700 hover:bg-stone-50"
                                }`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 text-botanical-600" />
                                  {room}
                                </span>
                                {isSelected && (
                                  <Check className="h-3.5 w-3.5 text-botanical-700" />
                                )}
                              </button>
                            );
                          })}

                        {editLocation.trim() &&
                          !roomSuggestions.some(
                            (r) =>
                              r.toLowerCase() ===
                              editLocation.trim().toLowerCase()
                          ) && (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setEditLocation(editLocation.trim());
                                setLocationDropdownOpen(false);
                              }}
                              className="flex w-full items-center gap-1.5 border-t border-stone-100 px-3 py-2 text-left text-xs font-semibold text-botanical-700 hover:bg-botanical-50"
                            >
                              + Utiliser « {editLocation.trim()} »
                            </button>
                          )}
                      </div>
                    )}
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
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Watering Tracker (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-5 h-fit">
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
              {watering ? "Enregistrement..." : "Arroser"}
            </button>
          </form>

          <div>
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-500">
              <History className="h-3.5 w-3.5" />
              Historique des arrosages ({plant.wateringLogs.length})
            </h3>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {plant.wateringLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-stone-100 bg-stone-50 px-3.5 py-2.5 text-xs"
                >
                  <span className="font-medium text-stone-800 truncate">
                    {log.notes || "Arrosage régulier"}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="flex items-center gap-1 text-stone-500">
                      <Calendar className="h-3 w-3" />
                      {new Date(log.wateredAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <button
                      type="button"
                      disabled={deletingLogId === log.id}
                      onClick={() => handleDeleteWateringLog(log.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
                      title="Supprimer cet arrosage (recalcule la prochaine échéance)"
                    >
                      {deletingLogId === log.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Diagnoses History & Photo Stock (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-botanical-100 text-botanical-700">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Carnet de Santé & Galerie Photos ({plant.diagnoses.length})
                </h2>
                <p className="text-xs text-stone-500">
                  {totalHealthPhotos} photo{totalHealthPhotos > 1 ? "s" : ""} en
                  stock • Suivi de l&apos;évolution et des soins
                </p>
              </div>
            </div>

            <Link
              href={`/diagnose?plantId=${plant.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-botanical-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-botanical-800 transition-colors"
            >
              <Camera className="h-3.5 w-3.5" />
              + Nouveau diagnostic photo
            </Link>
          </div>

          {plant.diagnoses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center">
              <Images className="mx-auto mb-2 h-8 w-8 text-stone-400" />
              <p className="text-sm font-medium text-stone-700">
                Aucun diagnostic ni photo de santé pour cette plante
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Prenez des photos des feuilles ou des tiges pour diagnostiquer
                un problème et conserver l&apos;historique visuel dans ce carnet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {plant.diagnoses.map((diag) => {
                let issues: Array<
                  DiagnosisIssue & { resolved?: boolean; resolvedAt?: string }
                > = [];
                let treatments: DiagnosisTreatmentStep[] = [];
                let diagResolved = false;
                const photos = getDiagnosisPhotos(diag);
                const dateLabel = new Date(diag.createdAt).toLocaleDateString(
                  "fr-FR",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                );

                try {
                  issues = deepDecodeHtmlEntities(JSON.parse(diag.issuesJson));
                  const parsedT = deepDecodeHtmlEntities(
                    JSON.parse(diag.treatmentJson)
                  );
                  treatments = parsedT.treatments || [];
                  diagResolved =
                    parsedT.resolved === true ||
                    (Array.isArray(issues) &&
                      issues.length > 0 &&
                      issues.every((i) => i.resolved === true));
                } catch {
                  // ignore
                }

                return (
                  <div
                    key={diag.id}
                    className={`rounded-2xl border p-4 space-y-3 transition-colors ${
                      diagResolved
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-stone-200 bg-stone-50/70"
                    }`}
                  >
                    {/* Header of diagnosis */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            diagResolved
                              ? "bg-stone-200 text-stone-600 line-through"
                              : diag.status === "CRITICAL"
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

                        {diagResolved && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Guéri / Résolu
                          </span>
                        )}

                        <span className="text-xs font-medium text-stone-500">
                          {dateLabel}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {diag.status !== "HEALTHY" && (
                          <button
                            type="button"
                            disabled={updatingDiagId === diag.id}
                            onClick={() =>
                              handleToggleDiagnosisResolved(
                                diag.id,
                                !diagResolved
                              )
                            }
                            className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                              diagResolved
                                ? "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                                : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            }`}
                            title={
                              diagResolved
                                ? "Marquer ce problème comme non résolu"
                                : "Marquer ce diagnostic comme guéri / résolu"
                            }
                          >
                            <Check className="h-3.5 w-3.5" />
                            {diagResolved ? "Réouvrir" : "Marquer guéri"}
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={uploadingDiagId === diag.id}
                          onClick={() => triggerAddPhotosToDiagnosis(diag.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-botanical-300 bg-white px-2.5 py-1 text-xs font-semibold text-botanical-800 hover:bg-botanical-50 disabled:opacity-50 transition-colors"
                        >
                          {uploadingDiagId === diag.id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Ajout...
                            </>
                          ) : (
                            <>
                              <Camera className="h-3.5 w-3.5 text-botanical-700" />
                              + Photos
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={deletingDiagId === diag.id}
                          onClick={() => handleDeleteDiagnosis(diag.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                          title="Supprimer ce diagnostic"
                        >
                          {deletingDiagId === diag.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Photo Gallery stored in Carnet de Santé */}
                    {photos.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-500">
                          <Images className="h-3.5 w-3.5 text-botanical-700" />
                          Photos du problème ({photos.length}) — cliquez pour
                          agrandir :
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {photos.map((photoSrc, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() =>
                                setLightbox({
                                  diagId: diag.id,
                                  photos,
                                  index: idx,
                                  dateLabel,
                                })
                              }
                              className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-stone-200 bg-stone-200 focus:outline-none focus:ring-2 focus:ring-botanical-600"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photoSrc}
                                alt={`Photo santé ${idx + 1}`}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/35 group-hover:opacity-100">
                                <ZoomIn className="h-5 w-5 text-white drop-shadow" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Diagnosis text */}
                    <p className="text-xs text-stone-700 leading-relaxed">
                      {decodeHtmlEntities(diag.summary)}
                    </p>

                    {issues.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                          Soucis détectés ({issues.filter((i) => i.resolved).length}/
                          {issues.length} résolu{issues.length > 1 ? "s" : ""})
                        </p>
                        <div className="space-y-2">
                          {issues.map((issue, idx) => {
                            const isResolved = Boolean(issue.resolved);
                            return (
                              <div
                                key={idx}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border p-3 text-xs transition-colors ${
                                  isResolved
                                    ? "border-emerald-200 bg-emerald-50/50 text-stone-600"
                                    : "border-amber-200/70 bg-amber-50/90 text-amber-900"
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`font-bold ${
                                        isResolved
                                          ? "line-through text-stone-500"
                                          : "text-stone-900"
                                      }`}
                                    >
                                      {issue.name}
                                    </span>
                                    {isResolved && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                        ✓ Guéri
                                      </span>
                                    )}
                                  </div>
                                  {issue.symptoms && (
                                    <p className="text-[11px] text-stone-600">
                                      <strong>Symptômes :</strong>{" "}
                                      {issue.symptoms}
                                    </p>
                                  )}
                                  {issue.cause && (
                                    <p className="text-[11px] text-stone-500">
                                      <strong>Cause :</strong> {issue.cause}
                                    </p>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  disabled={updatingDiagId === diag.id}
                                  onClick={() =>
                                    handleToggleIssueResolved(
                                      diag.id,
                                      idx,
                                      !isResolved
                                    )
                                  }
                                  className={`inline-flex flex-shrink-0 items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                                    isResolved
                                      ? "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                                      : "border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50"
                                  }`}
                                >
                                  <Check className="h-3 w-3" />
                                  {isResolved ? "Non guéri" : "Résoudre ce souci"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {treatments.length > 0 && !diagResolved && (
                      <div className="text-xs text-botanical-900 bg-botanical-50/90 rounded-xl p-2.5 border border-botanical-200/60 space-y-1">
                        <strong className="block">Plan de soin :</strong>
                        {treatments.map((t) => (
                          <div key={t.step}>
                            • <strong>{t.title}</strong> : {t.description} (
                            <em>{t.timeframe}</em>)
                          </div>
                        ))}
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
