'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import Balancer from 'react-wrap-balancer';
import { Fade } from 'react-awesome-reveal';

const APP_NAME = "ComPilot";
const APP_VERSION = ".1.0";
const DESCRIPTION =
  "ComPilot gives you the clarity and control to build high performing teams faster smarter and with confidence";
const FEATURES = [
  {
    icon: (
      <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0V4m0 16v-4m8-4h-4m-8 0H4" /></svg>
    ),
    title: "Skill Tracking",
    desc: "Easily track and update skills for every team member."
  },
  {
    icon: (
      <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5" /></svg>
    ),
    title: "Team Matrix",
    desc: "Visualize your team's strengths and skill gaps instantly."
  },
  {
    icon: (
      <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h4a4 4 0 014 4v2" /></svg>
    ),
    title: "Easy Management",
    desc: "Assign roles, manage users, and keep your data secure."
  }
];

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const { signIn } = useAuth();
  const router = useRouter();
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const quoteFormRef = useRef<HTMLFormElement>(null);
  const [quoteData, setQuoteData] = useState({
    company: '',
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  useEffect(() => {
    async function checkAdmin() {
      try {
        // First check if user is already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push('/dashboard');
          return;
        }

        // Then check for admin users
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .limit(1);

        if (error) {
          setCheckingAdmin(false);
          return;
        }

        if (!data || data.length === 0) {
          router.push('/setup');
        } else {
          setCheckingAdmin(false);
        }
      } catch {
        setCheckingAdmin(false);
      }
    }

    checkAdmin();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch {
      setError('Invalid email or password');
    }
  };

  const handleQuoteChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setQuoteData({ ...quoteData, [e.target.name]: e.target.value });
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteLoading(true);
    setQuoteSuccess(false);
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData),
      });
      if (res.ok) {
        setQuoteSuccess(true);
        setQuoteData({ company: '', name: '', email: '', phone: '', message: '' });
        if (quoteFormRef.current) quoteFormRef.current.reset();
      } else {
        const data = await res.json();
        setQuoteSuccess(false);
        alert(data.error || 'Failed to send quote request.');
      }
    } catch {
      setQuoteSuccess(false);
      alert('Failed to send quote request.');
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleCloseQuote = () => {
    setShowQuoteForm(false);
    setQuoteSuccess(false);
  };

  // Add Escape key support for modal
  useEffect(() => {
    if (!showQuoteForm) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseQuote();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showQuoteForm]);

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" aria-label="Loading" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-indigo-100">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center py-20 px-4 text-center bg-gradient-to-r from-indigo-600 to-indigo-400 text-white shadow-lg overflow-hidden">
        {/* Blurred glowing background accent */}
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
          <div className="w-96 h-96 bg-indigo-300 opacity-30 blur-3xl rounded-full"></div>
        </div>
        <Fade cascade damping={0.15} triggerOnce>
          <h1 className="relative z-10 text-6xl font-extrabold mb-4 bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent drop-shadow-lg tracking-tight">
            {APP_NAME}
          </h1>
          <span className="relative z-10 text-xs text-indigo-200 font-normal lowercase mt-1">v{APP_VERSION}</span>
          <p className="relative z-10 text-2xl font-semibold mb-4 mt-6 text-indigo-100 tracking-wide">
            <Balancer>
              Unlock Team Potential
            </Balancer>
          </p>
          <p className="relative z-10 max-w-2xl mx-auto text-lg mb-8 text-indigo-50 font-medium">
            <Balancer>{DESCRIPTION}</Balancer>
          </p>
          <div className="relative z-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="#features"
              className="inline-block px-8 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-semibold shadow-lg hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
              tabIndex={0}
              aria-label="See Features"
            >
              See Features
            </a>
            <button
              type="button"
              onClick={() => setShowQuoteForm(true)}
              className="inline-block px-8 py-3 rounded-full bg-white text-indigo-700 font-semibold shadow-lg hover:bg-indigo-50 hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
              aria-label="Request a Quote for Your Company"
            >
              Request a Quote
            </button>
          </div>
        </Fade>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 px-4 max-w-5xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-center text-indigo-700 mb-8">Why Choose {APP_NAME}?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map((feature, idx) => (
            <div key={idx} className="flex flex-col items-center bg-white rounded-lg shadow p-6 h-full">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2 text-indigo-800">{feature.title}</h3>
              <p className="text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Login Section Centered with Request a Quote Button */}
      <section className="flex flex-col items-center justify-center py-12 px-4 min-h-[400px]">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
          <div>
            <h2 className="mt-2 text-center text-2xl font-extrabold text-indigo-900">Sign in to your account</h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit} aria-label="Login form">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  autoFocus
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Email address"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-label="Password"
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                aria-label="Sign in"
              >
                Sign in
              </button>
            </div>
          </form>
          <div className="mt-8 flex flex-col items-center">
            <button
              type="button"
              className="text-indigo-700 font-semibold underline hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
              onClick={() => setShowQuoteForm(true)}
              aria-label="Request a quote for your company"
            >
              Request a Quote for Your Company
            </button>
          </div>
        </div>
        {/* Quote Request Modal */}
        {showQuoteForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-opacity duration-200" role="dialog" aria-modal="true" tabIndex={-1}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative z-50">
              <button
                onClick={handleCloseQuote}
                className="absolute top-2 right-2 text-gray-400 hover:text-indigo-600 focus:outline-none"
                aria-label="Close quote request form"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              {!quoteSuccess ? (
                <form ref={quoteFormRef} onSubmit={handleQuoteSubmit} className="space-y-4" aria-label="Quote request form">
                  <h3 className="text-xl font-bold text-indigo-700 mb-2">Request a Quote</h3>
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700">Company Name</label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      required
                      autoFocus
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      onChange={handleQuoteChange}
                      aria-label="Company Name"
                    />
                  </div>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Contact Name</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      onChange={handleQuoteChange}
                      aria-label="Contact Name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      onChange={handleQuoteChange}
                      aria-label="Email"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone (optional)</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      onChange={handleQuoteChange}
                      aria-label="Phone"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message / Requirements</label>
                    <textarea
                      id="message"
                      name="message"
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      onChange={handleQuoteChange}
                      aria-label="Message or Requirements"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      disabled={quoteLoading}
                      aria-label="Send quote request"
                    >
                      {quoteLoading ? 'Sending...' : 'Send Request'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <svg className="w-16 h-16 text-green-500 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <p className="text-lg font-semibold text-green-700 mb-2">Request Sent!</p>
                  <p className="text-gray-600 text-center">Thank you for your interest. We will contact you soon.</p>
                  <button
                    onClick={handleCloseQuote}
                    className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Close success message"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-gray-500 text-sm bg-transparent">
        &copy; {new Date().getFullYear()} {APP_NAME} v{APP_VERSION}. All rights reserved.
      </footer>
    </main>
  );
}
