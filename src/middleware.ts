import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  // La autenticación se maneja en el cliente via AuthGate + useAuth.
  // El middleware NO verifica cookies porque el backend setea la cookie
  // en un puerto distinto (5050) y no está disponible en el middleware (3000).
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Excluir archivos estáticos, imágenes, y API routes
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
