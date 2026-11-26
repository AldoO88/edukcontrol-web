import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Renombres de rutas (fusión 2026-11-25 de inasistencias +
  // justificantes del trabajador social en UNA pantalla): las URLs
  // viejas siguen funcionando (308) por si quedaron en bookmarks.
  redirects: async () => [
    {
      source: "/social-worker/attendance-summary",
      destination: "/social-worker/justificantes",
      permanent: true,
    },
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
