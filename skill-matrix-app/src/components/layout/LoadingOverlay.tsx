"use client";

import { useLoadingOverlay } from "@/contexts/LoadingOverlayContext";

const LoadingOverlay = () => {
  const { isLoading, loadingMessage } = useLoadingOverlay();
  if (!isLoading) return null;
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all"
      aria-live="assertive"
      aria-label={loadingMessage || "Loading"}
      role="alert"
      tabIndex={0}
    >
      <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-lg shadow-xl">
        <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        <span className="text-blue-700 font-semibold text-lg">{loadingMessage || "Loading…"}</span>
      </div>
    </div>
  );
};

export default LoadingOverlay; 