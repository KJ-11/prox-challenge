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
  openGraph: {
    title: "Prox · Vulcan OmniPro 220 expert",
    description:
      "Ask anything about Harbor Freight's 220A multiprocess welder — duty cycles, polarity, settings, weld-photo diagnosis — and get answers with diagrams, not prose.",
    images: [
      {
        url: "/product.webp",
        width: 800,
        height: 800,
        alt: "Vulcan OmniPro 220 multiprocess welder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prox · Vulcan OmniPro 220 expert",
    description:
      "Ask anything about Harbor Freight's 220A multiprocess welder — answers in diagrams, not prose.",
    images: ["/product.webp"],
  },
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23e94b22'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui,sans-serif' font-weight='800' font-size='20' fill='white'%3EP%3C/text%3E%3C/svg%3E",
        type: "image/svg+xml",
      },
    ],
  },
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
