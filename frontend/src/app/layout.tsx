import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { PopupProvider } from "@/components/popup";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sellens",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sellens | Decision Support Platform",
  description: "Sellens decision support platform for product analysis and improvement workflows.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${jakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col"><PopupProvider>{children}</PopupProvider></body>
    </html>
  );
}
