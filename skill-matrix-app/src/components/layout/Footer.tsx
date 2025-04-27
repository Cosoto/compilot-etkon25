'use client';

import Link from 'next/link';
import pkg from '../../../package.json';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const appVersion = pkg.version;

  return (
    <footer className="bg-gradient-to-r from-blue-100 via-cyan-50 to-white/80 backdrop-blur border-t border-blue-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">ComPilot</h3>
            <p className="text-sm text-gray-600">
              A comprehensive skill management system for manufacturing teams.
            </p>
            <p className="text-sm text-gray-500">
              Version {appVersion}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/matrix" className="text-sm text-gray-600 hover:text-gray-900">
                  Skill Matrix
                </Link>
              </li>
              <li>
                <Link href="/dashboard/company" className="text-sm text-gray-600 hover:text-gray-900">
                  Company Structure
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Legal & Contact</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-900">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-gray-600 hover:text-gray-900">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/dashboard/support" className="text-sm text-gray-600 hover:text-gray-900">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex justify-center">
            <p className="text-sm text-gray-500">
              © {currentYear} ComPilot. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 