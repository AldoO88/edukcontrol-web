// Página pública: Términos y Condiciones + Política de Privacidad
// Es la URL a la que enlaza la app móvil desde el perfil
// («Términos y Privacidad»): reúne ambos documentos en una sola página
// para que el usuario los vea sin navegar más. Cierra con un enlace a
// /eliminacion-de-datos (requisito de las tiendas: el link web de
// eliminación debe ser fácil de encontrar también fuera de la app).

import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, LegalSection } from "@/components/legal/LegalShell";
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
      <hr className="border-border" />
      <LegalSection
        id="eliminacion"
        heading="Eliminación de cuenta y datos"
      >
        <p>
          Puedes solicitar la eliminación de tu cuenta y de tus datos
          personales en cualquier momento. Desde la app, ve a{" "}
          <strong>Perfil → Eliminar mi cuenta</strong>, o consulta la página
          dedicada de{" "}
          <Link
            href="/eliminacion-de-datos"
            className="text-accent hover:text-accent-dark underline"
          >
            Eliminación de datos
          </Link>
          , donde encontrarás los pasos a seguir y el correo de contacto.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
