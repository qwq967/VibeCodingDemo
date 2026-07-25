import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "心伴 - 陪你梳理情绪，找回内心的秩序",
  description: "基于心理学六步干预法的认知疗愈对话助手",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
