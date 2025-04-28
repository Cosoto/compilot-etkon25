"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const RouteChangeIndicator = () => {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  // Start loading bar on pathname change
  useEffect(() => {
    setLoading(true);
    setProgress(20);
    if (timer) clearInterval(timer);
    const interval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 10 : prev));
    }, 200);
    setTimer(interval);
    // Complete after short delay
    const completeTimeout = setTimeout(() => {
      setProgress(100);
      if (timer) clearInterval(timer);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
    }, 700);
    return () => {
      clearInterval(interval);
      clearTimeout(completeTimeout);
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line
  }, [pathname]);

  if (!loading) return null;

  return (
    <div
      className="fixed top-0 left-0 w-full z-[9999] h-1 bg-transparent"
      aria-live="polite"
      aria-label="Page loading"
      role="status"
    >
      <div
        className="h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-300 transition-all duration-200"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default RouteChangeIndicator; 