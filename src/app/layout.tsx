// src/app/layout.tsx
import "./globals.css";
import Navbar from "../components/layout/Navbar";
import ClientFloatingTutor from "../components/ui/ClientFloatingTutor";

export const metadata = {
  title: "EduTask AI",
  description: "Your personal AI-powered study companion.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* 👇 Added suppressHydrationWarning here */}
      <body className="bg-gray-50" suppressHydrationWarning>
        <Navbar />
        <main className="p-6">{children}</main>
        <ClientFloatingTutor />
      </body>
    </html>
  );
}
