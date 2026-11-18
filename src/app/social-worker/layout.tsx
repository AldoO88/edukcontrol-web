// Layout del área del trabajador social (/social-worker/*)
// Mismo shell que el panel de administración y el área del prefecto
// (AuthGate + Sidebar + Header + Breadcrumb) pero con el
// SocialWorkerSidebar y acento emerald. El AuthGate ya aplica el gate
// por rol vía ROLE_AREAS: un rol ajeno dentro de /social-worker es
// redirigido a su home y renderiza null (sin flash de 403).

"use client";

import { AuthGate } from "@/components/layout/AuthGate";
import { SocialWorkerSidebar } from "@/components/layout/SocialWorkerSidebar";
import { Header } from "@/components/layout/Header";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export default function SocialWorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden">
        <SocialWorkerSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          {/* Padding responsive del shell (Fase E web): en móvil
              compacto px-4, en desktop crece a px-6/px-8 — el
              contenido respira según el ancho disponible. */}
          <main
            id="main-content"
            className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5 lg:px-8 lg:py-6 bg-background"
          >
            {/* Skip link (WCAG 2.4.1): oculto hasta que recibe foco
                de teclado — permite saltar sidebar y header. */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-white focus:text-emerald-800 focus:font-semibold focus:px-4 focus:py-2 focus:rounded-xl focus:border focus:border-emerald-600 shadow-sm"
            >
              Saltar al contenido
            </a>
            <div className="mb-4">
              <Breadcrumb />
            </div>
            {children}
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
