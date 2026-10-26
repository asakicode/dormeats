import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "./components/Header";
import BottomTabBar from "./components/BottomTabBar";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-body",
  weight: "45 920",
  display: "swap",
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
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Header />
        <main className="flex-1 pb-20">{children}</main>
        <BottomTabBar />
      </body>
    </html>
  );
}
