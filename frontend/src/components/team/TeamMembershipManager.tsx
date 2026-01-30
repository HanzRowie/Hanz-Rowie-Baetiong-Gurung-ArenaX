import React, { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { TeamService } from '@/services';
import type { Team, TeamMembership, TeamRole } from '@/types/team.types';

interface TeamMembershipManagerProps {
  team: Team;
  currentUserId: string;
  onTeamUpdate?: (team: Team) => void;
  onOpenRoleModal?: (membership: TeamMembership) => void;
  onOpenInviteModal?: () => void;
}

const ROLE_LABELS: Record<TeamRole, string> = {
  OWNER: 'Owner',
  LEADER: 'Leader',
  MEMBER: 'Member',
};

const ROLE_COLORS: Record<TeamRole, string> = {
  OWNER: 'bg-purple-100 text-purple-800',
  LEADER: 'bg-blue-100 text-blue-800',
  MEMBER: 'bg-gray-100 text-gray-800',
};

export const TeamMembershipManager: React.FC<TeamMembershipManagerProps> = ({
  team,
  currentUserId,
  onTeamUpdate,
  onOpenRoleModal,
  onOpenInviteModal,
}) => {
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const currentUserMembership = team.memberships.find(
    m => m.player.id === currentUserId && m.is_active
  );
  const isOwner = currentUserMembership?.role === 'OWNER';
  const isLeaderOrOwner = currentUserMembership?.role === 'OWNER' || currentUserMembership?.role === 'LEADER';

  const handleRemoveMember = async (membership: TeamMembership) => {
    if (!isOwner || membership.player.id === currentUserId) {
      return;
    }

    const confirmMessage = `Are you sure you want to remove ${membership.player.full_name} from the team?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setRemovingMemberId(membership.id);

    try {
      const response = await TeamService.removeMember(team.id, membership.player.id);
      
      if (response.success) {
        // Update team data by removing the member
        const updatedTeam = {
          ...team,
          memberships: team.memberships.filter(m => m.id !== membership.id),
          member_count: team.member_count - 1,
          is_full: false,
        };
        onTeamUpdate?.(updatedTeam);
      } else {
        alert(response.error || 'Failed to remove member');
      }
    } catch (error: any) {
      console.error('Error removing member:', error);
      alert(error.response?.data?.error || 'Failed to remove member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const activeMemberships = team.memberships.filter(m => m.is_active);
  const sortedMemberships = activeMemberships.sort((a, b) => {
    // Sort by role priority: OWNER > LEADER > MEMBER
    const roleOrder = { OWNER: 0, LEADER: 1, MEMBER: 2 };
    const roleComparison = roleOrder[a.role] - roleOrder[b.role];
    if (roleComparison !== 0) return roleComparison;
    
    // Then by join date (earliest first)
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
            <p className="text-sm text-gray-500">
              {team.member_count} of {team.max_size} members
            </p>
          </div>
          {isLeaderOrOwner && !team.is_full && (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenInviteModal}
            >
              Invite Player
            </Button>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {sortedMemberships.map((membership) => (
          <div key={membership.id} className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {membership.player.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900">
                    {membership.player.full_name}
                  </p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    ROLE_COLORS[membership.role]
                  }`}>
                    {ROLE_LABELS[membership.role]}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{membership.player.email}</p>
                <p className="text-xs text-gray-400">
                  Joined {new Date(membership.joined_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Role Management Button */}
              {isOwner && membership.role !== 'OWNER' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenRoleModal?.(membership)}
                >
                  Change Role
                </Button>
              )}

              {/* Remove Member Button */}
              {isOwner && membership.player.id !== currentUserId && (
                <Button
                  variant="danger"
                  size="sm"
                  loading={removingMemberId === membership.id}
                  disabled={removingMemberId === membership.id}
                  onClick={() => handleRemoveMember(membership)}
                >
                  Remove
                </Button>
              )}

              {/* Current User Indicator */}
              {membership.player.id === currentUserId && (
                <span className="text-xs text-gray-500 font-medium">You</span>
              )}
            </div>
          </div>
        ))}

        {sortedMemberships.length === 0 && (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500">No active members found</p>
          </div>
        )}
      </div>

      {/* Team Capacity Indicator */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Team Capacity</span>
          <div className="flex items-center space-x-2">
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  team.is_full ? 'bg-red-500' : 'bg-primary-500'
                }`}
                style={{ width: `${(team.member_count / team.max_size) * 100}%` }}
              />
            </div>
            <span className={`font-medium ${team.is_full ? 'text-red-600' : 'text-gray-900'}`}>
              {team.member_count}/{team.max_size}
            </span>
          </div>
        </div>
        {team.is_full && (
          <p className="text-xs text-red-600 mt-1">
            Team is at maximum capacity. Remove members or increase team size to add more players.
          </p>
        )}
      </div>
    </div>
  );
};

export default TeamMembershipManager;