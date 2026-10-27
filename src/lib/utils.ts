import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
