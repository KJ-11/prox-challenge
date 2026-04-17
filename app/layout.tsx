import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prox · Vulcan OmniPro 220 expert",
  description:
    "Multimodal reasoning agent for the Vulcan OmniPro 220 multiprocess welder. Built for the Prox founding engineer challenge.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[color:var(--color-background)] text-[color:var(--color-foreground)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
