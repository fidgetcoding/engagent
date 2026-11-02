import type { Metadata } from "next";
import config from "@/engagent.config";
import "./globals.css";

export const metadata: Metadata = { title: `${config.brand.name} · Engagent`, description: config.brand.tagline };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const vars = { "--accent": config.brand.accent, "--accent-soft": config.brand.accentSoft, "--brand-font": config.brand.font } as React.CSSProperties;
  return <html lang="en" style={vars}><body>{children}</body></html>;
}
