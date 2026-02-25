/**
 * RoleTabFilter Component
 * 
 * Displays role-based tabs for filtering conversations by recipient role.
 * Shows conversation count per tab and handles tab selection.
 * 
 * Requirements: 3.1-3.6 (Role-Based Chat Interface)
 */

import React, { useMemo, useState } from 'react';
import { UserRole } from '@/types/auth.types';
import type { Conversation } from '@/types/chat.types';
import { getRoleTabsForUser, getRoleLabel } from '@/utils/chatUtils';
import { useAuth } from '@/hooks/useAuth';

interface RoleTabFilterProps {
  conversations: Conversation[];
  onRoleSelect: (role: UserRole | null) => void;
}

interface RoleTab {
  role: UserRole;
  label: string;
  count: number;
}

const RoleTabFilter: React.FC<RoleTabFilterProps> = ({ conversations, onRoleSelect }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<UserRole | null>(null);

  // Get available tabs based on user role
  const tabs: RoleTab[] = useMemo(() => {
    if (!user) return [];

    const roleTabs = getRoleTabsForUser(user.role);

    return roleTabs.map(role => ({
      role,
      label: getRoleLabel(role),
      count: conversations.filter(c => c.user.role === role).length
    }));
  }, [user, conversations]);

  // Don't render tabs if user is a referee (single unfiltered list)
  if (!user || user.role === UserRole.REFEREE || tabs.length === 0) {
    return null;
  }

  const handleTabClick = (role: UserRole) => {
    const newActiveTab = activeTab === role ? null : role;
    setActiveTab(newActiveTab);
    onRoleSelect(newActiveTab);
  };

  return (
    <div className="role-tabs-container mb-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.role}
            onClick={() => handleTabClick(tab.role)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium
              transition-all duration-200 whitespace-nowrap
              ${activeTab === tab.role
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
              }
            `}
            aria-label={`Filter by ${tab.label}`}
            aria-pressed={activeTab === tab.role}
          >
            <span>{tab.label}</span>
            <span
              className={`
                px-2 py-0.5 rounded-full text-xs font-semibold
                ${activeTab === tab.role
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 text-gray-600'
                }
              `}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RoleTabFilter;
