import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(
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
    let notes = "Arrosage régulier";
    try {
      const body = await req.json();
      if (body.notes) notes = String(body.notes).trim();
    } catch {
      // body optional
    }

    const now = new Date();
    const nextWateringAt = new Date(
      now.getTime() + existing.wateringIntervalDays * 24 * 60 * 60 * 1000
    );

    const [updatedPlant, log] = await prisma.$transaction([
      prisma.plant.update({
        where: { id: existing.id },
        data: {
          lastWateredAt: now,
          nextWateringAt,
        },
      }),
      prisma.wateringLog.create({
        data: {
          plantId: existing.id,
          wateredAt: now,
          notes,
        },
      }),
    ]);

    return NextResponse.json({ plant: updatedPlant, log });
  } catch (error) {
    console.error("Water plant error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de l'arrosage." },
      { status: 500 }
    );
  }
}
