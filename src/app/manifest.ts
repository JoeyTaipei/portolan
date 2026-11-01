import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Portolan",
    short_name: "Portolan",
    description: "Market entry intelligence: evidence-backed stakeholder maps and briefs.",
    start_url: "/",
    display: "standalone",
    background_color: "#F3EEE4",
    theme_color: "#F3EEE4",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
