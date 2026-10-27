"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Droplets,
  Plus,
  Stethoscope,
  MapPin,
  Sun,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  BellRing,
  ChevronRight,
} from "lucide-react";
import { getWateringUrgency } from "@/lib/utils";

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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [wateringId, setWateringId] = useState<string | null>(null);
  const [waterSuccessToast, setWaterSuccessToast] = useState<string | null>(
    null
  );

  const duePlants = plants.filter((p) => {
    const u = getWateringUrgency(p.nextWateringAt);
    return u.status === "overdue" || u.status === "today";
  });

  const warningPlants = plants.filter((p) => p.healthStatus !== "HEALTHY");

  useEffect(() => {
    // Si des plantes sont à arroser aujourd'hui et les notifications sont autorisées
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
        body: JSON.stringify({ notes: "Arrosage rapide depuis le tableau de bord" }),
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
        setWaterSuccessToast(`${plant.nickname} a bien été arrosée ! 💧`);
        setTimeout(() => setWaterSuccessToast(null), 3500);
        router.refresh();
      }
    } finally {
      setWateringId(null);
    }
  };

  const rooms = Array.from(new Set(plants.map((p) => p.location)));

  const filteredPlants = plants.filter((p) => {
    const matchesRoom = selectedRoom === "ALL" || p.location === selectedRoom;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      p.nickname.toLowerCase().includes(q) ||
      p.species.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q);
    return matchesRoom && matchesQuery;
  });

  const renderHealthBadge = (status: string) => {
    if (status === "CRITICAL") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100/95 px-2.5 py-1 text-xs font-semibold text-red-800 shadow-sm">
          <AlertTriangle className="h-3.5 w-3.5" />
          Soin urgent
        </span>
      );
    }
    if (status === "WARNING") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/95 px-2.5 py-1 text-xs font-semibold text-amber-800 shadow-sm">
          <AlertTriangle className="h-3.5 w-3.5" />
          À surveiller
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/95 px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
        <CheckCircle2 className="h-3.5 w-3.5" />
        En pleine forme
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast feedback */}
      {waterSuccessToast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-2 rounded-2xl bg-botanical-800 px-4 py-3 text-sm font-medium text-white shadow-lg">
          <Droplets className="h-4 w-4 text-sky-300" />
          {waterSuccessToast}
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-botanical-800 via-botanical-700 to-emerald-800 p-6 sm:p-8 text-white shadow-md">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-botanical-200">
              Tableau de bord botanique
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold">
              Bonjour {userName} 🌿
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-botanical-100">
              {duePlants.length > 0
                ? `Vous avez ${duePlants.length} plante${
                    duePlants.length > 1 ? "s" : ""
                  } qui attend${
                    duePlants.length > 1 ? "ent" : ""
                  } un arrosage aujourd'hui.`
                : "Toutes vos plantes sont parfaitement hydratées aujourd'hui !"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/plants/new"
              className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-botanical-900 shadow-sm hover:bg-botanical-50 transition-colors"
            >
              <Plus className="h-4 w-4 text-botanical-700" />
              Ajouter une plante
            </Link>
            <Link
              href="/diagnose"
              className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
            >
              <Stethoscope className="h-4 w-4 text-emerald-200" />
              Diagnostic IA
            </Link>
          </div>
        </div>

        {/* Quick KPIs */}
        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/15 pt-5">
          <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs text-botanical-100">Total plantes</p>
            <p className="mt-0.5 text-xl sm:text-2xl font-bold">{plants.length}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs text-botanical-100">À arroser</p>
            <p className="mt-0.5 text-xl sm:text-2xl font-bold text-sky-200">
              {duePlants.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs text-botanical-100">Santé à suivre</p>
            <p className="mt-0.5 text-xl sm:text-2xl font-bold text-amber-200">
              {warningPlants.length}
            </p>
          </div>
        </div>
      </div>

      {/* Priority Watering Reminders Section */}
      {duePlants.length > 0 && (
        <section className="rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-sky-50/60 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm">
                <BellRing className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Rappels d&apos;arrosage prioritaires ({duePlants.length})
                </h2>
                <p className="text-xs text-stone-600">
                  Validez l&apos;arrosage en un clic pour recalculer le prochain rappel
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {duePlants.map((plant) => {
              const urgency = getWateringUrgency(plant.nextWateringAt);
              return (
                <div
                  key={plant.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-sky-200/80 bg-white p-3.5 shadow-sm"
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
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-stone-900">
                        {plant.nickname}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        {plant.location} •{" "}
                        <span
                          className={
                            urgency.status === "overdue"
                              ? "font-semibold text-red-600"
                              : "font-semibold text-sky-700"
                          }
                        >
                          {urgency.label}
                        </span>
                      </p>
                    </div>
                  </Link>

                  <button
                    onClick={(e) => handleQuickWater(plant, e)}
                    disabled={wateringId === plant.id}
                    className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 transition-colors"
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

      {/* Search & Room Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedRoom("ALL")}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
              selectedRoom === "ALL"
                ? "bg-botanical-700 text-white shadow-sm"
                : "bg-white border border-stone-200 text-stone-700 hover:bg-botanical-50"
            }`}
          >
            Toutes ({plants.length})
          </button>
          {rooms.map((room) => (
            <button
              key={room}
              onClick={() => setSelectedRoom(room)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedRoom === room
                  ? "bg-botanical-700 text-white shadow-sm"
                  : "bg-white border border-stone-200 text-stone-700 hover:bg-botanical-50"
              }`}
            >
              {room} ({plants.filter((p) => p.location === room).length})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une plante..."
            className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-botanical-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Plants Grid */}
      {filteredPlants.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-botanical-300 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-botanical-100 text-3xl">
            🌱
          </div>
          <h3 className="text-lg font-bold text-stone-900">
            Aucune plante trouvée
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-stone-600">
            Ajoutez votre première plante d&apos;intérieur : prenez-la en photo
            et laissez l&apos;IA identifier son espèce et configurer ses rappels
            d&apos;arrosage.
          </p>
          <Link
            href="/plants/new"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-botanical-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-botanical-800 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Créer un profil plante
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlants.map((plant) => {
            const urgency = getWateringUrgency(plant.nextWateringAt);
            const isDue =
              urgency.status === "overdue" || urgency.status === "today";

            return (
              <div
                key={plant.id}
                className="group flex flex-col overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-sm transition-all hover:shadow-md hover:border-botanical-300"
              >
                {/* Card Image */}
                <Link
                  href={`/plants/${plant.id}`}
                  className="relative aspect-[16/11] w-full overflow-hidden bg-botanical-100"
                >
                  {plant.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={plant.imageUrl}
                      alt={plant.nickname}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl">
                      🪴
                    </div>
                  )}

                  <div className="absolute left-3 top-3">
                    {renderHealthBadge(plant.healthStatus)}
                  </div>

                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    <MapPin className="h-3 w-3" />
                    {plant.location}
                  </div>
                </Link>

                {/* Card Content */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <Link
                      href={`/plants/${plant.id}`}
                      className="flex items-start justify-between gap-2"
                    >
                      <div>
                        <h3 className="text-lg font-bold text-stone-900 group-hover:text-botanical-700 transition-colors">
                          {plant.nickname}
                        </h3>
                        <p className="text-xs font-medium text-stone-500">
                          {plant.species}
                          {plant.scientificName
                            ? ` (${plant.scientificName})`
                            : ""}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                    </Link>

                    {/* Watering & Light summary */}
                    <div className="mt-4 space-y-2 rounded-2xl bg-stone-50 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-stone-600">
                          <Clock className="h-3.5 w-3.5 text-sky-600" />
                          Prochain arrosage :
                        </span>
                        <span
                          className={`font-semibold ${
                            urgency.status === "overdue"
                              ? "text-red-600"
                              : urgency.status === "today"
                              ? "text-sky-700"
                              : "text-stone-800"
                          }`}
                        >
                          {urgency.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-stone-600">
                          <Sun className="h-3.5 w-3.5 text-amber-500" />
                          Exposition :
                        </span>
                        <span className="max-w-[160px] truncate font-medium text-stone-700">
                          {plant.lightRequirement}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-4 flex items-center gap-2 pt-2">
                    <button
                      onClick={(e) => handleQuickWater(plant, e)}
                      disabled={wateringId === plant.id}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-colors ${
                        isDue
                          ? "bg-sky-600 text-white hover:bg-sky-700 shadow-sm"
                          : "bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200/80"
                      }`}
                    >
                      <Droplets className="h-3.5 w-3.5" />
                      {wateringId === plant.id
                        ? "Enregistrement..."
                        : "Arroser"}
                    </button>

                    <Link
                      href={`/diagnose?plantId=${plant.id}`}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-botanical-200 bg-botanical-50 px-3.5 py-2.5 text-xs font-semibold text-botanical-800 hover:bg-botanical-100 transition-colors"
                      title="Diagnostiquer l'état de santé par IA"
                    >
                      <Stethoscope className="h-3.5 w-3.5" />
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
