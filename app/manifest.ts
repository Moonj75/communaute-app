import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SC Lions d'Eugies",
    short_name: "Lions Eugies",
    description: "LEAW – Lions Eugies Around the World · l'appli du club de Subbuteo",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0a0a",
    theme_color: "#0b0a0a",
    categories: ["sports"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mes inscriptions", url: "/inscriptions", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Calendrier", url: "/calendrier", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
