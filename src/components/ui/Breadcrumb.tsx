// Breadcrumb reutilizable para navegación jerárquica.
//
// Genera automáticamente la jerarquía de links desde el pathname. Cada segmento
// se vuelve un link excepto el último (la página actual).
//
// Ejemplo: /schools/123/school-years/456/calendar genera
//   Escuelas > Mi Escuela > 2025-2026 > Calendario

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

// Labels legibles para los slugs del primer nivel. Mapea el primer
// segmento del path (después del dashboard group) a un label amigable.
const FIRST_LEVEL_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  schools: "Escuelas",
  users: "Usuarios",
};

// Tags legibles para slugs específicos en niveles profundos.
// El user puede sobreescribir con un map pasado por prop.
const DEFAULT_LABEL_BY_SECTION: Record<string, string> = {
  "school-years": "Ciclos Escolares",
  "school-year": "Ciclo Escolar",
  teachers: "Maestros",
  groups: "Grupos",
  subjects: "Materias",
  students: "Alumnos",
  enrollments: "Inscripciones",
  schedules: "Horarios",
  calendar: "Calendario",
  credentials: "Credenciales",
  setup: "Configuración",

  "teacher-subjects": "Asignar Materias",
  grading: "Calificaciones",
  periods: "Períodos",
  new: "Nuevo",
  promotions: "Promover",
  bulk: "Carga Masiva",
  import: "Importar",
};

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  // Override del último segmento (la página actual) si necesita un
  // label custom. Por ejemplo, 'school-year/:yearId' → usar nombre real
  // del ciclo en vez de "Ciclo Escolar".
  customLastLabel?: string;
  // Override de items completos (si el caller quiere generar todo
  // manualmente en vez de usar la generación por defecto).
  items?: BreadcrumbItem[];
  // Map de overrides: { '/schools/abc': 'Mi Escuela', '/school-years/123': '2025-2026' }
  // para que los slugs ObjectId se reemplacen con nombres reales.
  pathLabelOverrides?: Record<string, string>;
}

const isObjectId = (s: string) => /^[a-f0-9]{24}$/i.test(s);

const labelForSegment = (segment: string, section: string): string => {
  // Casos especiales primero
  if (segment === "new") return DEFAULT_LABEL_BY_SECTION["new"];
  if (DEFAULT_LABEL_BY_SECTION[segment]) {
    return DEFAULT_LABEL_BY_SECTION[segment];
  }
  if (isObjectId(segment)) {
    return section === "schools"
      ? "Detalle de Escuela"
      : section === "school-years"
        ? "Ciclo"
        : "Detalle";
  }
  // Si el segmento parece kebab-case, capitalizarlo
  if (segment.includes("-")) {
    return segment
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return segment;
};

export function Breadcrumb({
  customLastLabel,
  items: explicitItems,
  pathLabelOverrides = {},
}: BreadcrumbProps = {}) {
  const pathname = usePathname();

  // Si el caller proveyó items manuales, usar esos
  if (explicitItems && explicitItems.length > 0) {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center text-sm">
        <ol className="flex items-center gap-1.5 flex-wrap">
          {explicitItems.map((item, idx) => {
            const isLast = idx === explicitItems.length - 1;
            return (
              <li
                key={`${item.href}-${idx}`}
                className="flex items-center gap-1.5"
              >
                {isLast ? (
                  <span className="font-semibold text-text-primary">
                    {item.label}
                  </span>
                ) : (
                  <>
                    <Link
                      href={item.href}
                      className="text-text-secondary hover:text-accent-dark transition-colors"
                    >
                      {item.label}
                    </Link>
                    <ChevronRight
                      size={14}
                      className="text-text-muted shrink-0"
                    />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  // Auto-generar desde el pathname
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const items: BreadcrumbItem[] = [];

  // Skip el primer segmento si es el route group "(dashboard)" — ya
  // sabemos que estamos en el dashboard.
  let workingSegments = segments;
  if (workingSegments[0] === "(dashboard)") {
    workingSegments = workingSegments.slice(1);
  }
  if (workingSegments.length === 0) return null;

  // Si el primer segmento no es el "home" del dashboard, agregamos
  // un link al dashboard como raíz
  if (workingSegments[0] !== "dashboard") {
    items.push({ label: "Dashboard", href: "/dashboard" });
  } else {
    workingSegments = workingSegments.slice(1);
  }

  // Si después de quitar "dashboard" no queda nada, sólo mostramos "Dashboard"
  if (workingSegments.length === 0) {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center text-sm">
        <ol className="flex items-center gap-1.5">
          <li className="flex items-center gap-1.5">
            <Home size={14} className="text-text-muted" />
            <span className="font-semibold text-text-primary">Dashboard</span>
          </li>
        </ol>
      </nav>
    );
  }

  // Construir jerarquía
  let parentPath = "";
  for (let i = 0; i < workingSegments.length; i++) {
    const seg = workingSegments[i];
    parentPath += `/${seg}`;
    // Saltar segmentos que son solo IDs puros cuando no hay override
    // (los labels por defecto ya cubren esto en labelForSegment).
    const isLast = i === workingSegments.length - 1;

    // Buscar override explícito
    let label: string | undefined = pathLabelOverrides[parentPath];

    if (!label) {
      // Si es el último segmento, permitir customLastLabel
      if (isLast && customLastLabel) {
        label = customLastLabel;
      } else {
        // Detectar la sección padre (segmento anterior) para elegir
        // el label correcto
        const parentSeg = i > 0 ? workingSegments[i - 1] : "";
        label = labelForSegment(seg, parentSeg);
      }
    }

    items.push({ label, href: parentPath });
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm">
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li
              key={`${item.href}-${idx}`}
              className="flex items-center gap-1.5"
            >
              {isLast ? (
                <span className="font-semibold text-text-primary">
                  {item.label}
                </span>
              ) : idx === 0 ? (
                <>
                  <Link
                    href={item.href}
                    className="text-text-secondary hover:text-accent-dark transition-colors flex items-center gap-1"
                  >
                    <Home size={14} className="text-text-muted" />
                    <span>{item.label}</span>
                  </Link>
                  <ChevronRight
                    size={14}
                    className="text-text-muted shrink-0"
                  />
                </>
              ) : (
                <>
                  <Link
                    href={item.href}
                    className="text-text-secondary hover:text-accent-dark transition-colors"
                  >
                    {item.label}
                  </Link>
                  <ChevronRight
                    size={14}
                    className="text-text-muted shrink-0"
                  />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
