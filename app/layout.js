import "./globals.css";

export const metadata = {
  title: "Partage — messages et fichiers éphémères",
  description: "Discute et échange des fichiers. Rien n'est conservé.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
