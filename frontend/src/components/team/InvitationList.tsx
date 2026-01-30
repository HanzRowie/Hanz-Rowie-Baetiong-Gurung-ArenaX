import React, { useState, useEffect } from 'react';
import { Button } from '@/design-system/components/Button';
import { TeamService } from '@/services';
import type { Invitation, InvitationStatus } from '@/types/team.types';

interface InvitationListProps {
  teamId?: string; // If provided, shows invitations for this team
  showPending?: boolean; // If true, shows pending invitations for current user
  onInvitationUpdate?: () => void;
}

const STATUS_COLORS: Record<InvitationStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  DECLINED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
};

const STATUS_LABELS: Record<InvitationStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  EXPIRED: 'Expired',
};

export const InvitationList: React.FC<InvitationListProps> = ({
  teamId,
  showPending = false,
  onInvitationUpdate,
}) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [respondingToId, setRespondingToId] = useState<string | null>(null);

  const loadInvitations = async () => {
    setLoading(true);
    setError('');

    try {
      let response;
      
      if (showPending) {
        response = await TeamService.getPendingInvitations();
      } else if (teamId) {
        response = await TeamService.getInvitations(teamId);
      } else {
        setError('Either teamId or showPending must be provided');
        return;
      }

      if (response.success && response.data) {
        setInvitations(response.data);
      } else {
        setError(response.error || 'Failed to load invitations');
      }
    } catch (error: any) {
      console.error('Error loading invitations:', error);
      setError(error.response?.data?.error || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, [teamId, showPending]);

  const handleInvitationResponse = async (invitationId: string, response: 'ACCEPT' | 'DECLINE') => {
    setRespondingToId(invitationId);

    try {
      const result = await TeamService.respondToInvitation(invitationId, { response });

      if (result.success) {
        // Update the invitation status locally
        setInvitations(prev =>
          prev.map(inv =>
            inv.id === invitationId
              ? { ...inv, status: response === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED', responded_at: new Date().toISOString() }
              : inv
          )
        );
        onInvitationUpdate?.();
      } else {
        alert(result.error || 'Failed to respond to invitation');
      }
    } catch (error: any) {
      console.error('Error responding to invitation:', error);
      alert(error.response?.data?.error || 'Failed to respond to invitation');
    } finally {
      setRespondingToId(null);
    }
  };

  const formatTimeRemaining = (expiresAt: string): string => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return 'Expired';
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
    } else {
      return 'Expires soon';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="secondary" onClick={loadInvitations}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {showPending ? 'Pending Invitations' : 'Team Invitations'}
        </h3>
        <p className="text-sm text-gray-500">
          {invitations.length} invitation{invitations.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {invitations.map((invitation) => (
          <div key={invitation.id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {showPending 
                          ? invitation.team.name.charAt(0).toUpperCase()
                          : invitation.player.full_name.charAt(0).toUpperCase()
                        }
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900">
                        {showPending ? invitation.team.name : invitation.player.full_name}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_COLORS[invitation.status]
                      }`}>
                        {STATUS_LABELS[invitation.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {showPending 
                        ? `Sports: ${invitation.team.sport_types.join(', ')}`
                        : invitation.player.email
                      }
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                      <span>Sent {new Date(invitation.sent_at).toLocaleDateString()}</span>
                      {invitation.status === 'PENDING' && (
                        <span className="text-yellow-600 font-medium">
                          {formatTimeRemaining(invitation.expires_at)}
                        </span>
                      )}
                      {invitation.responded_at && (
                        <span>Responded {new Date(invitation.responded_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Pending Invitations */}
              {showPending && invitation.status === 'PENDING' && (
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={respondingToId === invitation.id}
                    disabled={respondingToId === invitation.id}
                    onClick={() => handleInvitationResponse(invitation.id, 'DECLINE')}
                  >
                    Decline
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={respondingToId === invitation.id}
                    disabled={respondingToId === invitation.id}
                    onClick={() => handleInvitationResponse(invitation.id, 'ACCEPT')}
                  >
                    Accept
                  </Button>
                </div>
              )}

              {/* Status indicator for team invitations */}
              {!showPending && invitation.status !== 'PENDING' && (
                <div className="text-right ml-4">
                  <p className="text-xs text-gray-500">
                    {invitation.status === 'ACCEPTED' && 'Joined team'}
                    {invitation.status === 'DECLINED' && 'Declined invitation'}
                    {invitation.status === 'EXPIRED' && 'Invitation expired'}
                  </p>
                </div>
              )}
            </div>

            {/* Additional team info for pending invitations */}
            {showPending && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">From:</span> {invitation.sender.full_name}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Team Size:</span> {invitation.team.member_count}/{invitation.team.max_size} members
                </p>
              </div>
            )}
          </div>
        ))}

        {invitations.length === 0 && (
          <div className="px-6 py-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-500">
              {showPending ? 'No pending invitations' : 'No invitations sent'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitationList;