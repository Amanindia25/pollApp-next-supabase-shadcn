import "./globals.css";
import { Toaster } from "sonner";
import Navbar from "@/components/navbar-footer/Navbar";
import Footer from "@/components/navbar-footer/Footer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="pt-16 pb-8 px-4 min-h-screen">
          {children}
        </main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}