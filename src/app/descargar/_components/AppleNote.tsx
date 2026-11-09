// Nota de "Continuar con Apple" (solo iOS): explica que para vincular
// el correo del tutor con su cuenta, la escuela necesita el dato
// (nombre, grado y grupo del alumno) — Guideline 4.8.
//
// Sin estado ni efectos: se usa en el selector /descargar (panel iOS)
// y en la página imprimible /descargar/guia/ios (fuente de los PDFs
// de los tutoriales), por eso vive en su propio archivo.

import { LegalSection } from "@/components/legal/LegalShell";

export function AppleNote() {
  return (
    <LegalSection heading="¿Quieres iniciar sesión con tu cuenta de Apple?">
      <p>
        La app para iPhone incluye el botón{" "}
        <strong>«Continuar con Apple»</strong>. Para que esté disponible
        en tu cuenta, primero debes <strong>compartir tu correo de
        Apple</strong> con tu escuela: envía un correo a{" "}
        <a
          href="mailto:soporte@edukcontrol.net"
          className="text-accent underline underline-offset-2"
        >
          soporte@edukcontrol.net
        </a>{" "}
        indicando:
      </p>
      <ul className="list-disc ml-5 space-y-1 pt-2">
        <li>
          <strong>Nombre completo del alumno</strong>
        </li>
        <li>
          <strong>Grado</strong>
        </li>
        <li>
          <strong>Grupo</strong>
        </li>
        <li>
          <strong>Tu correo de Apple</strong> (el mismo con el que
          entrarás)
        </li>
      </ul>
      <p className="pt-2">
        Una vez vinculado tu correo, podrás entrar con un toque usando tu
        cuenta de Apple, sin escribir contraseña.
      </p>
    </LegalSection>
  );
}
