import "./globals.css";

export const metadata = {
  title: "power spirit — messages et  éphémères",
  description: "Discute et échange des . Rien n'est conservé.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
