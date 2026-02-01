import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marho",
  description: "A Fun Quiz Game",
  manifest: "/manifest.json",
  themeColor: "#FFD700",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Marho",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
