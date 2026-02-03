import React, { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/design-system/components/Modal';
import { TeamService } from '@/services';
import type { Team, Invitation } from '@/types/team.types';

interface InvitationSenderProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  onInvitationSent?: (invitation: Invitation) => void;
}

export const InvitationSender: React.FC<InvitationSenderProps> = ({
  isOpen,
  onClose,
  team,
  onInvitationSent,
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) {
      setError('Email address is required');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if user is already a team member
    const existingMember = team.memberships.find(
      m => m.player.email.toLowerCase() === trimmedEmail && m.is_active
    );
    
    if (existingMember) {
      setError('This player is already a member of the team');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await TeamService.sendInvitation(team.id, {
        player_email: trimmedEmail,
      });

      if (response.success && response.data) {
        onInvitationSent?.(response.data);
        handleClose();
      } else {
        setError(response.error || 'Failed to send invitation');
      }
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.response?.data?.errors?.player_email) {
        setError(error.response.data.errors.player_email[0]);
      } else {
        setError(error.message || 'Failed to send invitation');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setIsSubmitting(false);
    onClose();
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) {
      setError('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      closeOnOverlayClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <ModalHeader>
        <ModalTitle>Invite Player to Team</ModalTitle>
        <ModalDescription>
          Send an invitation to join {team.name}. The player will receive an email with the invitation.
        </ModalDescription>
      </ModalHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Team Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{team.name}</p>
              <p className="text-sm text-gray-600">
                {team.sport_types.join(', ')} • {team.member_count}/{team.max_size} members
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Available spots</p>
              <p className="text-sm font-medium text-gray-900">
                {team.max_size - team.member_count}
              </p>
            </div>
          </div>
        </div>

        {/* Email Input */}
        <div>
          <label htmlFor="player-email" className="block text-sm font-medium text-gray-700 mb-2">
            Player Email Address *
          </label>
          <input
            id="player-email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter player's email address"
            disabled={isSubmitting}
            autoComplete="email"
          />
          <p className="mt-1 text-sm text-gray-500">
            The player must have an ArenaX account with this email address
          </p>
          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Team Full Warning */}
        {team.is_full && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">Team at Capacity</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Your team is currently full. You'll need to remove a member or increase the team size before this invitation can be accepted.
                </p>
              </div>
            </div>
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
            disabled={isSubmitting}
          >
            Send Invitation
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default InvitationSender;