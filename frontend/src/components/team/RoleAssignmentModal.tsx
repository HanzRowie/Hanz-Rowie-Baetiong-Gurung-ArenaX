import React, { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/design-system/components/Modal';
import { TeamService } from '@/services';
import type { TeamMembership, TeamRole, Team } from '@/types/team.types';

interface RoleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  membership: TeamMembership | null;
  team: Team;
  onRoleUpdated?: (team: Team) => void;
}

const ROLE_OPTIONS: { value: TeamRole; label: string; description: string }[] = [
  {
    value: 'LEADER',
    label: 'Leader',
    description: 'Can register team for tournaments and manage team activities',
  },
  {
    value: 'MEMBER',
    label: 'Member',
    description: 'Regular team member with basic participation rights',
  },
];

const ROLE_LABELS: Record<TeamRole, string> = {
  OWNER: 'Owner',
  LEADER: 'Leader',
  MEMBER: 'Member',
};

export const RoleAssignmentModal: React.FC<RoleAssignmentModalProps> = ({
  isOpen,
  onClose,
  membership,
  team,
  onRoleUpdated,
}) => {
  const [selectedRole, setSelectedRole] = useState<TeamRole>('MEMBER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  // Initialize selected role when membership changes
  React.useEffect(() => {
    if (membership && membership.role !== 'OWNER') {
      setSelectedRole(membership.role);
    }
  }, [membership]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!membership || selectedRole === membership.role) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await TeamService.updateMemberRole(
        team.id,
        membership.player.id,
        { role: selectedRole }
      );

      if (response.success) {
        // Update team data with new role
        const updatedMemberships = team.memberships.map(m =>
          m.id === membership.id ? { ...m, role: selectedRole } : m
        );
        
        const updatedTeam = {
          ...team,
          memberships: updatedMemberships,
        };
        
        onRoleUpdated?.(updatedTeam);
        onClose();
      } else {
        setError(response.error || 'Failed to update role');
      }
    } catch (error: any) {
      console.error('Error updating role:', error);
      setError(error.response?.data?.error || 'Failed to update role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setError('');
    setIsSubmitting(false);
    onClose();
  };

  if (!membership) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      closeOnOverlayClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <ModalHeader>
        <ModalTitle>Change Role</ModalTitle>
        <ModalDescription>
          Update the role for {membership.player.full_name} in {team.name}
        </ModalDescription>
      </ModalHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current Role Display */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Current Role</p>
              <p className="text-sm text-gray-600">{ROLE_LABELS[membership.role]}</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {ROLE_LABELS[membership.role]}
            </span>
          </div>
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            New Role
          </label>
          <div className="space-y-3">
            {ROLE_OPTIONS.map((role) => (
              <label
                key={role.value}
                className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedRole === role.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                } ${isSubmitting ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={selectedRole === role.value}
                  onChange={(e) => setSelectedRole(e.target.value as TeamRole)}
                  className="mt-1 mr-3"
                  disabled={isSubmitting}
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{role.label}</div>
                  <div className="text-sm text-gray-500 mt-1">{role.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Role Change Warning */}
        {selectedRole !== membership.role && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">Role Change</p>
                <p className="text-sm text-yellow-700 mt-1">
                  {selectedRole === 'LEADER' 
                    ? `${membership.player.full_name} will gain tournament registration privileges.`
                    : `${membership.player.full_name} will lose tournament registration privileges.`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting || selectedRole === membership.role}
          >
            Update Role
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default RoleAssignmentModal;