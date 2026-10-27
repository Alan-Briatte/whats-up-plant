import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { diagnosePlantHealth } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const imageBase64 = body.imageBase64 || "";
    const symptoms = body.symptoms || "";
    const plantId = body.plantId || null;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Veuillez joindre une photo de la plante ou des feuilles." },
        { status: 400 }
      );
    }

    let plantSpecies: string | undefined;
    if (plantId) {
      const targetPlant = await prisma.plant.findFirst({
        where: { id: plantId, userId: user.id },
      });
      if (targetPlant) {
        plantSpecies = `${targetPlant.species} (${targetPlant.nickname})`;
      }
    }

    const diagnosis = await diagnosePlantHealth(
      imageBase64,
      symptoms,
      plantSpecies
    );

    const saved = await prisma.healthDiagnosis.create({
      data: {
        userId: user.id,
        plantId: plantId || null,
        imageUrl: imageBase64,
        plantDetected: diagnosis.plantDetected,
        status: diagnosis.status,
        confidence: diagnosis.confidence,
        summary: diagnosis.summary,
        issuesJson: JSON.stringify(diagnosis.issues),
        treatmentJson: JSON.stringify({
          treatments: diagnosis.treatments,
          preventionTips: diagnosis.preventionTips,
        }),
      },
    });

    if (plantId) {
      await prisma.plant.updateMany({
        where: { id: plantId, userId: user.id },
        data: { healthStatus: diagnosis.status },
      });
    }

    return NextResponse.json({
      diagnosis: {
        ...diagnosis,
        id: saved.id,
        createdAt: saved.createdAt,
      },
    });
  } catch (error) {
    console.error("AI Diagnose error:", error);
    return NextResponse.json(
      { error: "Erreur lors du diagnostic IA." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const history = await prisma.healthDiagnosis.findMany({
    where: { userId: user.id },
    include: {
      plant: {
        select: {
          id: true,
          nickname: true,
          species: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  return NextResponse.json({ diagnoses: history });
}
