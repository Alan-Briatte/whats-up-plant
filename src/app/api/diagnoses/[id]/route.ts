import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface StoredIssue {
  name: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  symptoms: string;
  cause: string;
  resolved?: boolean;
  resolvedAt?: string | null;
}

interface StoredTreatmentPayload {
  treatments?: unknown[];
  preventionTips?: string[];
  resolved?: boolean;
  resolvedAt?: string | null;
}

function isDiagnosisResolved(diag: {
  status: string;
  issuesJson: string;
  treatmentJson: string;
}): boolean {
  if (diag.status === "HEALTHY") return true;
  try {
    const parsedT = JSON.parse(diag.treatmentJson) as StoredTreatmentPayload;
    if (parsedT && parsedT.resolved === true) return true;
  } catch {
    // ignore
  }
  try {
    const issues = JSON.parse(diag.issuesJson) as StoredIssue[];
    if (Array.isArray(issues) && issues.length > 0) {
      return issues.every((i) => i.resolved === true);
    }
  } catch {
    // ignore
  }
  return false;
}

async function recalculatePlantHealthStatus(plantId: string, userId: string) {
  const remainingDiagnoses = await prisma.healthDiagnosis.findMany({
    where: { plantId, userId },
    orderBy: { createdAt: "desc" },
  });

  // On cherche le diagnostic le plus récent qui n'est pas encore résolu
  const latestActive = remainingDiagnoses.find(
    (d) => !isDiagnosisResolved(d)
  );

  const nextStatus = latestActive ? latestActive.status : "HEALTHY";

  await prisma.plant.updateMany({
    where: { id: plantId, userId },
    data: { healthStatus: nextStatus },
  });

  return nextStatus;
}

export async function PATCH(
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

    let issues: StoredIssue[] = [];
    try {
      const parsed = JSON.parse(existing.issuesJson);
      if (Array.isArray(parsed)) issues = parsed;
    } catch {
      issues = [];
    }

    let treatmentPayload: StoredTreatmentPayload = { treatments: [] };
    try {
      const parsed = JSON.parse(existing.treatmentJson);
      if (parsed && typeof parsed === "object") {
        treatmentPayload = parsed;
      }
    } catch {
      treatmentPayload = { treatments: [] };
    }

    const nowIso = new Date().toISOString();

    if (typeof body.issueIndex === "number") {
      // Résoudre / réouvrir un souci spécifique du diagnostic
      const idx = body.issueIndex;
      if (idx >= 0 && idx < issues.length) {
        const nextResolved =
          typeof body.resolved === "boolean"
            ? body.resolved
            : !issues[idx].resolved;
        issues[idx] = {
          ...issues[idx],
          resolved: nextResolved,
          resolvedAt: nextResolved ? nowIso : null,
        };
      }

      const allIssuesResolved =
        issues.length > 0 && issues.every((i) => i.resolved === true);
      treatmentPayload.resolved = allIssuesResolved;
      treatmentPayload.resolvedAt = allIssuesResolved ? nowIso : null;
    } else {
      // Résoudre / réouvrir tout le diagnostic
      const nextResolved =
        typeof body.resolved === "boolean"
          ? body.resolved
          : !treatmentPayload.resolved;

      treatmentPayload.resolved = nextResolved;
      treatmentPayload.resolvedAt = nextResolved ? nowIso : null;
      issues = issues.map((issue) => ({
        ...issue,
        resolved: nextResolved,
        resolvedAt: nextResolved ? issue.resolvedAt || nowIso : null,
      }));
    }

    const updated = await prisma.healthDiagnosis.update({
      where: { id: existing.id },
      data: {
        issuesJson: JSON.stringify(issues),
        treatmentJson: JSON.stringify(treatmentPayload),
      },
    });

    let plantHealthStatus: string | undefined;
    if (existing.plantId) {
      plantHealthStatus = await recalculatePlantHealthStatus(
        existing.plantId,
        user.id
      );
    }

    return NextResponse.json({
      ok: true,
      diagnosis: updated,
      plantHealthStatus,
    });
  } catch (error) {
    console.error("Update diagnosis error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du diagnostic." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
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
    await prisma.healthDiagnosis.delete({
      where: { id: existing.id },
    });

    let plantHealthStatus: string | undefined;
    if (existing.plantId) {
      plantHealthStatus = await recalculatePlantHealthStatus(
        existing.plantId,
        user.id
      );
    }

    return NextResponse.json({
      ok: true,
      plantHealthStatus,
    });
  } catch (error) {
    console.error("Delete diagnosis error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du diagnostic." },
      { status: 500 }
    );
  }
}

