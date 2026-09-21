// Layout para rutas de autenticación (login)
// Split-screen: hero visual a la izquierda, formulario a la derecha

import { GraduationCap, Shield, Users, BookOpen } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo: Hero visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-accent via-accent-dark to-accent-deeper">
        {/* Formas decorativas */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        </div>

        {/* Contenido del hero */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="flex items-center justify-center w-12 h-12 bg-white/15 rounded-xl backdrop-blur-sm">
              <GraduationCap size={24} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">EdukControl</span>
          </div>

          {/* Título principal */}
          <h2 className="text-4xl font-bold leading-tight mb-6">
            Gestión escolar
            <br />
            <span className="text-white/80">inteligente</span>
          </h2>
          <p className="text-lg text-white/70 leading-relaxed mb-12 max-w-md">
            Control de asistencia, calificaciones y gestión académica en una sola plataforma.
          </p>

          {/* Características */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 bg-white/10 rounded-lg">
                <Shield size={20} className="text-white" />
              </div>
              <span className="text-white/80 text-sm">Acceso seguro por rol y permisos</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 bg-white/10 rounded-lg">
                <Users size={20} className="text-white" />
              </div>
              <span className="text-white/80 text-sm">Comunicación directa con padres de familia</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 bg-white/10 rounded-lg">
                <BookOpen size={20} className="text-white" />
              </div>
              <span className="text-white/80 text-sm">Reportes y seguimiento en tiempo real</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho: Formulario */}
      <div className="flex-1 flex items-center justify-center bg-background px-6">
        {children}
      </div>
    </div>
  );
}
