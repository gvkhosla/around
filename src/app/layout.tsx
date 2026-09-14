import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Around",
  description:
    "Drop a paper link. Get the claim, the lineage, and what to read next.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-dvh isolate bg-white font-sans text-neutral-950">
        {children}
      </body>
    </html>
  );
}
