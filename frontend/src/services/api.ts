import axios from "axios";

const API_BASE_URL = "https://insurance-app-7vkn.onrender.com/api";

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

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        localStorage.setItem("insuranceToken", res.data.token);
        originalRequest.headers.Authorization = `Bearer ${res.data.token}`;

        return api(originalRequest);
      } catch {
        localStorage.removeItem("insuranceToken");
        localStorage.removeItem("insuranceUser");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;