import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { diagnosePlantHealth } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { persistDiagnosisPhotos } from "@/lib/storage";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const rawImages: string[] = Array.isArray(body.images)
      ? body.images.filter(
          (img: unknown) => typeof img === "string" && img.trim()
        )
      : body.imageBase64
      ? [String(body.imageBase64)]
      : [];

    const symptoms = body.symptoms || "";
    const plantId = body.plantId || null;

    let plantSpecies: string | undefined;
    let targetPlantMainPhoto: string | null = null;

    if (plantId) {
      const targetPlant = await prisma.plant.findFirst({
        where: { id: plantId, userId: user.id },
      });
      if (targetPlant) {
        plantSpecies = `${targetPlant.species} (${targetPlant.nickname})`;
        targetPlantMainPhoto = targetPlant.imageUrl;
      }
    }

    // Si aucune photo supplémentaire n'est fournie, utiliser la photo principale de la plante
    const imagesToAnalyze =
      rawImages.length > 0
        ? rawImages
        : targetPlantMainPhoto
        ? [targetPlantMainPhoto]
        : [];

    if (imagesToAnalyze.length === 0) {
      return NextResponse.json(
        {
          error:
            "Veuillez joindre au moins une photo ou sélectionner une plante possédant déjà une photo principale.",
        },
        { status: 400 }
      );
    }

    // 1. Analyze photos with Gemini Vision
    const diagnosis = await diagnosePlantHealth(
      imagesToAnalyze,
      symptoms,
      plantSpecies
    );

    // 2. Normalize photos for storage in the plant's Carnet de Santé
    const storedPhotoUrls = await persistDiagnosisPhotos(imagesToAnalyze);
    const imagesJsonStr = JSON.stringify(storedPhotoUrls);

    const saved = await prisma.healthDiagnosis.create({
      data: {
        userId: user.id,
        plantId: plantId || null,
        imageUrl: storedPhotoUrls[0] || null,
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

    // Save imagesJson via raw query so it succeeds even if Next.js dev server cached an older PrismaClient
    try {
      await prisma.$executeRaw`UPDATE HealthDiagnosis SET imagesJson = ${imagesJsonStr} WHERE id = ${saved.id}`;
    } catch (e) {
      console.warn("Could not update imagesJson column:", e);
    }

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
        images: storedPhotoUrls,
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
