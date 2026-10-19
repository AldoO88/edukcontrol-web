// Avatar de alumno — equivalente web de StudentAvatar.jsx de la app:
// foto de Cloudinary si existe, si no iniciales sobre fondo claro
// (mismo fallback azul indigo de la app).

"use client";

interface StudentAvatarProps {
  photoUrl?: string | null;
  name: string;
  size?: number;
  className?: string;
}

export function StudentAvatar({
  photoUrl,
  name,
  size = 48,
  className = "",
}: StudentAvatarProps) {
  // Iniciales: primera letra de las 2 primeras palabras (máx 2).
  const initials = (name || "")
    .split(/\s+/)
    .map((w) => w[0] || "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={`Foto de ${name}`}
        width={size}
        height={size}
        className={`rounded-full object-cover shrink-0 border border-border ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      aria-label={`Avatar de ${name}`}
      className={`rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size / 3) }}
    >
      {initials || "?"}
    </div>
  );
}
