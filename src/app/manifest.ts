import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WhatsUpPlant — Gestion & Soin de Plantes par IA",
    short_name: "WhatsUpPlant",
    description:
      "Gérez vos plantes d'intérieur : rappels d'arrosage, profils personnalisés et diagnostic de maladies par IA.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f8f4",
    theme_color: "#2a5940",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
