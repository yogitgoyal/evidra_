import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function riskColor(risk: number) {
  if (risk >= 80) return "var(--evidra-red)";
  if (risk >= 55) return "var(--evidra-amber)";
  return "var(--evidra-green)";
}

export function riskColorHex(risk: number) {
  if (risk >= 80) return "#dc3d43";
  if (risk >= 55) return "#d97a06";
  return "#16874f";
}

export function riskTextClass(risk: number) {
  if (risk >= 80) return "text-red";
  if (risk >= 55) return "text-amber";
  return "text-green";
}

export function riskLabel(risk: number) {
  if (risk >= 80) return "High";
  if (risk >= 55) return "Medium";
  return "Low";
}

export function confidenceLabel(c: string) {
  if (c === "high") return "High confidence";
  if (c === "ambiguous") return "Ambiguous";
  return "No reliable match";
}
