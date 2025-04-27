'use client';

import { useState, useEffect } from 'react';
import BackToTop from '@/components/ui/BackToTop';
import Footer from '@/components/layout/Footer';
import BottomDashboardBar from '@/components/layout/BottomDashboardBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <BottomDashboardBar />
      <main className="flex-grow py-6">
        <div className="mx-auto px-2 sm:px-4 lg:px-6 mt-16">
          {children}
        </div>
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
} 