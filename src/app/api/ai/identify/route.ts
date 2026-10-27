import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { identifyPlantFromImage } from "@/lib/gemini";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const imageBase64 = body.imageBase64 || "";
    const hintName = body.hintName || "";

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Veuillez fournir une photo de la plante." },
        { status: 400 }
      );
    }

    const result = await identifyPlantFromImage(imageBase64, hintName);
    return NextResponse.json({ identification: result });
  } catch (error) {
    console.error("AI Identify error:", error);
    return NextResponse.json(
      {
        error:
          "Impossible d'analyser l'image pour le moment. Vérifiez votre clé GEMINI_API_KEY ou réessayez.",
      },
      { status: 500 }
    );
  }
}
