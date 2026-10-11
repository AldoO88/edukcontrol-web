// Página pública: Política de Privacidad
// URL destinada al campo «Política de privacidad» de Google Play Console
// y a cualquier requisito legal. Es pública (no pasa por AuthGate).

import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/LegalShell";
import { PrivacyPolicy } from "@/components/legal/PrivacyPolicy";

export const metadata: Metadata = {
  title: "Política de Privacidad — EdukControl",
  description:
    "Conoce cómo EdukControl recopila, usa, protege y comparte tus datos personales en la app móvil y el panel web.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalShell
      title="Política de Privacidad"
      subtitle="Cómo recopilamos, usamos y protegemos tus datos personales en EdukControl."
      updatedLabel="Última actualización: 11 de octubre de 2026."
    >
      <PrivacyPolicy />
    </LegalShell>
  );
}
