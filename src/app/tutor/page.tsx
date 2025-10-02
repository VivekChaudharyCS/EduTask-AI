// src/app/tutor/page.tsx
"use client";

import ChatBox from "../../components/tutor/ChatBox";
import ProtectedRoute from "../../components/auth/ProtectedRoute";

export default function TutorPage() {
  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto h-[80vh] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">AI Tutor</h1>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white border rounded-lg shadow-sm p-4">
          <ChatBox />
        </div>
      </div>
    </ProtectedRoute>
  );
}
