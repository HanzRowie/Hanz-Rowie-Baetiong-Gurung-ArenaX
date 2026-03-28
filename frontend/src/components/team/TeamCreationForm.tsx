import React, { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/design-system/components/Modal';
import { TeamService } from '@/services';
import type { TeamCreateRequest, SportType } from '@/types/team.types';

interface TeamCreationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onTeamCreated?: (team: any) => void;
}

const SPORT_OPTIONS: { value: SportType; label: string; description: string }[] = [
  { value: 'FUTSAL', label: 'Futsal', description: '5v5 indoor football' },
  { value: 'BADMINTON', label: 'Badminton', description: 'Singles and doubles play' },
];

export const TeamCreationForm: React.FC<TeamCreationFormProps> = ({
  isOpen,
  onClose,
  onTeamCreated,
}) => {
  const [formData, setFormData] = useState<TeamCreateRequest>({
    name: '',
    sport_types: [],
    max_size: 15,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof TeamCreateRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSportToggle = (sport: SportType) => {
    const currentSports = formData.sport_types;
    const newSports = currentSports.includes(sport)
      ? currentSports.filter(s => s !== sport)
      : [...currentSports, sport];
    
    handleInputChange('sport_types', newSports);
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
      newErrors.sport_types = 'At least one sport must be selected';
    }

    if ((formData.max_size || 15) < 5) {
      newErrors.max_size = 'Team size must be at least 5 players';
    } else if ((formData.max_size || 15) > 50) {
      newErrors.max_size = 'Team size cannot exceed 50 players';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await TeamService.createTeam({
        ...formData,
        name: formData.name.trim(),
      });

      if (response.success && response.data) {
        onTeamCreated?.(response.data);
        handleClose();
      } else {
        setErrors({ general: response.error || 'Failed to create team' });
      }
    } catch (error: any) {
      console.error('Error creating team:', error);
      console.error('Error response data:', error.response?.data);
      
      if (error.response?.data?.errors) {
        console.error('Validation errors:', error.response.data.errors);
        setErrors(error.response.data.errors);
      } else {
        const errorMessage = error.response?.data?.error || error.message || 'Failed to create team';
        console.error('Error message:', errorMessage);
        setErrors({ 
          general: errorMessage
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', sport_types: [], max_size: 15 });
    setErrors({});
    setIsSubmitting(false);
    onClose();
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
        <ModalTitle>Create New Team</ModalTitle>
        <ModalDescription>
          Create a team to participate in tournaments and manage players together.
        </ModalDescription>
      </ModalHeader>

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
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter team name"
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Sport Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sports *
          </label>
          <div className="space-y-2">
            {SPORT_OPTIONS.map((sport) => (
              <label
                key={sport.value}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  formData.sport_types.includes(sport.value)
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                } ${isSubmitting ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={formData.sport_types.includes(sport.value)}
                  onChange={() => handleSportToggle(sport.value)}
                  className="sr-only"
                  disabled={isSubmitting}
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{sport.label}</div>
                  <div className="text-sm text-gray-500">{sport.description}</div>
                </div>
                {formData.sport_types.includes(sport.value) && (
                  <svg className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </label>
            ))}
          </div>
          {errors.sport_types && (
            <p className="mt-1 text-sm text-red-600">{errors.sport_types}</p>
          )}
        </div>

        {/* Max Size */}
        <div>
          <label htmlFor="max-size" className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Team Size
          </label>
          <input
            id="max-size"
            type="number"
            min="5"
            max="50"
            value={formData.max_size}
            onChange={(e) => handleInputChange('max_size', parseInt(e.target.value) || 15)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.max_size ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isSubmitting}
          />
          <p className="mt-1 text-sm text-gray-500">
            Recommended: 15 players (allows for substitutes and flexibility)
          </p>
          {errors.max_size && (
            <p className="mt-1 text-sm text-red-600">{errors.max_size}</p>
          )}
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}

        {/* Footer with buttons */}
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
            Create Team
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default TeamCreationForm;