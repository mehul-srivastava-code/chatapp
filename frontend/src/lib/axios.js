import axios from "axios";

// Prefer explicit Vite env var `VITE_API_URL` when set (useful for Docker/static builds).
// Otherwise, in development use localhost:3000; in other environments default to
// the same host but port 3000 (this ensures the bundled app running on 8081
// calls the backend on port 3000 instead of the static server at 8081).
const envApi = import.meta.env.VITE_API_URL;
const baseURL = envApi
  ?? (import.meta.env.MODE === "development" ? "http://localhost:3000/api" : `${window.location.protocol}//${window.location.hostname}:3000/api`);

export const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});
