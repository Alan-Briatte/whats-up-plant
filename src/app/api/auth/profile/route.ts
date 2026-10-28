import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  createSessionToken,
  setSessionCookie,
  isAdminEmail,
} from "@/lib/auth";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Utilisateur introuvable." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    user: {
      ...user,
      isAdmin: isAdminEmail(user.email),
    },
  });
}

export async function PATCH(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";

    if (!name || !email) {
      return NextResponse.json(
        { error: "Le nom et l'adresse email sont obligatoires." },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "Compte utilisateur introuvable." },
        { status: 404 }
      );
    }

    // Si changement d'adresse email, vérifier qu'elle n'est pas déjà prise
    if (email !== dbUser.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (existingEmail && existingEmail.id !== dbUser.id) {
        return NextResponse.json(
          { error: "Cette adresse email est déjà utilisée par un autre compte." },
          { status: 409 }
        );
      }
    }

    let updatedPasswordHash = dbUser.passwordHash;

    // Si l'utilisateur souhaite modifier son mot de passe
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          {
            error:
              "Le nouveau mot de passe doit contenir au moins 6 caractères.",
          },
          { status: 400 }
        );
      }

      if (!currentPassword) {
        return NextResponse.json(
          {
            error:
              "Veuillez saisir votre mot de passe actuel pour définir un nouveau mot de passe.",
          },
          { status: 400 }
        );
      }

      const validCurrent = await bcrypt.compare(
        currentPassword,
        dbUser.passwordHash
      );
      if (!validCurrent) {
        return NextResponse.json(
          { error: "Le mot de passe actuel est incorrect." },
          { status: 403 }
        );
      }

      updatedPasswordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        name,
        email,
        passwordHash: updatedPasswordHash,
      },
    });

    const token = await createSessionToken({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
    });
    setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        isAdmin: isAdminEmail(updatedUser.email),
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour du profil." },
      { status: 500 }
    );
  }
}

