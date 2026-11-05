import type { MetadataRoute } from "next";

// Lets people add Krąg to the phone's home screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Krąg",
    short_name: "Krąg",
    description:
      "Wspólna opieka nad bliską osobą: leki, zadania i wizyty w jednym miejscu.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f4ef",
    theme_color: "#1f6b57",
    lang: "pl",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
