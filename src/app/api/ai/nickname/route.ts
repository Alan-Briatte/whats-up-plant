import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { generatePlantNicknames } from "@/lib/gemini";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const species = body.species || "";
    const scientificName = body.scientificName || "";
    const location = body.location || "";
    const exclude: string[] = Array.isArray(body.exclude) ? body.exclude : [];

    const result = await generatePlantNicknames({
      species,
      scientificName,
      location,
      exclude,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate nickname error:", error);
    return NextResponse.json(
      { error: "Impossible de générer un surnom." },
      { status: 500 }
    );
  }
}
