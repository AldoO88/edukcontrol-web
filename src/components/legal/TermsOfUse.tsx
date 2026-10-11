// TermsOfUse — secciones de los Términos y Condiciones de uso de EdukControl.
// Se publican en /terminos junto con la Política de Privacidad (la app móvil
// enlaza a esta página desde el perfil: «Términos y Privacidad»).

import { LegalSection } from "./LegalShell";

export function TermsOfUse() {
  return (
    <>
      <LegalSection id="aceptacion" heading="1. Aceptación de los términos">
        <p>
          Al descargar, instalar o usar la aplicación móvil <strong>EdukControl</strong>{" "}
          o el panel web, aceptas estos Términos y Condiciones de uso. Si no estás
          de acuerdo, no utilices la plataforma. Estos términos complementan el
          contrato que tu institución escolar mantiene con el servicio.
        </p>
      </LegalSection>

      <LegalSection id="servicio" heading="2. Descripción del servicio">
        <p>
          EdukControl es una plataforma de gestión escolar que permite, entre otras
          funciones: control de asistencia, calificaciones, avisos y comunicados,
          citatorios, reportes de conducta, expedientes de alumnos y comunicación
          entre personal escolar y tutores. Las funciones disponibles dependen del
          rol asignado por tu institución.
        </p>
      </LegalSection>

      <LegalSection id="cuenta" heading="3. Cuenta y credenciales">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            El acceso se identifica mediante tu <strong className="text-text-primary">número
            de teléfono celular</strong> y contraseña.
          </li>
          <li>
            Eres responsable de mantener tu contraseña confidencial y de toda
            actividad realizada desde tu cuenta.
          </li>
          <li>
            Las cuentas las crea o autoriza el personal administrativo de la
            institución; no puedes transferirla a terceros.
          </li>
          <li>
            Si detectas un acceso no autorizado, repórtalo de inmediato a tu
            escuela y a nuestro correo de contacto.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="usos" heading="4. Usos permitidos">
        <p>Te comprometes a:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Usar la plataforma exclusivamente para fines escolares legítimos.</li>
          <li>
            Proporcionar información veraz y mantenerla actualizada.
          </li>
          <li>
            No intentar acceder a datos de otras instituciones, usuarios o alumnos
            fuera de tu rol y institución asignada.
          </li>
          <li>
            No realizar ingeniería inversa, copiar, modificar, distribuir o
            revender el servicio.
          </li>
          <li>
            No usar la plataforma para actividades ilícitas, difamatorias o que
            vulneren derechos de terceros.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="roles" heading="5. Roles y responsabilidades">
        <p>
          Cada usuario actúa bajo un rol (administrador, personal escolar o tutor)
          que determina qué información puede consultar y qué acciones puede
          realizar. La institución escolar es responsable de asignar roles
          correctos, de la exactitud de los datos académicos que captura y de las
          autorizaciones que obtiene de los tutores respecto a los datos de los
          alumnos.
        </p>
      </LegalSection>

      <LegalSection id="disponibilidad" heading="6. Disponibilidad">
        <p>
          Trabajamos para mantener el servicio disponible de forma continua, pero
          podremos haber interrupciones por mantenimiento, actualizaciones o causas
          fuera de nuestro control. No garantizamos disponibilidad ininterrumpida
          ni libre de errores.
        </p>
      </LegalSection>

      <LegalSection id="propiedad" heading="7. Propiedad intelectual">
        <p>
          EdukControl, su código, diseño, marca y contenidos son propiedad de sus
          titulares. Se te otorga una licencia limitada, no exclusiva e
          intransferible para usar la plataforma conforme a estos términos. Los
          datos que introduces pertenecen a tu institución escolar.
        </p>
      </LegalSection>

      <LegalSection id="responsabilidad" heading="8. Limitación de responsabilidad">
        <p>
          La plataforma se proporcion «tal cual». En la máxima medida permitida por
          la ley, no seremos responsables por daños indirectos, lucro cesante o
          pérdida de datos derivados del uso o la imposibilidad de uso del
          servicio, salvo los casos de dolo o culpa grave. Las decisiones
          académicas o administrativas adoptadas con base en la información de la
          plataforma son responsabilidad de la institución.
        </p>
      </LegalSection>

      <LegalSection id="terminacion" heading="9. Suspensión y terminación">
        <p>
          Podremos suspender o dar de baja cuentas que violen estos términos, previo
          aviso cuando sea posible. Tu institución puede solicitar la baja de tu
          cuenta en cualquier momento; tú puedes pedir la eliminación de tus datos
          conforme a la Política de Privacidad.
        </p>
      </LegalSection>

      <LegalSection id="cambios-terminos" heading="10. Cambios a estos términos">
        <p>
          Podremos actualizar estos términos. La versión vigente estará siempre
          disponible en esta página con su fecha de actualización. El uso continuo
          de la plataforma después de un cambio implica su aceptación.
        </p>
      </LegalSection>

      <LegalSection id="ley" heading="11. Ley aplicable y jurisdicción">
        <p>
          Estos términos se rigen por las leyes de los Estados Unidos Mexicanos.
          Cualquier controversia se someterá a los tribunales competentes de México,
          renunciando a cualquier otro fuero que pudiera corresponder.
        </p>
      </LegalSection>
    </>
  );
}
