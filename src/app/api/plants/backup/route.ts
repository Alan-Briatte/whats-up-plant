import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export interface BackupWateringLog {
  wateredAt: string;
  notes: string | null;
}

export interface BackupDiagnosis {
  imageUrl: string | null;
  imagesJson: string;
  plantDetected: string | null;
  status: string;
  confidence: number;
  summary: string;
  issuesJson: string;
  treatmentJson: string;
  createdAt: string;
}

export interface BackupPlant {
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
  createdAt?: string;
  wateringLogs: BackupWateringLog[];
  diagnoses: BackupDiagnosis[];
}

export interface PlantsBackupPayload {
  app: "WhatsUpPlant";
  version: number;
  exportedAt: string;
  plants: BackupPlant[];
}

function parseSafeDate(value: unknown, fallback: Date = new Date()): Date {
  if (!value) return fallback;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function normalizeStatus(status: unknown): string {
  const s = String(status || "HEALTHY").toUpperCase();
  if (s === "CRITICAL" || s === "WARNING" || s === "HEALTHY") {
    return s;
  }
  return "HEALTHY";
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const plantId = searchParams.get("plantId");

  const plants = await prisma.plant.findMany({
    where: {
      userId: user.id,
      ...(plantId ? { id: plantId } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      wateringLogs: {
        orderBy: { wateredAt: "desc" },
      },
      diagnoses: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const payload: PlantsBackupPayload = {
    app: "WhatsUpPlant",
    version: 1,
    exportedAt: new Date().toISOString(),
    plants: plants.map((p) => ({
      nickname: p.nickname,
      species: p.species,
      scientificName: p.scientificName,
      imageUrl: p.imageUrl,
      location: p.location,
      wateringIntervalDays: p.wateringIntervalDays,
      lastWateredAt: p.lastWateredAt.toISOString(),
      nextWateringAt: p.nextWateringAt.toISOString(),
      lightRequirement: p.lightRequirement,
      humidityRequirement: p.humidityRequirement,
      careNotes: p.careNotes,
      healthStatus: p.healthStatus,
      createdAt: p.createdAt.toISOString(),
      wateringLogs: p.wateringLogs.map((w) => ({
        wateredAt: w.wateredAt.toISOString(),
        notes: w.notes,
      })),
      diagnoses: p.diagnoses.map((d) => ({
        imageUrl: d.imageUrl,
        imagesJson: d.imagesJson || "[]",
        plantDetected: d.plantDetected,
        status: d.status,
        confidence: d.confidence,
        summary: d.summary,
        issuesJson: d.issuesJson,
        treatmentJson: d.treatmentJson,
        createdAt: d.createdAt.toISOString(),
      })),
    })),
  };

  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const rawPlants: unknown[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.plants)
      ? body.plants
      : [];

    const mode: "merge" | "append" | "replace" =
      body?.mode === "append" || body?.mode === "replace"
        ? body.mode
        : "merge";

    if (rawPlants.length === 0) {
      return NextResponse.json(
        { error: "Aucune plante valide trouvée dans le fichier d'import." },
        { status: 400 }
      );
    }

    let createdCount = 0;
    let updatedCount = 0;
    let importedDiagnosesCount = 0;
    let importedLogsCount = 0;

    if (mode === "replace") {
      await prisma.plant.deleteMany({
        where: { userId: user.id },
      });
    }

    for (const item of rawPlants) {
      if (!item || typeof item !== "object") continue;
      const p = item as Record<string, unknown>;

      const nickname = String(p.nickname || "").trim();
      const species = String(p.species || "").trim();
      if (!nickname || !species) continue;

      const scientificName = p.scientificName
        ? String(p.scientificName).trim()
        : null;
      const imageUrl = p.imageUrl ? String(p.imageUrl) : null;
      const location = String(p.location || "Salon").trim() || "Salon";
      const wateringIntervalDays = Math.max(
        1,
        Math.min(90, Number(p.wateringIntervalDays) || 7)
      );
      const lastWateredAt = parseSafeDate(p.lastWateredAt, new Date());
      const defaultNextWatering = new Date(
        lastWateredAt.getTime() + wateringIntervalDays * 24 * 60 * 60 * 1000
      );
      const nextWateringAt = parseSafeDate(
        p.nextWateringAt,
        defaultNextWatering
      );
      const lightRequirement =
        String(p.lightRequirement || "Lumière indirecte vive").trim() ||
        "Lumière indirecte vive";
      const humidityRequirement =
        String(p.humidityRequirement || "Moyenne (40-60%)").trim() ||
        "Moyenne (40-60%)";
      const careNotes = p.careNotes ? String(p.careNotes).trim() : null;
      const healthStatus = normalizeStatus(p.healthStatus);

      const rawLogs = Array.isArray(p.wateringLogs) ? p.wateringLogs : [];
      const sanitizedLogs = rawLogs
        .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
        .map((l) => ({
          wateredAt: parseSafeDate(l.wateredAt, lastWateredAt),
          notes: l.notes ? String(l.notes) : null,
        }));

      const rawDiagnoses = Array.isArray(p.diagnoses) ? p.diagnoses : [];
      const sanitizedDiagnoses = rawDiagnoses
        .filter((d): d is Record<string, unknown> => !!d && typeof d === "object")
        .map((d) => ({
          userId: user.id,
          imageUrl: d.imageUrl ? String(d.imageUrl) : null,
          imagesJson:
            typeof d.imagesJson === "string"
              ? d.imagesJson
              : Array.isArray(d.imagesJson)
              ? JSON.stringify(d.imagesJson)
              : "[]",
          plantDetected: d.plantDetected ? String(d.plantDetected) : species,
          status: normalizeStatus(d.status),
          confidence: Math.max(0, Math.min(100, Number(d.confidence) || 85)),
          summary: String(d.summary || "Diagnostic importé"),
          issuesJson:
            typeof d.issuesJson === "string"
              ? d.issuesJson
              : JSON.stringify(d.issuesJson || []),
          treatmentJson:
            typeof d.treatmentJson === "string"
              ? d.treatmentJson
              : JSON.stringify(d.treatmentJson || { treatments: [] }),
          createdAt: parseSafeDate(d.createdAt, new Date()),
        }));

      // Check existing plant when mode === "merge"
      const existing =
        mode === "merge"
          ? await prisma.plant.findFirst({
              where: {
                userId: user.id,
                nickname,
                species,
              },
              include: {
                wateringLogs: true,
                diagnoses: true,
              },
            })
          : null;

      if (existing) {
        await prisma.plant.update({
          where: { id: existing.id },
          data: {
            scientificName: scientificName ?? existing.scientificName,
            imageUrl: imageUrl ?? existing.imageUrl,
            location,
            wateringIntervalDays,
            lastWateredAt,
            nextWateringAt,
            lightRequirement,
            humidityRequirement,
            careNotes: careNotes ?? existing.careNotes,
            healthStatus,
          },
        });

        const existingLogKeys = new Set(
          existing.wateringLogs.map(
            (w) => `${w.wateredAt.toISOString()}_${w.notes || ""}`
          )
        );
        const newLogs = sanitizedLogs.filter(
          (w) => !existingLogKeys.has(`${w.wateredAt.toISOString()}_${w.notes || ""}`)
        );
        if (newLogs.length > 0) {
          await prisma.wateringLog.createMany({
            data: newLogs.map((w) => ({
              plantId: existing.id,
              wateredAt: w.wateredAt,
              notes: w.notes,
            })),
          });
          importedLogsCount += newLogs.length;
        }

        const existingDiagKeys = new Set(
          existing.diagnoses.map(
            (d) => `${d.createdAt.toISOString()}_${d.summary}`
          )
        );
        const newDiagnoses = sanitizedDiagnoses.filter(
          (d) => !existingDiagKeys.has(`${d.createdAt.toISOString()}_${d.summary}`)
        );
        if (newDiagnoses.length > 0) {
          await prisma.healthDiagnosis.createMany({
            data: newDiagnoses.map((d) => ({
              ...d,
              plantId: existing.id,
            })),
          });
          importedDiagnosesCount += newDiagnoses.length;
        }

        updatedCount++;
      } else {
        const logsToCreate =
          sanitizedLogs.length > 0
            ? sanitizedLogs
            : [
                {
                  wateredAt: lastWateredAt,
                  notes: "Arrosage initial (plante importée)",
                },
              ];

        await prisma.plant.create({
          data: {
            userId: user.id,
            nickname,
            species,
            scientificName,
            imageUrl,
            location,
            wateringIntervalDays,
            lastWateredAt,
            nextWateringAt,
            lightRequirement,
            humidityRequirement,
            careNotes,
            healthStatus,
            wateringLogs: {
              create: logsToCreate,
            },
            diagnoses:
              sanitizedDiagnoses.length > 0
                ? {
                    create: sanitizedDiagnoses,
                  }
                : undefined,
          },
        });

        createdCount++;
        importedLogsCount += logsToCreate.length;
        importedDiagnosesCount += sanitizedDiagnoses.length;
      }
    }

    const updatedPlants = await prisma.plant.findMany({
      where: { userId: user.id },
      orderBy: { nextWateringAt: "asc" },
    });

    return NextResponse.json({
      ok: true,
      summary: {
        createdCount,
        updatedCount,
        importedDiagnosesCount,
        importedLogsCount,
      },
      plants: updatedPlants.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        species: p.species,
        scientificName: p.scientificName,
        imageUrl: p.imageUrl,
        location: p.location,
        wateringIntervalDays: p.wateringIntervalDays,
        lastWateredAt: p.lastWateredAt.toISOString(),
        nextWateringAt: p.nextWateringAt.toISOString(),
        lightRequirement: p.lightRequirement,
        humidityRequirement: p.humidityRequirement,
        careNotes: p.careNotes,
        healthStatus: p.healthStatus,
      })),
    });
  } catch (error) {
    console.error("Import plants error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'importation du fichier de plantes." },
      { status: 500 }
    );
  }
}

