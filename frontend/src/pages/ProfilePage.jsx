import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { User, Mail, Calendar, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { user, isAuthenticated, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#ee922c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="pb-20 md:pb-8" data-testid="profile-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#ee922c] to-[#d9811f] p-8 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10" />
            </div>
            <h1 className="font-display font-bold text-2xl">{user?.name || 'User'}</h1>
            <p className="text-white/80">{user?.email}</p>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <Mail className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Email</p>
                <p className="text-gray-900">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <Shield className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Role</p>
                <p className="text-gray-900 capitalize">{user?.role || 'User'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Member Since</p>
                <p className="text-gray-900">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-gray-100">
            <button
              onClick={logout}
              className="w-full bg-red-50 text-red-600 font-medium py-3 rounded-xl hover:bg-red-100 transition-colors"
              data-testid="logout-btn"
            >
              Sign Out
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
