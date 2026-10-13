// Página pública: Centro de ayuda de EdukControl.
// Es la URL de soporte declarada en App Store Connect y Google Play:
// el usuario debe poder encontrar aquí cómo contactar y resolver los
// problemas más comunes (activación, instalación, contraseña, cuenta)
// sin buscar en otros sitios.

import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, LegalSection } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Soporte y Ayuda — EdukControl",
  description:
    "¿Necesitas ayuda con EdukControl? Contacto, soluciones a problemas frecuentes de activación, instalación y acceso.",
};

export default function SupportPage() {
  return (
    <LegalShell
      title="Soporte y Ayuda"
      subtitle="Soluciones a problemas frecuentes y forma de contactar al equipo de EdukControl."
      updatedLabel="Última actualización: 13 de octubre de 2026."
    >
      <LegalSection id="contacto" heading="Contacto">
        <p>
          Escríbenos a{" "}
          <a
            href="mailto:soporte@edukcontrol.net"
            className="text-accent hover:text-accent-dark underline"
          >
            soporte@edukcontrol.net
          </a>{" "}
          y te responderemos en horario laboral. Indica tu nombre, tu escuela
          y una descripción del problema.
        </p>
      </LegalSection>

      <LegalSection id="activacion" heading="Problemas con la activación">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            No llegó el código por WhatsApp → verifica que el número sea el
            que te dio tu escuela. Puedes solicitar el código de nuevo desde
            la pantalla de activación.
          </li>
          <li>
            «Tu cuenta está desactivada…» → contacta a tu escuela para que
            reactive tu cuenta.
          </li>
          <li>
            No puedo activar mi cuenta → verifica que el número tenga 10
            dígitos y que no esté ya activada con otra contraseña.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="acceso" heading="Acceso y contraseña">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            ¿Olvidaste tu contraseña? → en la pantalla Bienvenido toca{" "}
            <strong>«¿Olvidaste tu contraseña?»</strong> y sigue el mismo
            proceso de verificación por WhatsApp.
          </li>
          <li>
            «El usuario ya está activo, no puedes recuperar la contraseña por
            este medio» → solicita la recuperación desde la pantalla de
            inicio de sesión, no desde la activación.
          </li>
          <li>
            Si tu número de teléfono cambió, solicita la actualización a tu
            escuela.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="instalacion" heading="Instalación">
        <p>
          Las instrucciones de instalación para Android (APK y Google Play)
          y para iPhone/iPad (TestFlight) están en la página de{" "}
          <Link
            href="/descargar"
            className="text-accent hover:text-accent-dark underline"
          >
            Descarga
          </Link>
          , con capturas del paso a paso de activación.
        </p>
      </LegalSection>

      <LegalSection id="cuenta" heading="Cuenta y datos">
        <p>
          Puedes solicitar la eliminación de tu cuenta y de tus datos
          personales en cualquier momento. Consulta{" "}
          <Link
            href="/eliminacion-de-datos"
            className="text-accent hover:text-accent-dark underline"
          >
            Eliminación de datos
          </Link>{" "}
          para ver los pasos. El uso de la app se rige por los{" "}
          <Link
            href="/terminos"
            className="text-accent hover:text-accent-dark underline"
          >
            Términos y Privacidad
          </Link>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
