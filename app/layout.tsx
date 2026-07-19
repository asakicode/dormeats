import type { Metadata } from "next";
import { Gothic_A1, Gowun_Batang } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";

const gothicA1 = Gothic_A1({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});
const gowunBatang = Gowun_Batang({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "DormEats",
  description: "우리 기숙사만을 위한 식단 & 커뮤니티 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${gothicA1.variable} ${gowunBatang.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Header />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}