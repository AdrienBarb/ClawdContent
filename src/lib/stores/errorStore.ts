import { create } from "zustand";

interface ErrorState {
  isError: boolean;
  statusCode: number | null;
  errorMessage: string | null;
  setError: (statusCode: number, errorMessage: string) => void;
  clearError: () => void;
}

export const useErrorStore = create<ErrorState>((set) => ({
  isError: false,
  statusCode: null,
  errorMessage: null,
  setError: (statusCode, errorMessage) =>
    set({ isError: true, statusCode, errorMessage }),
  clearError: () =>
    set({ isError: false, statusCode: null, errorMessage: null }),
}));

