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

export async function DELETE(
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
    const { searchParams } = new URL(req.url);
    let logId = searchParams.get("logId") || "";

    if (!logId) {
      try {
        const body = await req.json();
        if (body?.logId) {
          logId = String(body.logId);
        }
      } catch {
        // body optional
      }
    }

    const targetLog = logId
      ? await prisma.wateringLog.findFirst({
          where: { id: logId, plantId: existing.id },
        })
      : await prisma.wateringLog.findFirst({
          where: { plantId: existing.id },
          orderBy: { wateredAt: "desc" },
        });

    if (!targetLog) {
      return NextResponse.json(
        { error: "Arrosage introuvable." },
        { status: 404 }
      );
    }

    await prisma.wateringLog.delete({
      where: { id: targetLog.id },
    });

    // Recalculer lastWateredAt et nextWateringAt à partir du dernier arrosage restant
    const latestRemainingLog = await prisma.wateringLog.findFirst({
      where: { plantId: existing.id },
      orderBy: { wateredAt: "desc" },
    });

    const newLastWateredAt = latestRemainingLog
      ? latestRemainingLog.wateredAt
      : existing.createdAt;

    const newNextWateringAt = latestRemainingLog
      ? new Date(
          latestRemainingLog.wateredAt.getTime() +
            existing.wateringIntervalDays * 24 * 60 * 60 * 1000
        )
      : existing.createdAt;

    const updatedPlant = await prisma.plant.update({
      where: { id: existing.id },
      data: {
        lastWateredAt: newLastWateredAt,
        nextWateringAt: newNextWateringAt,
      },
    });

    return NextResponse.json({ ok: true, plant: updatedPlant });
  } catch (error) {
    console.error("Delete watering log error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'arrosage." },
      { status: 500 }
    );
  }
}
