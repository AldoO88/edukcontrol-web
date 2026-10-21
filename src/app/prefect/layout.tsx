// Layout del área del prefecto (/prefect/*)
// Mismo shell que el panel de administración (AuthGate + Sidebar +
// Header + Breadcrumb) pero con el PrefectSidebar. El AuthGate ya
// aplica el gate por rol: un no-prefecto dentro de /prefect es
// redirigido a su home y renderiza null (sin flash de 403).

"use client";

import { AuthGate } from "@/components/layout/AuthGate";
import { PrefectSidebar } from "@/components/layout/PrefectSidebar";
import { Header } from "@/components/layout/Header";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export default function PrefectLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden">
        <PrefectSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          {/* Padding responsive del shell (Fase E web): en móvil
              compacto px-4, en desktop crece a px-6/px-8 — el
              contenido respira según el ancho disponible en vez del
              p-6 fijo de todas las pantallas. */}
          <main className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5 lg:px-8 lg:py-6 bg-background">
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
