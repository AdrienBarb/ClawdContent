import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useErrorStore } from "@/lib/stores/errorStore";

const isServer = typeof window === "undefined";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    const errorStatus = error?.response?.status;
    const errorMessage =
      (error?.response?.data as { error?: string })?.error ||
      error?.message ||
      "Something went wrong";

    if (!isServer && errorStatus) {
      const { setError } = useErrorStore.getState();

      switch (errorStatus) {
        case 401:
          setError(401, errorMessage);
          break;
        case 404:
          setError(404, errorMessage);
          break;
        case 400:
          setError(400, errorMessage);
          break;
        case 403:
          setError(403, errorMessage);
          break;
        case 500:
        case 502:
        case 503:
          setError(errorStatus, errorMessage);
          break;
        default:
          setError(errorStatus, errorMessage);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

