import type { Metadata } from "next";
import "@mantine/core/styles.css";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import "./globals.css";

export const metadata: Metadata = {
  title: "iTAS BackOffice",
  description: "IT Asset & Maintenance Contract Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
      </body>
    </html>
  );
}
