import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useErrorStore } from "@/lib/stores/errorStore";
import {
  useUsageModalStore,
  type UsageLimitPayload,
} from "@/lib/stores/usageModalStore";

const isServer = typeof window === "undefined";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
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
      // 402 = USAGE_LIMIT_REACHED. Open the paywall modal instead of pushing
      // a generic error toast. Payload mirrors the UsageLimitError wire shape.
      if (errorStatus === 402) {
        const data = error?.response?.data as
          | (UsageLimitPayload & { error?: string })
          | undefined;
        if (data?.error === "USAGE_LIMIT_REACHED") {
          useUsageModalStore.getState().open({
            attemptedType: data.attemptedType,
            percentageRemaining: data.percentageRemaining,
            resetAt: data.resetAt,
            isPaid: data.isPaid,
          });
          return Promise.reject(error);
        }
      }

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

