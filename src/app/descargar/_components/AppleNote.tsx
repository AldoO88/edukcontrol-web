// Nota de "Iniciar sesión con Apple" (solo iOS): al inicio de la guía
// presenta las dos formas de iniciar sesión — opción 1, el botón
// «Iniciar sesión con Apple» (y qué debe hacer la escuela para habilitarlo,
// Guideline 4.8), y opción 2, el ingreso tradicional con celular y
// contraseña.
//
// Sin estado ni efectos: se usa en el selector /descargar (panel iOS)
// y en la página imprimible /descargar/guia/ios (fuente de los PDFs
// de los tutoriales), por eso vive en su propio archivo.

import { LegalSection } from "@/components/legal/LegalShell";

export function AppleNote() {
  return (
    <LegalSection heading="Iniciar sesión: dos opciones">
      <p>
        <strong>Opción 1 — «Iniciar sesión con Apple».</strong> La app para
        iPhone incluye el botón{" "}
        <strong>«Iniciar sesión con Apple»</strong>. Para que esté disponible
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
      <ul className="list-disc ml-5 space-y-1 pt-2 print:pt-1">
        <li>
          <strong>Nombre de la escuela</strong>
        </li>
        <li>
          <strong>Nombre completo del alumno</strong>, grado y grupo
        </li>
        <li>
          <strong>Nombre del familiar o tutor legal</strong>
        </li>
        <li>
          <strong>Correo de Apple</strong> (el mismo con el que
          entrarás)
        </li>
        <li>
          <strong>Parentesco</strong>
        </li>
      </ul>
      <p className="pt-2">
        Una vez vinculado tu correo, podrás entrar con un toque usando tu
        cuenta de Apple, sin escribir contraseña.
      </p>
      <p className="pt-2">
        <strong>Opción 2 — celular y contraseña.</strong>
      </p>
    </LegalSection>
  );
}
