import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoadSense AI",
  description: "Sistema de monitoramento de pavimentação com upload de imagens, IA e georreferenciamento.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
