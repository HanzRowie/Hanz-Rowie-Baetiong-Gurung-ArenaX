import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import TeamService from '@/services/teamService';
import { toastService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { Team } from '@/types/team.types';

export const EditTeamPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    sport_types: [] as string[],
    max_size: 50,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (teamId) {
      loadTeamDetails();
    }
  }, [teamId]);

  const loadTeamDetails = async () => {
    if (!teamId) return;

    setLoading(true);
    try {
      const response = await TeamService.getTeam(teamId);
      if (response.success && response.data) {
        const teamData = response.data;
        setTeam(teamData);

        // Check if user is the owner
        if (teamData.owner.id !== user?.id) {
          toastService.error('Only the team owner can edit team details');
          navigate(`/teams/${teamId}`);
          return;
        }

        // Set form data
        setFormData({
          name: teamData.name,
          sport_types: teamData.sport_types,
          max_size: teamData.max_size,
        });
      } else {
        setError('Failed to load team details');
      }
    } catch (error: any) {
      console.error('Error loading team details:', error);
      setError('Failed to load team details');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Team name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Team name must be at least 3 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Team name must be less than 50 characters';
    }

    if (formData.sport_types.length === 0) {
      newErrors.sport_types = 'Please select at least one sport';
    }

    // Validate max_size
    if (!formData.max_size || formData.max_size < 1) {
      newErrors.max_size = 'Maximum team size must be at least 1';
    } else if (team && formData.max_size < team.member_count) {
      newErrors.max_size = `Maximum size cannot be less than current member count (${team.member_count})`;
    } else if (formData.max_size > 100) {
      newErrors.max_size = 'Maximum team size cannot exceed 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !teamId) return;

    setSubmitting(true);
    try {
      const response = await TeamService.updateTeam(teamId, {
        name: formData.name.trim(),
        sport_types: formData.sport_types,
        max_size: formData.max_size,
      });

      if (response.success) {
        toastService.success('Team updated successfully!');
        navigate(`/teams/${teamId}`);
      } else {
        toastService.error(response.error || 'Failed to update team');
      }
    } catch (error: any) {
      console.error('Error updating team:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        toastService.error(error.response?.data?.error || 'Failed to update team');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSportToggle = (sport: string) => {
    setFormData(prev => ({
      ...prev,
      sport_types: prev.sport_types.includes(sport)
        ? prev.sport_types.filter(s => s !== sport)
        : [...prev.sport_types, sport]
    }));
    if (errors.sport_types) {
      setErrors(prev => ({ ...prev, sport_types: '' }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSkeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-red-600">{error || 'Team not found'}</p>
            <button
              onClick={() => navigate('/teams')}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Back to Teams
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/teams/${teamId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Team
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Team</h1>
          <p className="text-gray-600 mt-1">Update your team's information</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Team Name */}
            <div>
              <label htmlFor="team-name" className="block text-sm font-medium text-gray-700 mb-2">
                Team Name *
              </label>
              <input
                id="team-name"
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, name: e.target.value }));
                  if (errors.name) {
                    setErrors(prev => ({ ...prev, name: '' }));
                  }
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter team name"
                disabled={submitting}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Sport Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sport Types *
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Select the sports your team will participate in
              </p>
              <div className="grid grid-cols-2 gap-4">
                {['FUTSAL', 'BADMINTON'].map((sport) => (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => handleSportToggle(sport)}
                    disabled={submitting}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      formData.sport_types.includes(sport)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    } ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="font-medium">{sport}</div>
                  </button>
                ))}
              </div>
              {errors.sport_types && (
                <p className="mt-2 text-sm text-red-600">{errors.sport_types}</p>
              )}
            </div>

            {/* Maximum Team Size */}
            <div>
              <label htmlFor="max-size" className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Team Size *
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Set the maximum number of members allowed in this team
              </p>
              <input
                id="max-size"
                type="number"
                min={team?.member_count || 1}
                max={100}
                value={formData.max_size}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setFormData(prev => ({ ...prev, max_size: value }));
                  if (errors.max_size) {
                    setErrors(prev => ({ ...prev, max_size: '' }));
                  }
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.max_size ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter maximum team size"
                disabled={submitting}
              />
              <p className="mt-1 text-sm text-gray-500">
                Current members: {team?.member_count || 0}. Maximum size must be at least {team?.member_count || 1}.
              </p>
              {errors.max_size && (
                <p className="mt-1 text-sm text-red-600">{errors.max_size}</p>
              )}
            </div>

            {/* Team Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Team Information</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Current Members:</span>
                  <span className="font-medium">{team.member_count}/{team.max_size}</span>
                </div>
                <div className="flex justify-between">
                  <span>Owner:</span>
                  <span className="font-medium">{team.owner.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="font-medium">{new Date(team.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex">
                <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">Note</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Changing the team name or sports may affect existing tournament registrations.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => navigate(`/teams/${teamId}`)}
                disabled={submitting}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditTeamPage;
