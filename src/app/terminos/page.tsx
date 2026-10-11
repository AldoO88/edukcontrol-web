// Página pública: Términos y Condiciones + Política de Privacidad
// Es la URL a la que enlaza la app móvil desde el perfil
// («Términos y Privacidad»): reúne ambos documentos en una sola página
// para que el usuario los vea sin navegar más.

import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/LegalShell";
import { TermsOfUse } from "@/components/legal/TermsOfUse";
import { PrivacyPolicy } from "@/components/legal/PrivacyPolicy";

export const metadata: Metadata = {
  title: "Términos y Privacidad — EdukControl",
  description:
    "Términos y condiciones de uso y política de privacidad de la plataforma escolar EdukControl.",
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Términos y Privacidad"
      subtitle="Términos y condiciones de uso y política de privacidad de EdukControl."
      updatedLabel="Última actualización: 11 de octubre de 2026."
    >
      <TermsOfUse />
      <hr className="border-border" />
      <h2 className="text-2xl font-bold text-text-primary">Política de Privacidad</h2>
      <PrivacyPolicy />
    </LegalShell>
  );
}
