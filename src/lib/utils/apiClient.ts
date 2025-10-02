// src/lib/utils/apiClient.ts
import axios from "axios";

const mlBase = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

export const mlClient = axios.create({
  baseURL: mlBase,
  timeout: 15000,
});

export default mlClient;
