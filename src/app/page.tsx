import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient, PlantItem } from "@/components/DashboardClient";
import { decodeHtmlEntities } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const rawPlants = await prisma.plant.findMany({
    where: { userId: user.id },
    orderBy: { nextWateringAt: "asc" },
  });

  const plants: PlantItem[] = rawPlants.map((p) => ({
    id: p.id,
    nickname: decodeHtmlEntities(p.nickname),
    species: decodeHtmlEntities(p.species),
    scientificName: p.scientificName
      ? decodeHtmlEntities(p.scientificName)
      : null,
    imageUrl: p.imageUrl,
    location: decodeHtmlEntities(p.location),
    wateringIntervalDays: p.wateringIntervalDays,
    lastWateredAt: p.lastWateredAt.toISOString(),
    nextWateringAt: p.nextWateringAt.toISOString(),
    lightRequirement: decodeHtmlEntities(p.lightRequirement),
    humidityRequirement: decodeHtmlEntities(p.humidityRequirement),
    careNotes: p.careNotes ? decodeHtmlEntities(p.careNotes) : null,
    healthStatus: p.healthStatus,
  }));

  return <DashboardClient initialPlants={plants} userName={user.name} />;
}
