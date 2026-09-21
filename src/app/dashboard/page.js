'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Eye,
  UserPlus
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import ErrorBoundary from '../components/ErrorBoundary';

const DashboardHome = () => {
  const router = useRouter();
  const [stats, setStats] = useState({
    users: 0
  });

  const fetchStats = useCallback(async () => {
    try {
      const usersRes = await fetch('/api/users?admin=true')
        .then(r => r.json())
        .catch(() => null);
      const usersCount = usersRes?.pagination?.total ?? usersRes?.data?.length ?? 0;

      setStats({
        users: usersCount
      });
    } catch (err) {
      // Keep previous state on error
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const statCards = [
    {
      name: 'Users',
      value: stats.users,
      icon: Eye,
      color: 'bg-red-500',
      href: '/dashboard/users'
    }
  ];

  return (
    <ErrorBoundary>
      <DashboardLayout activeTab="dashboard">
        <div className="px-4 py-6">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-sm text-gray-700">
              Welcome to Blank Dashboard
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {statCards.map((stat) => (
              <div
                key={stat.name}
                className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  router.push(stat.href);
                }}
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`${stat.color} p-3 rounded-md`}>
                        <stat.icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {stat.name}
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stat.value}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  router.push('/dashboard/users');
                }}
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center">
                  <div className="bg-red-100 p-3 rounded-md">
                    <UserPlus className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">Manage Users</h3>
                    <p className="text-sm text-gray-500">Create, edit, or suspend users</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ErrorBoundary>
  );
};

export default DashboardHome;
