import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Dashboard Trade Marketing",
  description: "Dashboard Trade Marketing — Cuadros Básicos · Infaltables · Estratégico · Floor Share",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/dashboard.css" />
      </head>
      <body data-viewer="1">{children}</body>
    </html>
  );
}
