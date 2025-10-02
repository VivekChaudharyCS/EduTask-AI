// src/lib/utils/mlClient.ts
import axios from "axios";

const mlBase = process.env.NEXT_PUBLIC_ML_SERVICE_URL || "http://127.0.0.1:8000";

export const mlClient = axios.create({
  baseURL: mlBase,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});
