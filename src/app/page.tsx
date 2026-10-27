import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient, PlantItem } from "@/components/DashboardClient";

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
    nickname: p.nickname,
    species: p.species,
    scientificName: p.scientificName,
    imageUrl: p.imageUrl,
    location: p.location,
    wateringIntervalDays: p.wateringIntervalDays,
    lastWateredAt: p.lastWateredAt.toISOString(),
    nextWateringAt: p.nextWateringAt.toISOString(),
    lightRequirement: p.lightRequirement,
    humidityRequirement: p.humidityRequirement,
    careNotes: p.careNotes,
    healthStatus: p.healthStatus,
  }));

  return <DashboardClient initialPlants={plants} userName={user.name} />;
}
