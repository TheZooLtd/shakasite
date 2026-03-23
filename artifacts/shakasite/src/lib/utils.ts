import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function calculateHours(start?: string | null, finish?: string | null, lunchMins?: number | null): number {
  if (!start || !finish) return 0;
  
  const [startH, startM] = start.split(':').map(Number);
  const [finishH, finishM] = finish.split(':').map(Number);
  
  let totalMinutes = (finishH * 60 + finishM) - (startH * 60 + startM);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight shift
  
  if (lunchMins) {
    totalMinutes -= lunchMins;
  }
  
  return Math.max(0, totalMinutes / 60);
}
