import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSessionUser } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "WhatsUpPlant 🌿 — Gestion & Soin de Plantes par IA",
  description:
    "Gérez vos plantes d'intérieur : rappels d'arrosage, profils personnalisés, identification et diagnostic de maladies par intelligence artificielle.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WhatsUpPlant",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#2a5940",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const THEME_INIT_SCRIPT = `
(function() {
  try {
    var saved = localStorage.getItem('whatsupplant_theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = saved === 'dark' || (!saved && prefersDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased pb-20 md:pb-10">
        <Navbar user={user} />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
