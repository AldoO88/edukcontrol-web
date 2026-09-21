"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "./Card";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { CheckCircle2, School, Users, ClipboardList, Sparkles, ArrowRight, X } from "lucide-react";

// OnboardingWizard: el primer paso del super_admin nuevo cuando
// entra al sistema. Aparece solo si schools.total === 0 && users.thisMonth === 0.
// Permite dismiss (con localStorage) para no volver a aparecer.
const STORAGE_KEY = "eduk_onboarding_dismissed";

const STEPS = [
  {
    icon: School,
    title: "Crea tu primera escuela",
    description:
      "Registra la institución educativa con su CCT, nombre oficial y dirección. Esto habilita el alta de ciclos, maestros y alumnos.",
    cta: "Crear Escuela",
    href: "/schools/new",
  },
  {
    icon: Users,
    title: "Crea un usuario administrador",
    description:
      "Registra un usuario con rol 'admin' o 'principal' para que se encargue de la operación de esa escuela (matrículas, maestros, calendar).",
    cta: "Crear Usuario",
    href: "/users",
  },
  {
    icon: ClipboardList,
    title: "Crea el primer ciclo escolar",
    description:
      "Dentro de la escuela, crea el ciclo escolar activo (ej. 2025-2026). El Asistente de Configuración te guiará paso a paso (turnos, calendar, maestros, grupos, horarios).",
    cta: "Ir a la escuela",
    href: "/schools",
  },
];

export function OnboardingWizard({
  schoolsTotal,
  usersThisMonth,
}: {
  schoolsTotal: number;
  usersThisMonth: number;
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(true); // start true to avoid flash

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    setDismissed(stored === "true");
  }, []);

  // Mostrar solo si schoolsTotal === 0 && usersThisMonth === 0
  // y el usuario no lo ha dismissado.
  if (schoolsTotal > 0 || usersThisMonth > 0 || dismissed) {
    return null;
  }

  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const Icon = step.icon;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      handleDismiss();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20 shadow-sm">
      <CardBody>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-accent text-white rounded-xl shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-accent-dark uppercase tracking-wider">
                Bienvenida
              </p>
              <h2 className="text-xl font-bold text-text-primary">
                Empecemos a configurar tu primera escuela
              </h2>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-text-muted"
            title="Cerrar"
            aria-label="Cerrar asistente"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step counter */}
        <div className="flex items-center gap-2 mb-4">
          {STEPS.map((s, idx) => (
            <div
              key={s.title}
              className={`h-1 flex-1 rounded-full ${
                idx <= currentStep ? "bg-accent" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-border">
          <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-xl shrink-0">
            <Icon size={22} className="text-accent-dark" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-text-primary">
                {step.title}
              </h3>
              <Badge variant="slate">
                Paso {currentStep + 1} de {STEPS.length}
              </Badge>
            </div>
            <p className="text-sm text-text-secondary">{step.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-text-muted"
          >
            Lo haré más tarde
          </Button>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Atrás
              </Button>
            )}
            <Button
              variant="sky"
              size="sm"
              onClick={handleNext}
            >
              {isLastStep ? "Listo" : step.cta}
              <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
