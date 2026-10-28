import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { deepDecodeHtmlEntities } from "@/lib/utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const plants = await prisma.plant.findMany({
    where: { userId: user.id },
    orderBy: { nextWateringAt: "asc" },
    include: {
      wateringLogs: {
        orderBy: { wateredAt: "desc" },
        take: 5,
      },
      diagnoses: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });

  return NextResponse.json({ plants: deepDecodeHtmlEntities(plants) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = deepDecodeHtmlEntities(await req.json());
    const nickname = (body.nickname || "").trim();
    const species = (body.species || "").trim();
    const scientificName = body.scientificName
      ? String(body.scientificName).trim()
      : null;
    const location = (body.location || "Salon").trim();
    const wateringIntervalDays = Math.max(
      1,
      Math.min(90, Number(body.wateringIntervalDays) || 7)
    );
    const lightRequirement =
      body.lightRequirement || "Lumière indirecte vive";
    const humidityRequirement =
      body.humidityRequirement || "Moyenne (40-60%)";
    const careNotes = body.careNotes ? String(body.careNotes).trim() : null;
    const imageUrl = body.imageUrl ? String(body.imageUrl) : null;

    if (!nickname || !species) {
      return NextResponse.json(
        { error: "Le surnom et l'espèce de la plante sont obligatoires." },
        { status: 400 }
      );
    }

    const lastWateredAt = body.lastWateredAt
      ? new Date(body.lastWateredAt)
      : new Date();
    const nextWateringAt = new Date(
      lastWateredAt.getTime() + wateringIntervalDays * 24 * 60 * 60 * 1000
    );

    const plant = await prisma.plant.create({
      data: {
        userId: user.id,
        nickname,
        species,
        scientificName,
        location,
        wateringIntervalDays,
        lastWateredAt,
        nextWateringAt,
        lightRequirement,
        humidityRequirement,
        careNotes,
        imageUrl,
        wateringLogs: {
          create: [
            {
              wateredAt: lastWateredAt,
              notes: "Premier arrosage enregistré à la création du profil",
            },
          ],
        },
      },
    });

    return NextResponse.json(
      { plant: deepDecodeHtmlEntities(plant) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create plant error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la plante." },
      { status: 500 }
    );
  }
}
