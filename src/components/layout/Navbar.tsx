"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getToken, clearAuth } from "../../lib/utils/clientAuth";
import { FaUserCircle } from "react-icons/fa";

const navItems = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Tasks", href: "/tasks" },
  { name: "Journey", href: "/journey" },
  { name: "Roadmap", href: "/roadmap" },
  { name: "AI Tutor", href: "/tutor" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getToken()); // check if token exists
  }, []);

  return (
    <nav className="flex items-center justify-between px-6 py-4 shadow-sm bg-white sticky top-0 z-50">
      {/* Logo */}
      <div className="text-xl font-bold text-indigo-600">EduTask AI</div>

      {/* Nav Links */}
      {isLoggedIn && (
        <div className="hidden md:flex gap-6">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`text-sm font-medium ${
                pathname.startsWith(item.href)
                  ? "text-indigo-600 border-b-2 border-indigo-600 pb-1"
                  : "text-gray-600 hover:text-indigo-500"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}

      {/* Profile Dropdown */}
      {isLoggedIn && (
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold focus:outline-none"
          >
          <FaUserCircle />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-md py-2 text-sm">
              <Link
                href="/profile"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                onClick={() => setOpen(false)}
              >
                Profile
              </Link>
              <button
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  clearAuth();
                  window.location.href = "/login";
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
