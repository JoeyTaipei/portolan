import type { NextConfig } from "next";

// Dossier and share pages are capabilities (spec §9): keep them out of search engines and
// never leak the URL to the sites they link to.
const privateHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Referrer-Policy", value: "no-referrer" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      // Tailwind for plain stylesheets only: CSS modules keep Next's own handling, so their
      // class names aren't lost.
      "*.css": {
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // A share id is exactly 22 base64url characters (spec §9). Anything else (a dossier id like
  // "sample", a typo) goes to an unmatched path, so it is a real 404 before any page streams.
  async rewrites() {
    const nowhere = "/_invalid-share-link";
    return {
      beforeFiles: [
        { source: "/s/:id([^/]{1,21})/:rest*", destination: nowhere },
        { source: "/s/:id([^/]{23,})/:rest*", destination: nowhere },
        { source: "/s/:id([^/]*[^A-Za-z0-9_/-][^/]*)/:rest*", destination: nowhere },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      { source: "/d/:path*", headers: privateHeaders },
      { source: "/s/:path*", headers: privateHeaders },
    ];
  },
};

export default nextConfig;
