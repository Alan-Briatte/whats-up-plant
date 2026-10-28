import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie, isAdminEmail } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const name = (body.name || "").trim();
    const password = body.password || "";
    const seedDemoPlants = Boolean(body.seedDemoPlants);
    const inviteToken = (body.inviteToken || "").trim();

    if (!email || !name || password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Veuillez renseigner un nom, un email valide et un mot de passe d'au moins 6 caractères.",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cette adresse email." },
        { status: 409 }
      );
    }

    // Seul l'email administrateur (ADMIN_EMAIL) peut s'inscrire sans jeton (s'il n'a pas encore créé son compte).
    // Toute autre personne DOIT présenter un jeton d'invitation valide.
    const isFirstAdminSetup = isAdminEmail(email);
    let validInvitationId: string | null = null;

    if (!isFirstAdminSetup) {
      if (!inviteToken) {
        return NextResponse.json(
          {
            error:
              "Les inscriptions publiques sont fermées. Un lien d'invitation valide est requis.",
          },
          { status: 403 }
        );
      }

      const invitation = await prisma.invitation.findUnique({
        where: { token: inviteToken },
      });

      if (!invitation) {
        return NextResponse.json(
          { error: "Ce lien d'invitation est invalide ou a été révoqué." },
          { status: 403 }
        );
      }

      if (invitation.usedAt) {
        return NextResponse.json(
          { error: "Ce lien d'invitation a déjà été utilisé." },
          { status: 403 }
        );
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        return NextResponse.json(
          { error: "Ce lien d'invitation a expiré." },
          { status: 403 }
        );
      }

      if (
        invitation.email &&
        invitation.email.trim().toLowerCase() !== email
      ) {
        return NextResponse.json(
          {
            error: `Cette invitation est réservée à l'adresse ${invitation.email}.`,
          },
          { status: 403 }
        );
      }

      validInvitationId = invitation.id;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });

    if (validInvitationId) {
      await prisma.invitation.update({
        where: { id: validInvitationId },
        data: {
          usedAt: new Date(),
          usedByEmail: user.email,
          usedByName: user.name,
        },
      });
    }

    if (seedDemoPlants) {
      const now = new Date();
      const todayDue = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

      await prisma.plant.create({
        data: {
          userId: user.id,
          nickname: "Monty le Monstera",
          species: "Monstera Deliciosa",
          scientificName: "Monstera deliciosa",
          location: "Salon",
          wateringIntervalDays: 7,
          lastWateredAt: sevenDaysAgo,
          nextWateringAt: todayDue,
          lightRequirement: "Lumière vive indirecte",
          humidityRequirement: "Moyenne à élevée (50-65%)",
          careNotes:
            "Laisser sécher sur 3 cm entre deux arrosages. Dépoussiérer les grandes feuilles fenestrées une fois par mois.",
          healthStatus: "HEALTHY",
          imageUrl:
            "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80",
          wateringLogs: {
            create: [
              {
                wateredAt: sevenDaysAgo,
                notes: "Arrosage complet + brumisation des feuilles",
              },
            ],
          },
        },
      });

      await prisma.plant.create({
        data: {
          userId: user.id,
          nickname: "Calypso",
          species: "Calathea Orbifolia",
          scientificName: "Goeppertia orbifolia",
          location: "Chambre",
          wateringIntervalDays: 5,
          lastWateredAt: fourDaysAgo,
          nextWateringAt: inThreeDays,
          lightRequirement: "Mi-ombre à lumière tamisée",
          humidityRequirement: "Élevée (60-75%)",
          careNotes:
            "Utiliser de l'eau filtrée ou non calcaire. Garder le substrat légèrement frais sans eau stagnante.",
          healthStatus: "WARNING",
          imageUrl:
            "https://images.unsplash.com/photo-1637967886160-fd78dc3ce3f5?auto=format&fit=crop&w=800&q=80",
        },
      });
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });
    setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'inscription." },
      { status: 500 }
    );
  }
}
