// Configuración Global — placeholder
// Solo visible para super_admin.

"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración Global"
        subtitle="Ajustes generales del sistema"
      />
      <Card>
        <CardBody>
          <div className="flex items-center gap-3 text-text-secondary">
            <Settings size={20} />
            <p>Próximamente: configuración de notificaciones, plantillas y parámetros del sistema.</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
