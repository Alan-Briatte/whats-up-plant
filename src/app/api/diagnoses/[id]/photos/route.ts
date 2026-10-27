import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { persistDiagnosisPhotos } from "@/lib/storage";

function parseExistingPhotos(
  imagesJson: string | null | undefined,
  imageUrl: string | null | undefined
): string[] {
  const list: string[] = [];
  if (imagesJson) {
    try {
      const parsed = JSON.parse(imagesJson);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === "string" && item.trim()) list.push(item);
        }
      }
    } catch {
      // ignore
    }
  }
  if (imageUrl && imageUrl.trim() && !list.includes(imageUrl)) {
    list.unshift(imageUrl);
  }
  return list;
}

async function getDiagnosisRawPhotos(
  diagId: string,
  fallbackImageUrl: string | null
): Promise<string[]> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ imageUrl: string | null; imagesJson: string | null }>
    >`SELECT imageUrl, imagesJson FROM HealthDiagnosis WHERE id = ${diagId}`;
    if (rows.length > 0) {
      return parseExistingPhotos(rows[0].imagesJson, rows[0].imageUrl);
    }
  } catch {
    // ignore
  }
  return parseExistingPhotos(null, fallbackImageUrl);
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const existing = await prisma.healthDiagnosis.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Diagnostic introuvable" },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const newRawImages: string[] = Array.isArray(body.images)
      ? body.images.filter((i: unknown) => typeof i === "string" && i.trim())
      : body.imageBase64
      ? [String(body.imageBase64)]
      : [];

    if (newRawImages.length === 0) {
      return NextResponse.json(
        { error: "Aucune photo fournie." },
        { status: 400 }
      );
    }

    const savedNewUrls = await persistDiagnosisPhotos(newRawImages);
    const currentPhotos = await getDiagnosisRawPhotos(
      existing.id,
      existing.imageUrl
    );
    const updatedPhotos = [...currentPhotos, ...savedNewUrls];
    const imagesJsonStr = JSON.stringify(updatedPhotos);
    const primaryUrl = updatedPhotos[0] || null;

    await prisma.$executeRaw`UPDATE HealthDiagnosis SET imageUrl = ${primaryUrl}, imagesJson = ${imagesJsonStr} WHERE id = ${existing.id}`;

    return NextResponse.json({
      ok: true,
      images: updatedPhotos,
    });
  } catch (error) {
    console.error("Add diagnosis photo error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout des photos." },
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

  const existing = await prisma.healthDiagnosis.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Diagnostic introuvable" },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const photoUrlToRemove = body.photoUrl;
    const currentPhotos = await getDiagnosisRawPhotos(
      existing.id,
      existing.imageUrl
    );
    const updatedPhotos = currentPhotos.filter((p) => p !== photoUrlToRemove);
    const imagesJsonStr = JSON.stringify(updatedPhotos);
    const primaryUrl = updatedPhotos[0] || null;

    await prisma.$executeRaw`UPDATE HealthDiagnosis SET imageUrl = ${primaryUrl}, imagesJson = ${imagesJsonStr} WHERE id = ${existing.id}`;

    return NextResponse.json({
      ok: true,
      images: updatedPhotos,
    });
  } catch (error) {
    console.error("Remove diagnosis photo error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la photo." },
      { status: 500 }
    );
  }
}
