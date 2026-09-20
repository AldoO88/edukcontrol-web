// Layout para rutas de autenticación (login)
// Centrado en pantalla, sin sidebar

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {children}
    </div>
  );
}
