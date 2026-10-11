// LegalShell — chrome compartido de las páginas legales públicas
// (/politica-de-privacidad y /terminos). Server component: no usa estado
// del cliente, solo markup con los tokens de diseño del sitio.
//
// Estructura: header con marca + link de regreso al login, main en tarjeta
// blanca centrada, y footer con la fecha de vigencia.

import { GraduationCap, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface LegalShellProps {
  title: string;
  subtitle?: string;
  updatedLabel?: string;
  children: React.ReactNode;
}

export function LegalShell({ title, subtitle, updatedLabel, children }: LegalShellProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header de marca */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-primary rounded-xl">
              <GraduationCap size={18} className="text-white" />
            </div>
            <span className="font-bold text-text-primary tracking-tight">EdukControl</span>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors"
          >
            <ArrowLeft size={16} />
            Volver al inicio
          </Link>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-4xl mx-auto bg-card border border-border rounded-2xl shadow-sm px-8 py-10 md:px-12 md:py-12">
          <h1 className="text-3xl font-bold text-text-primary mb-2">{title}</h1>
          {subtitle && <p className="text-text-secondary mb-1">{subtitle}</p>}
          {updatedLabel && (
            <p className="text-sm text-text-muted mb-8">{updatedLabel}</p>
          )}
          <div className="space-y-8">{children}</div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-5 text-center text-sm text-text-muted">
          EdukControl — Sistema de Gestión Escolar
        </div>
      </footer>
    </div>
  );
}

// Sección tipográfica reutilizada por ambos documentos legales.
export function LegalSection({
  id,
  heading,
  children,
}: {
  id?: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-lg font-semibold text-text-primary mb-3">{heading}</h2>
      <div className="space-y-3 text-text-secondary leading-relaxed text-[15px]">
        {children}
      </div>
    </section>
  );
}
