// src/components/ui/ProgressBar.tsx
"use client";

export default function ProgressBar({ value }: { value: number }) {
  const percentage = Math.min(100, Math.max(0, value || 0));

  return (
    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
      <div
        className="bg-green-500 h-4 transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
