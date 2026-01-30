import React, { useState } from 'react';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/design-system/components/Modal';
import { Button } from '@/design-system/components/Button';
import { Trophy, Calendar, MapPin, Users, DollarSign } from 'lucide-react';
import type { Tournament } from '@/types/tournament.types';

interface TournamentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournaments: Tournament[];
  onTournamentSelect: (tournament: Tournament) => void;
}

export const TournamentSelectionModal: React.FC<TournamentSelectionModalProps> = ({
  isOpen,
  onClose,
  tournaments,
  onTournamentSelect,
}) => {
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  const handleSelect = () => {
    if (selectedTournament) {
      onTournamentSelect(selectedTournament);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>Select Tournament</ModalTitle>
        <ModalDescription>
          Choose which tournament you want to register your team for
        </ModalDescription>
      </ModalHeader>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {tournaments.map((tournament) => (
          <div
            key={tournament.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedTournament?.id === tournament.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedTournament(tournament)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-gray-900">{tournament.title}</h3>
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    {tournament.sport_type}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(tournament.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{tournament.venue}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{tournament.max_participants} participants max</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span>${tournament.entry_fee}</span>
                  </div>
                </div>

                <div className="mt-2 text-sm">
                  <span className="font-medium">Registration Deadline: </span>
                  <span className="text-gray-600">
                    {new Date(tournament.registration_deadline).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="ml-4">
                <input
                  type="radio"
                  name="tournament"
                  checked={selectedTournament?.id === tournament.id}
                  onChange={() => setSelectedTournament(tournament)}
                  className="w-4 h-4 text-blue-600"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSelect}
          disabled={!selectedTournament}
        >
          Continue
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default TournamentSelectionModal;