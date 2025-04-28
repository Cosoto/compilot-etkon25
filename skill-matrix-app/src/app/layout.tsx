import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";
import Navigation from "@/components/layout/Navigation";
import { SpeedInsights } from "@vercel/speed-insights/next"
import RouteChangeIndicator from "@/components/layout/RouteChangeIndicator";
import { LoadingOverlayProvider } from "@/contexts/LoadingOverlayContext";
import LoadingOverlay from "@/components/layout/LoadingOverlay";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ComPilot",
  description: "A comprehensive skill management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <LoadingOverlayProvider>
          <LoadingOverlay />
          <RouteChangeIndicator />
          <AuthProvider>
            <UserProvider>
              <Navigation />
              <main>{children}</main>
            </UserProvider>
          </AuthProvider>
        </LoadingOverlayProvider>
      </body>
    </html>
  );
}
