import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const HTML_ENTITIES: Record<string, string> = {
  "&eacute;": "é",
  "&egrave;": "è",
  "&ecirc;": "ê",
  "&euml;": "ë",
  "&Eacute;": "É",
  "&Egrave;": "È",
  "&Ecirc;": "Ê",
  "&Euml;": "Ë",
  "&agrave;": "à",
  "&acirc;": "â",
  "&auml;": "ä",
  "&Agrave;": "À",
  "&Acirc;": "Â",
  "&Auml;": "Ä",
  "&ugrave;": "ù",
  "&ucirc;": "û",
  "&uuml;": "ü",
  "&Ugrave;": "Ù",
  "&Ucirc;": "Û",
  "&Uuml;": "Ü",
  "&icirc;": "î",
  "&iuml;": "ï",
  "&Icirc;": "Î",
  "&Iuml;": "Ï",
  "&ocirc;": "ô",
  "&ouml;": "ö",
  "&Ocirc;": "Ô",
  "&Ouml;": "Ö",
  "&ccedil;": "ç",
  "&Ccedil;": "Ç",
  "&oelig;": "œ",
  "&OElig;": "Œ",
  "&aelig;": "æ",
  "&AElig;": "Æ",
  "&ntilde;": "ñ",
  "&Ntilde;": "Ñ",
  "&yuml;": "ÿ",
  "&apos;": "'",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&laquo;": "«",
  "&raquo;": "»",
  "&ndash;": "–",
  "&mdash;": "—",
  "&hellip;": "…",
  "&deg;": "°",
  "&nbsp;": " ",
  "&quot;": '"',
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
};

function decodeSinglePass(input: string): string {
  if (!input || !input.includes("&")) return input;

  return input
    .replace(/&#(\d+);/g, (match, dec) => {
      const code = parseInt(dec, 10);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
      const code = parseInt(hex, 16);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    })
    .replace(/&[a-zA-Z]+;/g, (entity) => HTML_ENTITIES[entity] ?? entity);
}

/**
 * Décoder les entités HTML (&eacute;, &egrave;, &#39;, etc.) potentiellement générées par l'IA.
 */
export function decodeHtmlEntities(input: string): string {
  if (typeof input !== "string" || !input || input.startsWith("data:image/")) {
    return input;
  }
  const firstPass = decodeSinglePass(input);
  return firstPass.includes("&") ? decodeSinglePass(firstPass) : firstPass;
}

/**
 * Nettoie récursivement toutes les chaînes de caractères d'un objet ou tableau JSON.
 */
export function deepDecodeHtmlEntities<T>(value: T): T {
  if (typeof value === "string") {
    return decodeHtmlEntities(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepDecodeHtmlEntities(item)) as unknown as T;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepDecodeHtmlEntities(v);
    }
    return out as T;
  }
  return value;
}

export function getDaysUntilWatering(nextWateringAt: Date | string): number {
  const now = new Date();
  const target = new Date(nextWateringAt);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getWateringUrgency(nextWateringAt: Date | string): {
  label: string;
  status: "overdue" | "today" | "soon" | "ok";
  daysDiff: number;
} {
  const days = getDaysUntilWatering(nextWateringAt);
  if (days < 0) {
    return {
      label: `En retard de ${Math.abs(days)} j`,
      status: "overdue",
      daysDiff: days,
    };
  }
  if (days === 0) {
    return {
      label: "À arroser aujourd'hui",
      status: "today",
      daysDiff: 0,
    };
  }
  if (days <= 2) {
    return {
      label: `Dans ${days} jour${days > 1 ? "s" : ""}`,
      status: "soon",
      daysDiff: days,
    };
  }
  return {
    label: `Dans ${days} jours`,
    status: "ok",
    daysDiff: days,
  };
}

/**
 * Calcule le niveau de réserve d'eau estimé (%) d'une plante
 * pour afficher une jauge visuelle sur chaque carte et fiche plante.
 */
export function getHydrationStatus(
  _lastWateredAt: Date | string,
  nextWateringAt: Date | string,
  wateringIntervalDays: number
): {
  percent: number;
  status: "overdue" | "today" | "soon" | "ok";
  label: string;
  barColorClass: string;
  barGradient: string;
  textColorClass: string;
  badgeClass: string;
} {
  const urgency = getWateringUrgency(nextWateringAt);
  const now = Date.now();
  const next = new Date(nextWateringAt).getTime();
  const cycleMs = Math.max(1, wateringIntervalDays) * 24 * 60 * 60 * 1000;

  let rawRatio = (next - now) / cycleMs;
  if (Number.isNaN(rawRatio)) {
    rawRatio = 0.5;
  }

  let percent: number;
  if (urgency.status === "overdue") {
    const overdueDays = Math.abs(urgency.daysDiff);
    percent = Math.max(8, Math.round(16 - overdueDays * 3));
  } else if (urgency.status === "today") {
    percent = 16;
  } else {
    percent = Math.max(24, Math.min(100, Math.round(rawRatio * 100)));
  }

  if (urgency.status === "overdue") {
    return {
      percent,
      status: "overdue",
      label: urgency.label,
      barColorClass: "bg-gradient-to-r from-red-500 via-orange-500 to-amber-500",
      barGradient:
        "linear-gradient(90deg, #ef4444 0%, #f97316 55%, #f59e0b 100%)",
      textColorClass: "text-red-700",
      badgeClass: "bg-red-100 text-red-800 border border-red-200",
    };
  }

  if (urgency.status === "today") {
    return {
      percent,
      status: "today",
      label: urgency.label,
      barColorClass: "bg-gradient-to-r from-amber-500 to-sky-500",
      barGradient: "linear-gradient(90deg, #f59e0b 0%, #0ea5e9 100%)",
      textColorClass: "text-amber-800",
      badgeClass: "bg-amber-100 text-amber-800 border border-amber-200",
    };
  }

  if (urgency.status === "soon") {
    return {
      percent,
      status: "soon",
      label: urgency.label,
      barColorClass: "bg-gradient-to-r from-sky-500 to-teal-400",
      barGradient: "linear-gradient(90deg, #0ea5e9 0%, #2dd4bf 100%)",
      textColorClass: "text-sky-800",
      badgeClass: "bg-sky-100 text-sky-800 border border-sky-200",
    };
  }

  return {
    percent,
    status: "ok",
    label: urgency.label,
    barColorClass: "bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500",
    barGradient:
      "linear-gradient(90deg, #10b981 0%, #14b8a6 50%, #0ea5e9 100%)",
    textColorClass: "text-emerald-800",
    badgeClass: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  };
}
