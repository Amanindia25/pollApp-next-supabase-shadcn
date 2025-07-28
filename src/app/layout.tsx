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
        {children}
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}