'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, ShieldOff, UserCheck, UserX } from 'lucide-react';
import { simpleToast as toast } from '../../../lib/client-toast';
import DashboardLayout from '../../components/DashboardLayout';
import Modal from '../../components/Modal';

const UsersDashboard = () => {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessAllowed, setAccessAllowed] = useState(null); // null = checking, true = admin, false = redirect
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    status: 'active',
    role: 'user'
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await res.json();
        if (data?.success && data?.data?.user) {
          const role = data.data.user.role || 'user';
          if (role !== 'admin') {
            setAccessAllowed(false);
            router.replace('/dashboard');
            return;
          }
          setAccessAllowed(true);
        } else {
          setAccessAllowed(false);
          router.replace('/dashboard');
        }
      } catch {
        setAccessAllowed(false);
        router.replace('/dashboard');
      }
    })();
  }, [router]);

  useEffect(() => {
    if (accessAllowed === true) fetchUsers();
  }, [accessAllowed]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?admin=true');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        toast.error(data.message || 'Failed to fetch users');
      }
    } catch (error) {
      toast.error('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      const payload = { name: formData.name, email: formData.email, status: formData.status, role: formData.role || 'user' };
      if (formData.password) payload.password = formData.password;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(editingUser ? 'User updated successfully' : 'User created successfully');
        fetchUsers();
        setShowModal(false);
        setEditingUser(null);
        resetForm();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Error saving user');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      status: user.status,
      role: user.role || 'user'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Error deleting user');
    }
  };

  const handleReset2FA = async (user) => {
    if (!confirm(`Reset 2FA for ${user.name || user.email}? They will need to set up the authenticator again on next login.`)) return;
    try {
      const response = await fetch(`/api/users/${user.id}/reset-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        fetchUsers();
      } else {
        toast.error(data.message || 'Failed to reset 2FA');
      }
    } catch (error) {
      toast.error('Error resetting 2FA');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      status: 'active',
      role: 'user'
    });
  };

  const openCreateModal = () => {
    setEditingUser(null);
    resetForm();
    setShowModal(true);
  };

  if (accessAllowed !== true || loading) {
    return (
      <DashboardLayout activeTab="users">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab="users">
      <div className="px-4 py-6 min-w-0 w-full overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between min-w-0 w-full">
          <div className="flex-auto min-w-0">
            <h1 className="text-2xl font-semibold text-gray-900">Users Management</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage user accounts
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-4 flex-none">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        2FA
                      </th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="relative px-3 sm:px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-3 sm:px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            (user.role || 'user') === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {(user.role || 'user') === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            Number(user.two_factor_enabled) === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {Number(user.two_factor_enabled) === 1 ? 'On' : 'Off'}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-1 sm:space-x-2 justify-end">
                            <button
                              onClick={() => handleReset2FA(user)}
                              className="p-2 sm:p-3 rounded-lg text-amber-600 hover:text-amber-900 hover:bg-amber-50"
                              title="Reset 2FA"
                            >
                              <ShieldOff className="h-4 w-4 sm:h-6 sm:w-6" />
                            </button>
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 sm:p-3 rounded-lg text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4 sm:h-6 sm:w-6" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="p-2 sm:p-3 rounded-lg text-red-600 hover:text-red-900 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 sm:h-6 sm:w-6" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {editingUser ? 'Edit User' : 'Create New User'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Password {editingUser && '(leave blank to keep current)'}
                      </label>
                      <input
                        type="password"
                        required={!editingUser}
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white px-3 py-2"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Min 8 characters, at least one uppercase, one lowercase, one number, one special character (!@#$%^&* etc.).
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Role</label>
                      <select
                        value={formData.role || 'user'}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white px-3 py-2"
                      >
                        <option value="user">User (full access except user management)</option>
                        <option value="admin">Admin (full access)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <div className="flex rounded-lg border border-gray-300 bg-gray-50 p-1" role="radiogroup" aria-label="User status">
                        <label
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                            formData.status === 'active'
                              ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-gray-200'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value="active"
                            checked={formData.status === 'active'}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                            className="sr-only"
                          />
                          <UserCheck className="h-4 w-4" />
                          Active
                        </label>
                        <label
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                            formData.status === 'suspended'
                              ? 'bg-white text-red-700 shadow-sm ring-1 ring-gray-200'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value="suspended"
                            checked={formData.status === 'suspended'}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                            className="sr-only"
                          />
                          <UserX className="h-4 w-4" />
                          Suspended
                        </label>
                      </div>
                      <p className="mt-1.5 text-xs text-gray-500">
                        Active users can sign in. Suspended users cannot access the dashboard.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {editingUser ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default UsersDashboard;
