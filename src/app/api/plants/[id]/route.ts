import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { deepDecodeHtmlEntities } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const plant = await prisma.plant.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      wateringLogs: {
        orderBy: { wateredAt: "desc" },
        take: 20,
      },
      diagnoses: {
        orderBy: { createdAt: "desc" },
        take: 15,
      },
    },
  });

  if (!plant) {
    return NextResponse.json({ error: "Plante introuvable" }, { status: 404 });
  }

  // Ensure imagesJson is always populated even if dev server PrismaClient was cached before migration
  try {
    const rawDiagImages = await prisma.$queryRaw<
      Array<{ id: string; imageUrl: string | null; imagesJson: string | null }>
    >`SELECT id, imageUrl, imagesJson FROM HealthDiagnosis WHERE plantId = ${plant.id}`;

    const mapById = new Map(rawDiagImages.map((r) => [r.id, r]));
    plant.diagnoses = plant.diagnoses.map((d) => {
      const raw = mapById.get(d.id);
      return {
        ...d,
        imageUrl: raw?.imageUrl ?? d.imageUrl,
        imagesJson: raw?.imagesJson ?? (d as { imagesJson?: string }).imagesJson ?? "[]",
      };
    });
  } catch {
    // Fallback if column not yet pushed
  }

  return NextResponse.json({ plant: deepDecodeHtmlEntities(plant) });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const existing = await prisma.plant.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Plante introuvable" }, { status: 404 });
  }

  try {
    const body = deepDecodeHtmlEntities(await req.json());
    const wateringIntervalDays =
      body.wateringIntervalDays !== undefined
        ? Math.max(1, Math.min(90, Number(body.wateringIntervalDays)))
        : existing.wateringIntervalDays;

    const nextWateringAt =
      body.wateringIntervalDays !== undefined
        ? new Date(
            existing.lastWateredAt.getTime() +
              wateringIntervalDays * 24 * 60 * 60 * 1000
          )
        : existing.nextWateringAt;

    const updated = await prisma.plant.update({
      where: { id: existing.id },
      data: {
        nickname: body.nickname ?? existing.nickname,
        species: body.species ?? existing.species,
        scientificName:
          body.scientificName !== undefined
            ? body.scientificName
            : existing.scientificName,
        location: body.location ?? existing.location,
        wateringIntervalDays,
        nextWateringAt,
        lightRequirement: body.lightRequirement ?? existing.lightRequirement,
        humidityRequirement:
          body.humidityRequirement ?? existing.humidityRequirement,
        careNotes:
          body.careNotes !== undefined ? body.careNotes : existing.careNotes,
        imageUrl:
          body.imageUrl !== undefined ? body.imageUrl : existing.imageUrl,
        healthStatus: body.healthStatus ?? existing.healthStatus,
      },
    });

    return NextResponse.json({ plant: deepDecodeHtmlEntities(updated) });
  } catch (error) {
    console.error("Update plant error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const existing = await prisma.plant.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Plante introuvable" }, { status: 404 });
  }

  await prisma.plant.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
