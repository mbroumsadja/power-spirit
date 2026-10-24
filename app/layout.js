import "./tokens.css";
import "./fonts.css";
import "./globals.css";

export const metadata = {
  title: "power spirit — messages et fichiers éphémères",
  description: "Discute et échange des fichiers. Rien n'est conservé.",
  applicationName: "power spirit",
  openGraph: {
    title: "power spirit",
    description: "Discute. Partage. Disparais. Messages et fichiers éphémères sur ton réseau.",
    siteName: "power spirit",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: "power spirit — Discute. Partage. Disparais." }],
  },
  twitter: { card: "summary_large_image", title: "power spirit", description: "Discute. Partage. Disparais.", images: ["/brand/og-image.png"] },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#DFF3FF" },
    { media: "(prefers-color-scheme: dark)", color: "#14121F" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        {/* Polices critiques préchargées (les autres sous-ensembles se chargent à la demande) */}
        <link rel="preload" href="/fonts/bricolage-grotesque-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/figtree-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
