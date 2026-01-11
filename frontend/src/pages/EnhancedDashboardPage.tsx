/**
 * Enhanced Dashboard Page
 * New customizable dashboard with drag-and-drop widgets
 */

import { useAuth } from '@/hooks/useAuth';
import { DashboardProvider, DashboardGrid, DashboardToolbar } from '@/components/dashboard';

export default function EnhancedDashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Dashboard Toolbar */}
        <DashboardToolbar />
        
        {/* Dashboard Content */}
        <div className="p-6">
          <DashboardGrid />
        </div>
      </div>
    </DashboardProvider>
  );
}