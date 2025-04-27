import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, UserCircle2, ChevronDown, Loader2 } from 'lucide-react';
import { useState, useRef } from 'react';
import ComPilotLogo from './ComPilotLogo';
// Heroicons imports
import {
  ChartBarSquareIcon as ChartBarSquareIconOutline,
  UserGroupIcon as UserGroupIconOutline,
  SparklesIcon as SparklesIconOutline,
  Squares2X2Icon as Squares2X2IconOutline,
  BuildingOffice2Icon as BuildingOffice2IconOutline,
} from '@heroicons/react/24/outline';
import {
  ChartBarSquareIcon as ChartBarSquareIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  SparklesIcon as SparklesIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
  BuildingOffice2Icon as BuildingOffice2IconSolid,
} from '@heroicons/react/24/solid';
import { useUser } from '@/hooks/useUser';

const navItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    outline: ChartBarSquareIconOutline,
    solid: ChartBarSquareIconSolid,
  },
  {
    name: 'Users',
    href: '/dashboard/users',
    outline: UserGroupIconOutline,
    solid: UserGroupIconSolid,
  },
  {
    name: 'Skills',
    href: '/dashboard/skills',
    outline: SparklesIconOutline,
    solid: SparklesIconSolid,
  },
  {
    name: 'Matrix',
    href: '/dashboard/matrix',
    outline: Squares2X2IconOutline,
    solid: Squares2X2IconSolid,
  },
  {
    name: 'Company',
    href: '/dashboard/company',
    outline: BuildingOffice2IconOutline,
    solid: BuildingOffice2IconSolid,
  },
];

const BottomDashboardBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isAdmin } = useUser();
  const [showLogout, setShowLogout] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
    setShowLogout(false);
    router.replace('/');
    setLoggingOut(false);
  };

  return (
    <nav
      className="fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-blue-100 via-cyan-50 to-white/80 backdrop-blur border-b border-blue-200 shadow-lg flex items-center justify-between px-2 sm:px-8 py-2"
      aria-label="Dashboard navigation bar"
    >
      {/* App Name / Logo */}
      <Link
        href="/dashboard"
        aria-label="Go to ComPilot Dashboard"
        className="mr-4"
        tabIndex={0}
      >
        <ComPilotLogo />
      </Link>
      {/* Navigation */}
      <ul className="flex flex-1 justify-evenly items-center gap-1">
        {navItems
          .filter(item => item.name !== 'Users' || isAdmin)
          .filter(Boolean)
          .map(({ name, href, outline: OutlineIcon, solid: SolidIcon }) => {
            const active = pathname === href;
            const Icon = active ? SolidIcon : OutlineIcon;
            return (
              <li key={name} className="flex-1 flex justify-center">
                <Link
                  href={href}
                  prefetch={true}
                  tabIndex={0}
                  aria-label={name}
                  className={`flex flex-col items-center px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors duration-150 group`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-full mb-0.5 transition-all duration-200
                      ${active
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg ring-2 ring-blue-300'
                        : 'bg-blue-50 text-blue-400 group-hover:bg-blue-100 group-hover:text-blue-600'}
                    `}
                  >
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </span>
                  <span className={`text-xs font-medium ${active ? 'text-blue-700' : 'text-gray-600 group-hover:text-blue-700'}`}>{name}</span>
                </Link>
              </li>
            );
          })}
      </ul>
      {/* User Info & Dropdown */}
      <div className="flex items-center gap-2 ml-2 relative" ref={dropdownRef}>
        <button
          className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="User menu"
          aria-haspopup="true"
          aria-expanded={Boolean(showLogout)}
          tabIndex={0}
          onClick={() => setShowLogout((v) => !v)}
          onBlur={() => setTimeout(() => setShowLogout(false), 150)}
        >
          {/* Avatar (initial from email) */}
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            {user?.email ? (
              <span className="text-white font-medium">{user.email.charAt(0).toUpperCase()}</span>
            ) : (
              <UserCircle2 className="w-6 h-6 text-white" aria-hidden="true" />
            )}
          </div>
          {/* Chevron */}
          <ChevronDown className="w-4 h-4 text-blue-400" aria-hidden="true" />
        </button>
        {showLogout && (
          <div
            className="absolute right-0 top-12 min-w-[180px] bg-white border border-blue-200 shadow-lg rounded-md px-4 py-3 text-blue-700 text-sm flex flex-col gap-2 focus:outline-none"
            tabIndex={-1}
          >
            {/* User email */}
            <div className="text-xs text-gray-500 truncate mb-2">{user?.email}</div>
            {isAdmin && (
              <Link
                href="/dashboard/users"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-blue-700 hover:bg-blue-50 focus:outline-none"
                aria-label="User Management"
                prefetch={true}
              >
                <UserGroupIconOutline className="w-4 h-4" /> User Management
              </Link>
            )}
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 text-white font-semibold hover:from-blue-600 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
              onClick={handleLogout}
              aria-label="Sign out"
              tabIndex={0}
              disabled={loggingOut}
            >
              {loggingOut ? <Loader2 className="inline w-4 h-4 mr-1 animate-spin" /> : <LogOut className="inline w-4 h-4 mr-1 align-text-bottom" />} Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default BottomDashboardBar; 