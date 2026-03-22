import { getModeTitle } from "@/constants/design";
import { ProjectMode } from "@/types/app";

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function formatShortDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(timestamp));
}

export function createAutoProjectTitle(mode: ProjectMode, description: string): string {
  const cleanedDescription = description.trim();
  const dateLabel = formatShortDate(Date.now());

  if (cleanedDescription.length > 0) {
    const shortDescription = cleanedDescription.slice(0, 28).trim();
    return `${getModeTitle(mode)} — ${shortDescription}`;
  }

  return `${getModeTitle(mode)} ${dateLabel}`;
}
