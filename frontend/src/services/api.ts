import axios from "axios";

const API_ORIGIN =
  import.meta.env.VITE_API_URL || "https://insurance-app-7vkn.onrender.com";

const API_BASE_URL = `${API_ORIGIN.replace(/\/$/, "")}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("insuranceToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isAuthEndpoint = String(originalRequest.url || "").includes("/auth/refresh") || String(originalRequest.url || "").includes("/auth/login");
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        localStorage.setItem("insuranceToken", res.data.token);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${res.data.token}`;

        return api(originalRequest);
      } catch {
        localStorage.removeItem("insuranceToken");
        localStorage.removeItem("insuranceUser");
        if (window.location.pathname !== "/login") window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default api;