"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface LoadingOverlayContextType {
  isLoading: boolean;
  loadingMessage: string;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

const LoadingOverlayContext = createContext<LoadingOverlayContextType | undefined>(undefined);

export const LoadingOverlayProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const showLoading = (message = "Loading…") => {
    setLoadingMessage(message);
    setIsLoading(true);
  };
  const hideLoading = () => {
    setIsLoading(false);
    setLoadingMessage("");
  };

  return (
    <LoadingOverlayContext.Provider value={{ isLoading, loadingMessage, showLoading, hideLoading }}>
      {children}
    </LoadingOverlayContext.Provider>
  );
};

export const useLoadingOverlay = () => {
  const context = useContext(LoadingOverlayContext);
  if (!context) throw new Error("useLoadingOverlay must be used within LoadingOverlayProvider");
  return context;
}; 