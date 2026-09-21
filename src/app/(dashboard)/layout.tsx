// Layout para rutas del dashboard (protegidas)
// Incluye Sidebar + Header + AuthGate + Breadcrumb

"use client";

import { AuthGate } from "@/components/layout/AuthGate";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 bg-background">
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
