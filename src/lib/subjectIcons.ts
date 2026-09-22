// Mapa de iconos de lucide-react para materias.
// El campo `icon` en Subject guarda strings como "BookOpen", "Calculator", etc.
// Este archivo los resuelve a componentes reales.

import {
  BookOpen,
  Calculator,
  Globe,
  Leaf,
  FlaskConical,
  Atom,
  Map,
  Landmark,
  Dumbbell,
  Palette,
  Scale,
  Puzzle,
  Users,
  Cpu,
  Music,
  Camera,
  PenTool,
  Heart,
  Star,
  Wrench,
  BookText,
  Beaker,
  Languages,
  Megaphone,
  Laptop,
  Hammer,
  type LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  Calculator,
  Globe,
  Leaf,
  FlaskConical,
  Atom,
  Map,
  Landmark,
  Dumbbell,
  Palette,
  Scale,
  Puzzle,
  Users,
  Cpu,
  Music,
  Camera,
  PenTool,
  Heart,
  Star,
  Wrench,
  BookText,
  Beaker,
  Languages,
  Megaphone,
  Laptop,
  Hammer,
};

export const ICON_OPTIONS = Object.keys(ICON_MAP);

export function getSubjectIcon(iconName?: string | null): LucideIcon {
  if (iconName && ICON_MAP[iconName]) return ICON_MAP[iconName];
  return BookOpen;
}

// Colores predefinidos para materias (mismos del migration script)
export const SUBJECT_COLORS = [
  { hex: "#3B82F6", label: "Azul" },
  { hex: "#8B5CF6", label: "Violeta" },
  { hex: "#06B6D4", label: "Cyan" },
  { hex: "#22C55E", label: "Verde" },
  { hex: "#10B981", label: "Esmeralda" },
  { hex: "#A855F7", label: "Púrpura" },
  { hex: "#F59E0B", label: "Ámbar" },
  { hex: "#EF4444", label: "Rojo" },
  { hex: "#DC2626", label: "Rojo oscuro" },
  { hex: "#B91C1C", label: "Carmesí" },
  { hex: "#F97316", label: "Naranja" },
  { hex: "#EC4899", label: "Rosa" },
  { hex: "#6366F1", label: "Índigo" },
  { hex: "#14B8A6", label: "Teal" },
  { hex: "#64748B", label: "Gris" },
  { hex: "#0EA5E9", label: "Sky" },
];

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
