import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "J4F Commerce Intelligence API",
  description: "Sellens REST API endpoints",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, padding: 0, backgroundColor: "#0d1117" }}>
        {children}
      </body>
    </html>
  );
}
