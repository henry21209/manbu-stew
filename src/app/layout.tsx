import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "漫步食光 Stroll & Eat",
  description: "慢慢生活，好好吃飯。選用在地小農食材，慢燉入味。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      </head>
      <body>
        <AuthProvider>
          <CartProvider>
            <Toaster position="top-center" />
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
