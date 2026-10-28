"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Droplets,
  Plus,
  Stethoscope,
  MapPin,
  Sun,
  CloudRain,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Search,
  BellRing,
  ChevronRight,
  Download,
  Upload,
  FileJson,
  X,
  Loader2,
  ArrowDownUp,
  LayoutGrid,
  List,
  HeartPulse,
  CheckCheck,
} from "lucide-react";
import { getWateringUrgency, getHydrationStatus } from "@/lib/utils";
import type { BackupPlant } from "@/app/api/plants/backup/route";

export interface PlantItem {
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
}

interface DashboardClientProps {
  initialPlants: PlantItem[];
  userName: string;
}

export function DashboardClient({
  initialPlants,
  userName,
}: DashboardClientProps) {
  const router = useRouter();
  const [plants, setPlants] = useState<PlantItem[]>(initialPlants);
  const [selectedRoom, setSelectedRoom] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DUE" | "HEALTH">(
    "ALL"
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [wateringId, setWateringId] = useState<string | null>(null);
  const [batchWatering, setBatchWatering] = useState(false);
  const [waterSuccessToast, setWaterSuccessToast] = useState<string | null>(
    null
  );
  const [undoWaterInfo, setUndoWaterInfo] = useState<{
    plantId: string;
    logId?: string;
  } | null>(null);

  // Export / Import state
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<"merge" | "append" | "replace">(
    "merge"
  );
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    plants: BackupPlant[];
    totalLogs: number;
    totalDiagnoses: number;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const duePlants = plants.filter((p) => {
    const u = getWateringUrgency(p.nextWateringAt);
    return u.status === "overdue" || u.status === "today";
  });

  const warningPlants = plants.filter((p) => p.healthStatus !== "HEALTHY");

  const avgHydration =
    plants.length > 0
      ? Math.round(
          plants.reduce(
            (acc, p) =>
              acc +
              getHydrationStatus(
                p.lastWateredAt,
                p.nextWateringAt,
                p.wateringIntervalDays
              ).percent,
            0
          ) / plants.length
        )
      : 100;

  useEffect(() => {
    if (
      duePlants.length > 0 &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      const notifiedKey = `notified_${new Date().toISOString().slice(0, 10)}`;
      if (!sessionStorage.getItem(notifiedKey)) {
        sessionStorage.setItem(notifiedKey, "1");
        new Notification("Rappel d'arrosage WhatsUpPlant 💧", {
          body: `${duePlants.length} plante(s) ont soif aujourd'hui : ${duePlants
            .map((p) => p.nickname)
            .join(", ")}`,
          icon: "/icon.svg",
        });
      }
    }
  }, [duePlants]);

  const handleQuickWater = async (plant: PlantItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWateringId(plant.id);
    try {
      const res = await fetch(`/api/plants/${plant.id}/water`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: "Arrosage rapide depuis le tableau de bord",
        }),
      });
      const data = await res.json();
      if (res.ok && data.plant) {
        setPlants((prev) =>
          prev.map((p) =>
            p.id === plant.id
              ? {
                  ...p,
                  lastWateredAt: data.plant.lastWateredAt,
                  nextWateringAt: data.plant.nextWateringAt,
                }
              : p
          )
        );
        setUndoWaterInfo({ plantId: plant.id, logId: data.log?.id });
        setWaterSuccessToast(`${plant.nickname} a bien été arrosée ! 💧`);
        setTimeout(() => {
          setWaterSuccessToast(null);
          setUndoWaterInfo(null);
        }, 6000);
        router.refresh();
      }
    } finally {
      setWateringId(null);
    }
  };

  const handleWaterAllDue = async () => {
    if (duePlants.length === 0 || batchWatering) return;
    setBatchWatering(true);
    try {
      const updatedMap = new Map<
        string,
        { lastWateredAt: string; nextWateringAt: string }
      >();
      for (const plant of duePlants) {
        const res = await fetch(`/api/plants/${plant.id}/water`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: "Arrosage groupé depuis le tableau de bord",
          }),
        });
        const data = await res.json();
        if (res.ok && data.plant) {
          updatedMap.set(plant.id, {
            lastWateredAt: data.plant.lastWateredAt,
            nextWateringAt: data.plant.nextWateringAt,
          });
        }
      }
      if (updatedMap.size > 0) {
        setPlants((prev) =>
          prev.map((p) => {
            const up = updatedMap.get(p.id);
            return up ? { ...p, ...up } : p;
          })
        );
        setUndoWaterInfo(null);
        setWaterSuccessToast(
          `${updatedMap.size} plante(s) arrosée(s) avec succès ! 💧✨`
        );
        setTimeout(() => setWaterSuccessToast(null), 5000);
        router.refresh();
      }
    } finally {
      setBatchWatering(false);
    }
  };

  const handleUndoQuickWater = async () => {
    if (!undoWaterInfo) return;
    const { plantId, logId } = undoWaterInfo;
    setUndoWaterInfo(null);
    try {
      const url = logId
        ? `/api/plants/${plantId}/water?logId=${encodeURIComponent(logId)}`
        : `/api/plants/${plantId}/water`;
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.plant) {
        setPlants((prev) =>
          prev.map((p) =>
            p.id === plantId
              ? {
                  ...p,
                  lastWateredAt: data.plant.lastWateredAt,
                  nextWateringAt: data.plant.nextWateringAt,
                }
              : p
          )
        );
        setWaterSuccessToast("Arrosage annulé ↩️");
        setTimeout(() => setWaterSuccessToast(null), 3000);
        router.refresh();
      }
    } catch {
      // ignore
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    setImportError(null);
    try {
      const res = await fetch("/api/plants/backup");
      if (!res.ok) {
        throw new Error("Impossible de récupérer les plantes à exporter.");
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `whatsupplant-export-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setWaterSuccessToast(
        `${data.plants?.length || 0} plante(s) exportée(s) avec succès ! 📦`
      );
      setTimeout(() => setWaterSuccessToast(null), 4000);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Erreur lors de l'export."
      );
    } finally {
      setExporting(false);
    }
  };

  const handleSelectImportFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rawList: BackupPlant[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.plants)
        ? parsed.plants
        : [];

      const validPlants = rawList.filter(
        (p) =>
          p &&
          typeof p === "object" &&
          typeof p.nickname === "string" &&
          p.nickname.trim() &&
          typeof p.species === "string" &&
          p.species.trim()
      );

      if (validPlants.length === 0) {
        setImportPreview(null);
        setImportError(
          "Ce fichier JSON ne contient aucune fiche de plante valide."
        );
        return;
      }

      const totalLogs = validPlants.reduce(
        (acc, p) =>
          acc + (Array.isArray(p.wateringLogs) ? p.wateringLogs.length : 0),
        0
      );
      const totalDiagnoses = validPlants.reduce(
        (acc, p) =>
          acc + (Array.isArray(p.diagnoses) ? p.diagnoses.length : 0),
        0
      );

      setImportPreview({
        fileName: file.name,
        plants: validPlants,
        totalLogs,
        totalDiagnoses,
      });
    } catch {
      setImportPreview(null);
      setImportError(
        "Le fichier sélectionné n'est pas un fichier JSON valide."
      );
    } finally {
      e.target.value = "";
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    setImportError(null);

    try {
      const res = await fetch("/api/plants/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: importMode,
          plants: importPreview.plants,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'import.");
      }

      if (Array.isArray(data.plants)) {
        setPlants(data.plants);
      }

      const {
        createdCount = 0,
        updatedCount = 0,
        importedDiagnosesCount = 0,
      } = data.summary || {};
      setBackupModalOpen(false);
      setImportPreview(null);
      setWaterSuccessToast(
        `Import terminé : ${createdCount} ajoutée(s), ${updatedCount} mise(s) à jour, ${importedDiagnosesCount} diagnostic(s) santé ! 🌿`
      );
      setTimeout(() => setWaterSuccessToast(null), 5000);
      router.refresh();
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Erreur lors de l'importation."
      );
    } finally {
      setImporting(false);
    }
  };

  const rooms = Array.from(new Set(plants.map((p) => p.location)));

  const filteredPlants = plants.filter((p) => {
    const matchesRoom = selectedRoom === "ALL" || p.location === selectedRoom;
    const urgency = getWateringUrgency(p.nextWateringAt);
    const isDue = urgency.status === "overdue" || urgency.status === "today";
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "DUE" && isDue) ||
      (statusFilter === "HEALTH" && p.healthStatus !== "HEALTHY");

    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      p.nickname.toLowerCase().includes(q) ||
      p.species.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q);
    return matchesRoom && matchesStatus && matchesQuery;
  });

  const renderHealthBadge = (status: string) => {
    if (status === "CRITICAL") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100/95 px-2.5 py-1 text-[11px] font-bold text-red-800 shadow-sm backdrop-blur-md">
          <AlertTriangle className="h-3 w-3" />
          Soin urgent
        </span>
      );
    }
    if (status === "WARNING") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/95 px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-sm backdrop-blur-md">
          <AlertTriangle className="h-3 w-3" />
          À surveiller
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/95 px-2.5 py-1 text-[11px] font-bold text-emerald-800 shadow-sm backdrop-blur-md">
        <CheckCircle2 className="h-3 w-3" />
        Saine
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Hidden JSON file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleSelectImportFile}
        className="hidden"
      />

      {/* Export / Import Modal */}
      {backupModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !importing && setBackupModalOpen(false)}
        >
          <div
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 bg-botanical-50/70 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-botanical-700 text-white shadow-sm">
                  <FileJson className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    Exporter / Importer mes plantes
                  </h2>
                  <p className="text-xs text-stone-600">
                    Noms, photos, historique d&apos;arrosage et carnet de santé
                    complet
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBackupModalOpen(false)}
                disabled={importing}
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-200/60 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {importError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
                  {importError}
                </div>
              )}

              {/* Export Section */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      Exporter ma collection ({plants.length} plante
                      {plants.length > 1 ? "s" : ""})
                    </h3>
                    <p className="mt-0.5 text-xs text-stone-600">
                      Télécharge un fichier{" "}
                      <code className="font-mono">.json</code> contenant toutes
                      vos plantes, leurs photos, les journaux d&apos;arrosage et
                      tous les diagnostics du carnet de santé.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportAll}
                    disabled={exporting || plants.length === 0}
                    className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-botanical-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-botanical-800 disabled:opacity-50 transition-colors"
                  >
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {exporting ? "Export en cours..." : "Exporter (.json)"}
                  </button>
                </div>
              </div>

              {/* Import Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Importer une liste de plantes
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-600">
                    Restaurez une sauvegarde complète ou ajoutez une fiche de
                    plante exportée depuis un autre appareil.
                  </p>
                </div>

                {!importPreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-botanical-300 bg-botanical-50/40 p-8 text-center hover:bg-botanical-50 transition-colors"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-botanical-100 text-botanical-700">
                      <Upload className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-semibold text-botanical-900">
                      Sélectionner un fichier JSON à importer
                    </span>
                    <span className="text-xs text-stone-500">
                      Format accepté : sauvegarde WhatsUpPlant (.json)
                    </span>
                  </button>
                ) : (
                  <div className="space-y-4 rounded-2xl border border-botanical-200 bg-botanical-50/40 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-botanical-800">
                          Fichier prêt : {importPreview.fileName}
                        </p>
                        <p className="mt-0.5 text-xs text-stone-600">
                          <strong>{importPreview.plants.length}</strong>{" "}
                          plante(s) •{" "}
                          <strong>{importPreview.totalDiagnoses}</strong>{" "}
                          diagnostic(s) de carnet de santé •{" "}
                          <strong>{importPreview.totalLogs}</strong> arrosage(s)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImportPreview(null)}
                        disabled={importing}
                        className="text-xs font-semibold text-stone-500 hover:text-stone-800 underline"
                      >
                        Changer de fichier
                      </button>
                    </div>

                    {/* Preview list of plants */}
                    <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-xl bg-white p-2.5 border border-stone-200/80">
                      {importPreview.plants.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs px-2 py-1 rounded-lg hover:bg-stone-50"
                        >
                          <span className="font-semibold text-stone-800 truncate">
                            🌱 {p.nickname}{" "}
                            <span className="font-normal text-stone-500">
                              ({p.species})
                            </span>
                          </span>
                          <span className="text-[11px] text-stone-500 flex-shrink-0 ml-2">
                            {Array.isArray(p.diagnoses)
                              ? p.diagnoses.length
                              : 0}{" "}
                            diag. •{" "}
                            {Array.isArray(p.wateringLogs)
                              ? p.wateringLogs.length
                              : 0}{" "}
                            arrosages
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Import Mode selector */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-stone-700">
                        Comportement si une plante porte déjà le même nom :
                      </label>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => setImportMode("merge")}
                          className={`rounded-xl border p-2.5 text-left text-xs transition-colors ${
                            importMode === "merge"
                              ? "border-botanical-600 bg-botanical-700 text-white"
                              : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                          }`}
                        >
                          <p className="font-bold">Fusionner</p>
                          <p
                            className={`mt-0.5 text-[11px] ${
                              importMode === "merge"
                                ? "text-botanical-100"
                                : "text-stone-500"
                            }`}
                          >
                            Met à jour et complète le carnet sans doublon
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setImportMode("append")}
                          className={`rounded-xl border p-2.5 text-left text-xs transition-colors ${
                            importMode === "append"
                              ? "border-botanical-600 bg-botanical-700 text-white"
                              : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                          }`}
                        >
                          <p className="font-bold">Tout ajouter</p>
                          <p
                            className={`mt-0.5 text-[11px] ${
                              importMode === "append"
                                ? "text-botanical-100"
                                : "text-stone-500"
                            }`}
                          >
                            Crée chaque plante comme nouvelle fiche
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setImportMode("replace")}
                          className={`rounded-xl border p-2.5 text-left text-xs transition-colors ${
                            importMode === "replace"
                              ? "border-red-600 bg-red-600 text-white"
                              : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                          }`}
                        >
                          <p className="font-bold">Remplacer tout</p>
                          <p
                            className={`mt-0.5 text-[11px] ${
                              importMode === "replace"
                                ? "text-red-100"
                                : "text-stone-500"
                            }`}
                          >
                            Écrase les plantes actuelles par ce fichier
                          </p>
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setImportPreview(null)}
                        disabled={importing}
                        className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmImport}
                        disabled={importing}
                        className="inline-flex items-center gap-2 rounded-xl bg-botanical-700 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-botanical-800 disabled:opacity-50"
                      >
                        {importing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {importing
                          ? "Importation..."
                          : `Importer ${importPreview.plants.length} plante(s)`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast feedback */}
      {waterSuccessToast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-3 rounded-2xl bg-botanical-800 px-4 py-3 text-sm font-medium text-white shadow-xl border border-botanical-600/40">
          <Droplets className="h-4 w-4 text-sky-300" />
          <span>{waterSuccessToast}</span>
          {undoWaterInfo && (
            <button
              type="button"
              onClick={handleUndoQuickWater}
              className="ml-1 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold text-sky-200 hover:bg-white/25 transition-colors"
            >
              Annuler
            </button>
          )}
        </div>
      )}

      {/* BENTO HEADER GRID */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Bento Card 1: Main Welcome & Collection Hero (7 cols) */}
        <div className="lg:col-span-7 relative overflow-hidden rounded-3xl border border-botanical-700/30 dark:border-botanical-800 bg-gradient-to-br from-botanical-800 via-botanical-700 to-emerald-800 p-6 sm:p-7 text-white shadow-lg flex flex-col justify-between">
          {/* Decorative soft glow */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-emerald-400/15 blur-2xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-botanical-100 backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-emerald-300" />
              Jardin Connecté • Bento & Glass
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bonjour {userName} 🌿
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-botanical-100 leading-relaxed">
              {duePlants.length > 0
                ? `${duePlants.length} plante${
                    duePlants.length > 1 ? "s ont" : " a"
                  } besoin d'eau aujourd'hui. Vos ${
                    plants.length
                  } plantes sont réparties dans ${
                    rooms.length || 1
                  } espace${rooms.length > 1 ? "s" : ""}.`
                : `Toutes vos ${plants.length} plantes disposent d'une réserve d'eau optimale aujourd'hui !`}
            </p>
          </div>

          <div className="relative z-10 mt-6 flex flex-wrap items-center gap-2.5 pt-2">
            <Link
              href="/plants/new"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-botanical-900 shadow-sm hover:bg-botanical-50 transition-all hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4 text-botanical-700" />
              Ajouter une plante
            </Link>
            <Link
              href="/diagnose"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 py-2.5 text-xs sm:text-sm font-bold text-white backdrop-blur-md hover:bg-white/20 transition-all"
            >
              <Stethoscope className="h-4 w-4 text-emerald-200" />
              Docteur IA
            </Link>
            <button
              type="button"
              onClick={() => {
                setImportError(null);
                setBackupModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md hover:bg-white/20 transition-all"
              title="Exporter ou importer vos plantes et carnets de santé"
            >
              <ArrowDownUp className="h-4 w-4 text-botanical-200" />
              Sauvegarde JSON
            </button>
          </div>
        </div>

        {/* Bento Card 2: Global Hydration Reserve & Status Cockpit (5 cols) */}
        <div className="lg:col-span-5 bento-card rounded-3xl p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500">
                Hydratation Globale
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                <Droplets className="h-3.5 w-3.5 text-sky-600" />
                Réserve moy. {avgHydration}%
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <p className="text-2xl font-extrabold text-stone-900">
                  {duePlants.length === 0
                    ? "100% à jour"
                    : `${duePlants.length} à arroser`}
                </p>
                <p className="text-xs text-stone-500">
                  {plants.length - duePlants.length} plante(s) hydratée(s) sur{" "}
                  {plants.length}
                </p>
              </div>

              {duePlants.length > 0 && (
                <button
                  type="button"
                  onClick={handleWaterAllDue}
                  disabled={batchWatering}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 transition-all"
                >
                  {batchWatering ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="h-3.5 w-3.5" />
                  )}
                  Tout arroser ({duePlants.length})
                </button>
              )}
            </div>

            {/* Global Hydration Progress Bar */}
            <div className="mt-3.5 space-y-1.5">
              <div className="hydration-track h-3 w-full overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(8, avgHydration)}%`,
                    background:
                      "linear-gradient(90deg, #0ea5e9 0%, #2dd4bf 50%, #10b981 100%)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Mini Bento KPIs Row inside Cockpit */}
          <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-stone-200/70">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`rounded-2xl p-2.5 text-left transition-all border ${
                statusFilter === "ALL"
                  ? "border-botanical-300 bg-botanical-50/80"
                  : "border-stone-200/70 bg-stone-50/70 hover:bg-stone-100"
              }`}
            >
              <p className="text-[11px] font-semibold text-stone-500">
                Collection
              </p>
              <p className="mt-0.5 text-lg font-extrabold text-stone-900">
                {plants.length} 🌱
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setStatusFilter(statusFilter === "DUE" ? "ALL" : "DUE")
              }
              className={`rounded-2xl p-2.5 text-left transition-all border ${
                statusFilter === "DUE"
                  ? "border-sky-300 bg-sky-50"
                  : "border-stone-200/70 bg-stone-50/70 hover:bg-sky-50/50"
              }`}
            >
              <p className="text-[11px] font-semibold text-stone-500">
                Soif aujourd&apos;hui
              </p>
              <p className="mt-0.5 text-lg font-extrabold text-sky-700">
                {duePlants.length} 💧
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setStatusFilter(statusFilter === "HEALTH" ? "ALL" : "HEALTH")
              }
              className={`rounded-2xl p-2.5 text-left transition-all border ${
                statusFilter === "HEALTH"
                  ? "border-amber-300 bg-amber-50"
                  : "border-stone-200/70 bg-stone-50/70 hover:bg-amber-50/50"
              }`}
            >
              <p className="text-[11px] font-semibold text-stone-500">
                En soin
              </p>
              <p className="mt-0.5 text-lg font-extrabold text-amber-700">
                {warningPlants.length} 🩺
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Priority Watering Reminders Bento Strip */}
      {duePlants.length > 0 && (
        <section className="bento-card rounded-3xl border-sky-200/90 bg-gradient-to-r from-sky-50/90 via-white/90 to-sky-50/70 p-5">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
                <BellRing className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-stone-900">
                  Arrosages prioritaires du jour ({duePlants.length})
                </h2>
                <p className="text-xs text-stone-600">
                  Leur réserve d&apos;eau est basse — validez en un clic
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {duePlants.map((plant) => {
              const hydration = getHydrationStatus(
                plant.lastWateredAt,
                plant.nextWateringAt,
                plant.wateringIntervalDays
              );
              return (
                <div
                  key={plant.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-sky-200/80 bg-white p-3 shadow-sm hover:border-sky-300 transition-all"
                >
                  <Link
                    href={`/plants/${plant.id}`}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-botanical-100">
                      {plant.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={plant.imageUrl}
                          alt={plant.nickname}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg">
                          🪴
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-stone-900">
                        {plant.nickname}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        {plant.location} •{" "}
                        <span
                          className={
                            hydration.textColorClass + " font-semibold"
                          }
                        >
                          {hydration.label}
                        </span>
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="hydration-track h-2 flex-1 overflow-hidden rounded-full">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${hydration.percent}%`,
                              background: hydration.barGradient,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-stone-600">
                          {hydration.percent}%
                        </span>
                      </div>
                    </div>
                  </Link>

                  <button
                    onClick={(e) => handleQuickWater(plant, e)}
                    disabled={wateringId === plant.id}
                    className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 transition-colors"
                  >
                    <Droplets className="h-3.5 w-3.5" />
                    {wateringId === plant.id ? "..." : "Arroser"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Search, Room Pills & View Mode Bar */}
      <div className="bento-card rounded-2xl p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Room Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => {
              setSelectedRoom("ALL");
              setStatusFilter("ALL");
            }}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
              selectedRoom === "ALL" && statusFilter === "ALL"
                ? "bg-botanical-700 text-white shadow-sm"
                : "bg-stone-100/80 text-stone-700 hover:bg-botanical-50"
            }`}
          >
            Toutes ({plants.length})
          </button>
          {rooms.map((room) => (
            <button
              key={room}
              onClick={() => setSelectedRoom(room)}
              className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                selectedRoom === room
                  ? "bg-botanical-700 text-white shadow-sm"
                  : "bg-stone-100/80 text-stone-700 hover:bg-botanical-50"
              }`}
            >
              <MapPin className="h-3 w-3 opacity-75" />
              {room} ({plants.filter((p) => p.location === room).length})
            </button>
          ))}
        </div>

        {/* Search & View Switcher */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une plante, pièce..."
              className="w-full rounded-xl border border-stone-200/90 bg-white/90 py-1.5 pl-9 pr-3 text-xs font-medium focus:border-botanical-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center rounded-xl border border-stone-200/80 bg-stone-100/70 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === "grid"
                  ? "bg-white text-botanical-800 shadow-sm"
                  : "text-stone-500 hover:text-stone-800"
              }`}
              title="Vue Grille Bento"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === "list"
                  ? "bg-white text-botanical-800 shadow-sm"
                  : "text-stone-500 hover:text-stone-800"
              }`}
              title="Vue Liste Compacte"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* PLANTS DISPLAY */}
      {filteredPlants.length === 0 ? (
        <div className="bento-card rounded-3xl border-dashed p-12 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-botanical-100 text-3xl">
            🌱
          </div>
          <h3 className="text-lg font-bold text-stone-900">
            Aucune plante trouvée
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-stone-600">
            Ajoutez votre première plante d&apos;intérieur ou importez une
            sauvegarde existante avec son carnet de santé.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/plants/new"
              className="inline-flex items-center gap-2 rounded-xl bg-botanical-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-botanical-800 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Créer un profil plante
            </Link>
            <button
              type="button"
              onClick={() => {
                setImportError(null);
                setBackupModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-botanical-300 bg-botanical-50 px-5 py-2.5 text-sm font-semibold text-botanical-800 hover:bg-botanical-100 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Importer une sauvegarde (.json)
            </button>
          </div>
        </div>
      ) : viewMode === "list" ? (
        /* COMPACT LIST VIEW WITH HYDRATION GAUGE */
        <div className="space-y-2.5">
          {filteredPlants.map((plant) => {
            const hydration = getHydrationStatus(
              plant.lastWateredAt,
              plant.nextWateringAt,
              plant.wateringIntervalDays
            );
            const isDue =
              hydration.status === "overdue" || hydration.status === "today";

            return (
              <div
                key={plant.id}
                className="bento-card group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-3.5 transition-all hover:border-botanical-300"
              >
                <Link
                  href={`/plants/${plant.id}`}
                  className="flex items-center gap-3.5 min-w-0 flex-1"
                >
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-botanical-100">
                    {plant.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={plant.imageUrl}
                        alt={plant.nickname}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl">
                        🪴
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-extrabold text-stone-900 group-hover:text-botanical-700 transition-colors truncate">
                        {plant.nickname}
                      </h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
                        <MapPin className="h-3 w-3 text-botanical-600" />
                        {plant.location}
                      </span>
                      {renderHealthBadge(plant.healthStatus)}
                    </div>
                    <p className="text-xs text-stone-500 truncate mt-0.5">
                      {plant.species}
                      {plant.scientificName ? ` (${plant.scientificName})` : ""}
                    </p>
                  </div>
                </Link>

                {/* Inline Hydration Gauge */}
                <div className="sm:w-56 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-stone-700 flex items-center gap-1">
                      <Droplets className="h-3.5 w-3.5 text-sky-600" />
                      {hydration.percent}%
                    </span>
                    <span
                      className={`text-[11px] font-bold truncate ${hydration.textColorClass}`}
                    >
                      {hydration.label}
                    </span>
                  </div>
                  <div className="hydration-track h-2.5 w-full overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${hydration.percent}%`,
                        background: hydration.barGradient,
                      }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleQuickWater(plant, e)}
                    disabled={wateringId === plant.id}
                    className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                      isDue
                        ? "bg-sky-600 text-white hover:bg-sky-700 shadow-sm"
                        : "bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200/80"
                    }`}
                  >
                    <Droplets className="h-3.5 w-3.5" />
                    {wateringId === plant.id ? "..." : "Arroser"}
                  </button>
                  <Link
                    href={`/diagnose?plantId=${plant.id}`}
                    className="flex items-center justify-center rounded-xl border border-botanical-200 bg-botanical-50 p-2 text-botanical-800 hover:bg-botanical-100 transition-colors"
                    title="Docteur IA"
                  >
                    <Stethoscope className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* BENTO GRID VIEW WITH VISUAL WATER RESERVE GAUGE (%) */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlants.map((plant) => {
            const hydration = getHydrationStatus(
              plant.lastWateredAt,
              plant.nextWateringAt,
              plant.wateringIntervalDays
            );
            const isDue =
              hydration.status === "overdue" || hydration.status === "today";

            return (
              <div
                key={plant.id}
                className="bento-card group flex flex-col overflow-hidden rounded-3xl transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-botanical-300"
              >
                {/* Card Image Header */}
                <Link
                  href={`/plants/${plant.id}`}
                  className="relative aspect-[16/10] w-full overflow-hidden bg-botanical-100"
                >
                  {plant.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={plant.imageUrl}
                      alt={plant.nickname}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl">
                      🪴
                    </div>
                  )}

                  {/* Subtle bottom gradient vignette */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />

                  {/* Top-left Health Badge */}
                  <div className="absolute left-3 top-3">
                    {renderHealthBadge(plant.healthStatus)}
                  </div>

                  {/* Top-right Location Glass Pill */}
                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                    <MapPin className="h-3 w-3 text-emerald-300" />
                    {plant.location}
                  </div>

                  {/* Bottom-right Cycle Pill */}
                  <div className="absolute bottom-2.5 right-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-stone-800 shadow-sm backdrop-blur-md">
                    Cycle {plant.wateringIntervalDays}j
                  </div>
                </Link>

                {/* Card Body */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <Link
                      href={`/plants/${plant.id}`}
                      className="flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <h3 className="text-lg font-extrabold tracking-tight text-stone-900 group-hover:text-botanical-700 transition-colors truncate">
                          {plant.nickname}
                        </h3>
                        <p className="text-xs font-medium text-stone-500 truncate">
                          {plant.species}
                          {plant.scientificName
                            ? ` • ${plant.scientificName}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-400 group-hover:bg-botanical-50 group-hover:text-botanical-700 transition-colors">
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>

                    {/* VISUAL WATER RESERVE GAUGE (%) */}
                    <div className="mt-4 rounded-2xl border border-stone-200/80 bg-stone-50/80 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Droplets className="h-3.5 w-3.5 flex-shrink-0 text-sky-600" />
                          <span className="text-xs font-bold text-stone-700 truncate">
                            {hydration.label}
                          </span>
                        </div>
                        <span
                          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${hydration.badgeClass}`}
                        >
                          {hydration.percent}% d&apos;eau
                        </span>
                      </div>

                      {/* Gauge Track & Fill */}
                      <div className="hydration-track h-2.5 w-full overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${hydration.percent}%`,
                            background: hydration.barGradient,
                          }}
                        />
                      </div>

                      {/* Environment Mini Specs */}
                      <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-stone-500 border-t border-stone-200/60">
                        <span className="flex items-center gap-1 truncate">
                          <Sun className="h-3 w-3 text-amber-500 flex-shrink-0" />
                          <span className="truncate">
                            {plant.lightRequirement}
                          </span>
                        </span>
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <CloudRain className="h-3 w-3 text-teal-600" />
                          <span className="truncate max-w-[90px]">
                            {plant.humidityRequirement}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-4 flex items-center gap-2 pt-1">
                    <button
                      onClick={(e) => handleQuickWater(plant, e)}
                      disabled={wateringId === plant.id}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
                        isDue
                          ? "bg-gradient-to-r from-sky-600 to-sky-500 text-white hover:from-sky-700 hover:to-sky-600 shadow-sm"
                          : "bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200/80"
                      }`}
                    >
                      <Droplets className="h-3.5 w-3.5" />
                      {wateringId === plant.id
                        ? "Arrosage..."
                        : isDue
                        ? "Arroser maintenant"
                        : "Arroser"}
                    </button>

                    <Link
                      href={`/diagnose?plantId=${plant.id}`}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-botanical-200 bg-botanical-50 px-3.5 py-2.5 text-xs font-bold text-botanical-800 hover:bg-botanical-100 transition-colors"
                      title="Diagnostiquer l'état de santé par IA"
                    >
                      <HeartPulse className="h-3.5 w-3.5 text-botanical-700" />
                      Docteur IA
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
