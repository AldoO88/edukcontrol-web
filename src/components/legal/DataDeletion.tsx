// Componente legal: Eliminación de Datos
// Contenido para la página pública /eliminacion-de-datos, usada como
// «URL de eliminación de datos» en el formulario de Seguridad de datos
// de Google Play Console. Debe mencionar la app, detallar los pasos y
// especificar qué se borra y qué se conserva (requisitos de Play).

export function DataDeletion() {
  return (
    <div className="space-y-8 text-slate-700 leading-relaxed">
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">
          1. ¿Quién es responsable de tus datos?
        </h2>
        <p className="mb-3">
          EdukControl es una plataforma de gestión escolar. Los datos
          personales registrados en la app pertenecen a la institución
          educativa (escuela) que utiliza EdukControl; la escuela es la
          responsable del tratamiento y de atender las solicitudes de
          eliminación de su comunidad (docentes, personal y familias).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">
          2. ¿Cómo solicitar la eliminación de tus datos?
        </h2>
        <p className="mb-3">Sigue estos pasos:</p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            Envía un correo electrónico a{" "}
            <a
              href="mailto:soporte@edukcontrol.net?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20datos%20—%20EdukControl"
              className="text-sky-600 font-semibold underline"
            >
              soporte@edukcontrol.net
            </a>{" "}
            con el asunto <strong>«Solicitud de eliminación de datos — EdukControl»</strong>.
          </li>
          <li>
            Indica en el cuerpo del correo: tu <strong>nombre completo</strong>,
            el <strong>número de teléfono</strong> registrado en la app, tu{" "}
            <strong>rol</strong> (docente, tutor, personal administrativo, etc.)
            y el <strong>nombre de tu escuela</strong>.
          </li>
          <li>
            La escuela verificará tu identidad y tu relación con la institución.
          </li>
          <li>
            Una vez verificada la solicitud, tus datos se eliminarán en un
            plazo máximo de <strong>30 días naturales</strong> y recibirás una
            confirmación por correo electrónico.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">
          3. ¿Qué datos se eliminan?
        </h2>
        <p className="mb-3">Al aprobarse la solicitud se eliminan de forma permanente:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Cuenta de usuario:</strong> nombre, correo electrónico,
            número de teléfono, rol y preferencias de la cuenta.
          </li>
          <li>
            <strong>Perfil de tutor (si aplica):</strong> datos de contacto,
            relación familiar y vínculos con alumnos en la app.
          </li>
          <li>
            <strong>Credenciales y sesión:</strong> contraseña, tokens de
            acceso y token de notificaciones push del dispositivo.
          </li>
          <li>
            <strong>Fotografía de perfil</strong> asociada a la cuenta, si existe.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">
          4. ¿Qué datos se conservan y por qué?
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Registros académicos e institucionales:</strong>{" "}
            calificaciones, historial de asistencia, conducta, expediente de
            salud escolar y comunicados. Son registros de la escuela y se
            conservan mientras la institución los necesite para cumplir sus
            obligaciones académicas y legales (por ejemplo, el ciclo escolar
            en curso y los plazos que exija la normativa aplicable).
          </li>
          <li>
            <strong>Logs de seguridad del servidor:</strong> registros técnicos
            de acceso y errores, conservados por un máximo de 90 días con
            fines de seguridad.
          </li>
          <li>
            <strong>Obligaciones legales:</strong> los datos que la ley exija
            conservar a la escuela se mantienen durante el período legal
            correspondiente, aun después de cerrar la cuenta.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">
          5. Datos de menores de edad
        </h2>
        <p>
          EdukControl no está dirigida a menores de edad. Los datos de los
          alumnos son gestionados por su escuela; las solicitudes relacionadas
          con un menor deben presentar los tutores legales o la propia
          institución siguiendo el mismo procedimiento descrito arriba.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">
          6. Contacto
        </h2>
        <p>
          Para cualquier duda sobre esta política o sobre el tratamiento de
          tus datos, escribe a{" "}
          <a
            href="mailto:soporte@edukcontrol.net"
            className="text-sky-600 font-semibold underline"
          >
            soporte@edukcontrol.net
          </a>
          .
        </p>
      </section>
    </div>
  );
}
