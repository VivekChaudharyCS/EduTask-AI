// src/components/ui/QuizHistoryChart.tsx
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface QuizHistoryChartProps {
  results: { score: number; takenAt: string }[];
}

export default function QuizHistoryChart({ results }: QuizHistoryChartProps) {
  if (!results || results.length === 0) return null;

  const data = results.map((r, i) => ({
    attempt: i + 1,
    score: r.score,
    date: new Date(r.takenAt).toLocaleDateString(),
  }));

  return (
    <div className="mt-4">
      <h5 className="font-semibold mb-2">📊 Quiz Progress Over Time</h5>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="attempt" tickFormatter={(v) => `#${v}`} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(val: any, name: any, props: any) => `${val}%`} />
          <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
