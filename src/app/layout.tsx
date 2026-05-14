import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import PWARegister from "./components/PWARegister";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NoodleNook",
  description: "Manage your world",
  applicationName: "NoodleNook",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "NoodleNook",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/NoodleNook-20x20.png",
    apple: "icons/NoodleNook-180x180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${quicksand.variable} appBody`}>
      <PWARegister />
      {children}
    </html>
  );
}
