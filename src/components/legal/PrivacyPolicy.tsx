// PrivacyPolicy — secciones de la Política de Privacidad de EdukControl.
// Componente compartido: lo usan /politica-de-privacidad (solo privacidad)
// y /terminos (términos + privacidad en una sola página para la app móvil).
//
// Redactada en español (México) con enfoque LFPDPPP: identificación del
// responsable, datos recopilados, finalidades, transferencias, seguridad,
// conservación, derechos ARCO y contacto.

import { LegalSection } from "./LegalShell";

export function PrivacyPolicy() {
  return (
    <>
      <LegalSection id="responsable" heading="1. Responsable del tratamiento">
        <p>
          EdukControl es un sistema de gestión escolar (app móvil y panel web) que
          opera como proveedor de las instituciones educativas que utilizan la
          plataforma. Para el tratamiento de tus datos personales es responsable el
          equipo de <strong className="text-text-primary">EdukControl</strong>,
          a través del sitio <span className="font-mono text-sm">www.edukcontrol.net</span>{" "}
          y de la aplicación móvil EdukControl.
        </p>
        <p>
          Cuando los datos corresponden a alumnos, el responsable ante ti es
          además la <strong className="text-text-primary">institución escolar</strong>{" "}
          que contrató el servicio; EdukControl actúa como prestador de servicios
          tecnológicos por instrucción de la escuela.
        </p>
      </LegalSection>

      <LegalSection id="datos" heading="2. Datos personales que recopilamos">
        <p>En función del rol con el que uses la plataforma (personal escolar o tutor):</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong className="text-text-primary">Datos de cuenta:</strong> nombre,
            apellidos, número de teléfono celular (identificador de acceso),
            correo electrónico (opcional), contraseña (almacenada de forma
            irrecuperable) y rol dentro de la institución.
          </li>
          <li>
            <strong className="text-text-primary">Datos de alumnos:</strong> nombre,
            CURP, fecha de nacimiento, género, grupo, número de control, fotografía,
            datos de salud y contacto de emergencia (cuando la escuela los captura).
          </li>
          <li>
            <strong className="text-text-primary">Datos académicos y de
            convivencia:</strong> asistencia, calificaciones, horarios, avisos,
            citatorios y reportes de conducta.
          </li>
          <li>
            <strong className="text-text-primary">Datos de tutores/familiares:</strong>
            nombre, teléfono y vínculo con los alumnos, así como preferencias de
            notificación.
          </li>
          <li>
            <strong className="text-text-primary">Datos técnicos:</strong> token de
            sesión, token de notificaciones push del dispositivo y registros de
            acceso.
          </li>
        </ul>
        <p>
          No solicitamos datos financieros ni de tarjetas de pago. La plataforma no
          contiene publicidad de terceros.
        </p>
      </LegalSection>

      <LegalSection id="finalidades" heading="3. Para qué usamos tus datos">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Autenticarte y mantener tu sesión activa.</li>
          <li>
            Operar las funciones de la plataforma: asistencia, calificaciones,
            avisos, citatorios y reportes escolares.
          </li>
          <li>
            Enviar notificaciones push relacionadas con la actividad escolar
            (ausencias, avisos, citatorios).
          </li>
          <li>
            Envío de códigos de verificación (OTP) por WhatsApp cuando activas o
            recuperas tu cuenta.
          </li>
          <li>Generar reportes y estadísticas institucionales agregados.</li>
          <li>Garantizar la seguridad, integridad y prevención de fraudes.</li>
        </ul>
        <p>
          Tratamos tus datos con tu consentimiento (al crear la cuenta o al usar la
          plataforma) y para el cumplimiento de la relación contractual con la
          institución escolar. No realizamos perfiles publicitarios ni venta de
          datos.
        </p>
      </LegalSection>

      <LegalSection id="terceros" heading="4. Con quién compartimos la información">
        <p>
          No vendemos ni alquilamos tus datos personales. Compartimos únicamente lo
          necesario con proveedores que nos ayudan a operar el servicio:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong className="text-text-primary">Render</strong> — alojamiento del
            servidor y base de datos.
          </li>
          <li>
            <strong className="text-text-primary">MongoDB Atlas</strong> — base de
            datos en la nube.
          </li>
          <li>
            <strong className="text-text-primary">Expo / Google (FCM)</strong> —
            entrega de notificaciones push.
          </li>
          <li>
            <strong className="text-text-primary">Cloudinary</strong> — almacenamiento
            de fotografías de alumnos.
          </li>
          <li>
            <strong className="text-text-primary">Twilio / WhatsApp</strong> — envío
            de códigos de verificación.
          </li>
        </ul>
        <p>
          Todos ellos actúan como encargados del tratamiento bajo contrato y no
          pueden usar tus datos para fines propios. También podremos compartir datos
          cuando lo requiera una autoridad competente conforme a la ley.
        </p>
      </LegalSection>

      <LegalSection id="seguridad" heading="5. Medidas de seguridad">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            Comunicaciones cifradas mediante <strong className="text-text-primary">HTTPS/TLS</strong>{" "}
            en todas las peticiones.
          </li>
          <li>
            Contraseñas almacenadas con <strong className="text-text-primary">hash bcrypt</strong>{" "}
            (irrecuperables).
          </li>
          <li>
            Sesiones con <strong className="text-text-primary">tokens JWT</strong> de
            vida corta y refresco controlado.
          </li>
          <li>
            Acceso por roles y <strong className="text-text-primary">aislamiento por
            institución (multi-tenant)</strong>: cada escuela solo ve sus propios
            datos.
          </li>
          <li>
            Restricciones de acceso interno y monitoreo de la infraestructura.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="conservacion" heading="6. Conservación y eliminación">
        <p>
          Conservamos tus datos mientras la cuenta esté activa y la relación con la
          institución escolar esté vigente, y durante el tiempo que la legislación
          aplicable lo exija. Puedes solicitar la eliminación de tu cuenta y de tus
          datos personales en cualquier momento escribiéndonos (sección 8); la
          información académica de los alumnos se conserva por la escuela conforme a
          sus obligaciones educativas.
        </p>
      </LegalSection>

      <LegalSection id="arco" heading="7. Derechos ARCO y revocación">
        <p>
          Tienes derecho a <strong className="text-text-primary">Acceder</strong>,{" "}
          <strong className="text-text-primary">Rectificar</strong>,{" "}
          <strong className="text-text-primary">Cancelar</strong> u{" "}
          <strong className="text-text-primary">Oponerte</strong> al tratamiento de
          tus datos (derechos ARCO), así como a revocar tu consentimiento. Para
          ejercerlos envía tu solicitud a{" "}
          <a
            href="mailto:contacto@edukcontrol.net"
            className="text-accent hover:text-accent-dark underline"
          >
            contacto@edukcontrol.net
          </a>{" "}
          indicando tu nombre, medio de respuesta y los datos que deseas consultar o
          eliminar. Responderemos en los plazos que marca la ley.
        </p>
      </LegalSection>

      <LegalSection id="menores" heading="8. Datos de menores de edad">
        <p>
          Los datos de alumnos son capturados por la institución escolar con la
          autorización de sus tutores legales, en el marco de la relación educativa.
          La app no está dirigida a menores de edad para el alta de cuentas: las
          cuentas de acceso las crea el personal autorizado de la escuela. Si
          consideras que un menor nos ha proporcionado datos sin autorización,
          contáctanos para eliminarlos.
        </p>
      </LegalSection>

      <LegalSection id="cookies" heading="9. Cookies y almacenamiento local">
        <p>
          Usamos cookies y almacenamiento local del dispositivo exclusivamente para
          mantener tu sesión iniciada (opción «Recordar mi sesión») y para el
          funcionamiento técnico de la plataforma. No usamos cookies de publicidad
          ni de terceros con fines comerciales.
        </p>
      </LegalSection>

      <LegalSection id="cambios" heading="10. Cambios a esta política">
        <p>
          Podremos actualizar esta política para reflejar cambios legales o del
          servicio. Publicaremos la versión vigente en esta misma página con su
          fecha de actualización; te recomendamos revisarla periódicamente.
        </p>
      </LegalSection>

      <LegalSection id="contacto" heading="11. Contacto">
        <p>
          Para cualquier duda sobre esta política o el tratamiento de tus datos:
        </p>
        <p>
          Correo:{" "}
          <a
            href="mailto:contacto@edukcontrol.net"
            className="text-accent hover:text-accent-dark underline"
          >
            contacto@edukcontrol.net
          </a>
          <br />
          Sitio web:{" "}
          <a
            href="https://www.edukcontrol.net"
            className="text-accent hover:text-accent-dark underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.edukcontrol.net
          </a>
        </p>
      </LegalSection>
    </>
  );
}
