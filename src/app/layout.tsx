import type { Metadata } from 'next';
import { Analytics } from "@vercel/analytics/next"
import './globals.css';

export const metadata: Metadata = {
  title: 'Questions Pour Un Champion',
  description: 'Un jeu multijoueur interactif',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <Analytics />
      <body>{children}</body>
    </html>
  );
}
