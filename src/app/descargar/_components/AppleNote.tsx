// Nota de "Continuar con Apple" (solo iOS): al inicio de la guía
// presenta las dos formas de iniciar sesión — opción 1, el botón
// «Continuar con Apple» (y qué debe hacer la escuela para habilitarlo,
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
        <strong>Opción 1 — «Continuar con Apple».</strong> La app para
        iPhone incluye el botón{" "}
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
      <p className="pt-2">
        <strong>Opción 2 — celular y contraseña.</strong> En la pantalla{" "}
        <strong>Bienvenido</strong> escribe tu{" "}
        <strong>celular y contraseña</strong> y toca{" "}
        <strong>«Iniciar Sesión»</strong>.
      </p>
    </LegalSection>
  );
}
