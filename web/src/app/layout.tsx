import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { THEME_SCRIPT } from "@/lib/theme-script";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Manta · Every Dota 2 account you own, in one view",
  description: "Combined match statistics across all of your Dota 2 accounts, powered by OpenDota.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Reading the request headers opts every route into dynamic rendering, which
  // the per-request CSP nonce requires. Next.js applies the nonce to its own
  // scripts automatically; pass this value as the `nonce` prop to any future
  // <Script> component.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      // The theme script sets class/style on <html> before React hydrates.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
