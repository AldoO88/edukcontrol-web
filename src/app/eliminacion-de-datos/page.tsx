// Página pública: Eliminación de Datos
// URL destinada al campo «URL de eliminación de datos» del formulario de
// Seguridad de datos de Google Play Console. Es pública (no pasa por AuthGate).

import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/LegalShell";
import { DataDeletion } from "@/components/legal/DataDeletion";

export const metadata: Metadata = {
  title: "Eliminación de Datos — EdukControl",
  description:
    "Solicita la eliminación de tus datos personales en EdukControl. Te explicamos los pasos, los datos que se eliminan y los que se conservan.",
};

export default function DataDeletionPage() {
  return (
    <LegalShell
      title="Eliminación de Datos"
      subtitle="Cómo solicitar la eliminación de tus datos personales en EdukControl."
      updatedLabel="Última actualización: 12 de octubre de 2026."
    >
      <DataDeletion />
    </LegalShell>
  );
}
