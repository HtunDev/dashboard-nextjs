'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Users, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { simpleToast } from '../../lib/client-toast';

const DashboardLayout = ({ children, activeTab }) => {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser?.id) {
          setUser(storedUser);
        }
      } catch {
        localStorage.removeItem('user');
      }

      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!res.ok) {
          router.replace('/dashboard/login');
          return;
        }

        const data = await res.json();
        if (data?.success && data?.data?.user) {
          setUser(data.data.user);
          localStorage.setItem('user', JSON.stringify(data.data.user));
          return;
        }

        router.replace('/dashboard/login');
      } catch {
        router.replace('/dashboard/login');
      }
    })();
  }, [router]);

  // Define menuItems outside of useEffect to avoid hook order issues
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'users', label: 'Users', icon: Users, href: '/dashboard/users' },
  ];

  // Admin: role from DB or fallback for default admin email (e.g. old session without role)
  const isAdmin = user?.role === 'admin' || user?.email === 'admin@example.com';
  const visibleMenuItems = menuItems.filter(
    (item) => item.id !== 'security' && (item.id !== 'users' || isAdmin)
  );

  // If not authenticated, render nothing; middleware will redirect to login
  if (!user) return null;

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    simpleToast.success('Logged out successfully');
    setLogoutLoading(false);
    router.push('/dashboard/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        {/* Desktop Sidebar */}
        <div className="w-64 flex flex-col bg-white border-r border-gray-200">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <div className="flex items-center">
                <Image
                  src="/U9-logo.svg"
                  alt="Dashboard"
                  width={32}
                  height={32}
                  className="h-8 w-8 mr-3"
                  unoptimized
                />
                <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
              </div>
            </div>
            {/* User block */}
            <div className="mt-4 px-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="h-9 w-9 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {user?.name?.charAt(0) || 'A'}
                    </span>
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800">{user?.name || 'Admin'}</p>
                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded ${isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-700'}`}>
                      {isAdmin ? 'Admin' : 'User'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{user?.email || 'admin@example.com'}</p>
                  </div>
                </div>
              </div>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {visibleMenuItems.map((item) => (
                <div key={item.id}>
                  <Link
                    href={item.href}
                    className={`${
                      activeTab === item.id
                        ? 'bg-indigo-50 text-indigo-700 font-semibold border-l-4 border-indigo-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </Link>
                </div>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              className="w-full justify-center text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 rounded-md px-3 py-2 flex items-center disabled:opacity-50"
            >
              {logoutLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </>
              )}
            </button>
          </div>
        </div>

        {/* Desktop Main Content - min-w-0 and max-w-full so action buttons stay inside after client nav */}
        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          <main className="flex-1 min-w-0 max-w-full overflow-x-hidden">
            <div className="py-6 min-w-0 max-w-full overflow-x-hidden">
              <div className="w-full max-w-7xl mx-auto px-6 min-w-0 max-w-full overflow-x-hidden">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Image
                src="/U9-logo.svg"
                alt="Dashboard"
                width={24}
                height={24}
                className="h-6 w-6 mr-2"
                unoptimized
              />
              <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-40 bg-white/60 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div className={`${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-[82vw] max-w-80 bg-white border-r border-gray-200 shadow-xl transform transition-transform duration-300 ease-in-out`}>
          <div className="flex-1 flex flex-col min-h-0">
            <div className="h-16" />
            <div className="flex-1 flex flex-col overflow-y-auto">
              {/* User block */}
              <div className="px-4 py-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <div className="h-9 w-9 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user?.name?.charAt(0) || 'A'}
                      </span>
                    </div>
                    <div className="ml-3 min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800">{user?.name || 'Admin'}</p>
                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded ${isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-700'}`}>
                        {isAdmin ? 'Admin' : 'User'}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">{user?.email || 'admin@example.com'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-2 space-y-1">
                {visibleMenuItems.map((item) => (
                  <div key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`${
                        activeTab === item.id
                          ? 'bg-indigo-50 text-indigo-700 font-semibold border-l-4 border-indigo-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.label}
                    </Link>
                  </div>
                ))}
              </nav>

              {/* Logout button */}
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                <button
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  className="w-full justify-center text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 rounded-md px-3 py-2 flex items-center disabled:opacity-50"
                >
                  {logoutLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Main Content */}
        <div className="pt-16 min-h-screen bg-gray-100">
          <main className="flex-1 min-w-0 overflow-x-hidden">
            <div className="py-6 min-w-0 overflow-x-hidden">
              <div className="max-w-7xl mx-auto px-4 min-w-0 overflow-x-hidden">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
