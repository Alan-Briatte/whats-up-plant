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
  // Compare calendar days or exact hours
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
