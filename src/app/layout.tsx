import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "./globals.css";

// The app's UI is majority Thai text, but the previous font (Geist Sans) has
// no Thai glyphs at all — every Thai character was silently falling back to
// whatever generic system UI font the OS provides, rendering visibly
// different (different weight, different x-height) from the English/numeral
// text sitting right next to it in the same sentence. IBM Plex Sans Thai
// covers both scripts in one family (explicitly recommended for this kind of
// enterprise dashboard — see AGENTS.md § Theme — Navy Enterprise), so Thai
// and Latin text now render from the same typeface everywhere. Geist Mono
// is kept for genuinely monospace content (lot codes, IDs) — those are
// always Latin/numeric, so it never hits the Thai-glyph problem.
const plexSansThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Panel — แดชบอร์ดผู้ดูแลระบบ",
    template: "%s · Panel",
  },
  description: "เทมเพลตแดชบอร์ดผู้ดูแลระบบที่สร้างด้วย Next.js 16",
};

// Single fixed Navy Enterprise theme, no light/dark toggle (see AGENTS.md
// § Dashboard/Theme — Navy Enterprise redesign) — so no ThemeProvider/
// next-themes plumbing is needed here anymore.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${plexSansThai.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
