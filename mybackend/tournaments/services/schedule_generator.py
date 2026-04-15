"""
RoundRobinScheduleGenerator Service

Generates round-robin tournament schedules using the circle method algorithm.
Supports both single and double round-robin formats with proper home/away designation.
"""

from typing import List, Tuple, Optional
from dataclasses import dataclass
from tournaments.models import Match, Tournament
from teams.models import Team


@dataclass
class MatchPairing:
    """Represents a match pairing between two teams"""
    home_team: Team
    away_team: Team
    round_number: int


class ScheduleGenerationError(Exception):
    """Raised when schedule generation fails"""
    pass


class RoundRobinScheduleGenerator:
    """
    Service for generating round-robin tournament schedules.
    
    Uses the circle method algorithm:
    - For even number of teams: Fix one team, rotate others clockwise
    - For odd number of teams: Add a "bye" placeholder, rotate all teams
    
    Supports:
    - Single round-robin: Each team plays every other team once
    - Double round-robin: Each team plays every other team twice (home and away)
    """

    def generate_schedule(
        self,
        teams: List[Team],
        double_round_robin: bool = False
    ) -> List[MatchPairing]:
        """
        Generate round-robin schedule for given teams.
        
        Args:
            teams: List of Team objects to schedule
            double_round_robin: If True, generate double round-robin (home and away)
            
        Returns:
            List of MatchPairing objects with round numbers assigned
            
        Raises:
            ScheduleGenerationError: If teams list is invalid
        """
        if not teams or len(teams) < 2:
            raise ScheduleGenerationError("At least 2 teams are required for round-robin schedule")
        
        # Generate single round-robin pairings
        pairings = self._circle_method(teams)
        
        # If double round-robin, add reverse fixtures
        if double_round_robin:
            pairings = self._create_double_round_robin(pairings)
        
        return pairings

    def _circle_method(self, teams: List[Team]) -> List[MatchPairing]:
        """
        Core circle method algorithm for generating round-robin schedule.
        
        Algorithm:
        1. If odd number of teams, add a "bye" placeholder
        2. Fix first team in position
        3. Rotate remaining teams clockwise each round
        4. Pair teams across the circle
        
        Args:
            teams: List of Team objects
            
        Returns:
            List of MatchPairing objects for single round-robin
        """
        teams_copy = list(teams)
        n = len(teams_copy)
        
        # Add bye for odd number of teams
        has_bye = n % 2 == 1
        if has_bye:
            teams_copy.append(None)  # None represents bye
            n += 1
        
        pairings = []
        num_rounds = n - 1
        matches_per_round = n // 2
        
        for round_num in range(1, num_rounds + 1):
            # Generate pairings for this round
            for match_idx in range(matches_per_round):
                home_idx = match_idx
                away_idx = n - 1 - match_idx
                
                home_team = teams_copy[home_idx]
                away_team = teams_copy[away_idx]
                
                # Skip matches involving bye
                if home_team is None or away_team is None:
                    continue
                
                pairings.append(MatchPairing(
                    home_team=home_team,
                    away_team=away_team,
                    round_number=round_num
                ))
            
            # Rotate teams (keep first team fixed)
            # Move last team to position 1, shift others right
            teams_copy = [teams_copy[0]] + [teams_copy[-1]] + teams_copy[1:-1]
        
        return pairings

    def _create_double_round_robin(
        self,
        single_round_pairings: List[MatchPairing]
    ) -> List[MatchPairing]:
        """
        Create double round-robin by adding reverse fixtures.
        
        In double round-robin:
        - First half: Original pairings (Team A home vs Team B away)
        - Second half: Reverse pairings (Team B home vs Team A away)
        
        Args:
            single_round_pairings: Pairings from single round-robin
            
        Returns:
            List of MatchPairing objects for double round-robin
        """
        # Calculate number of rounds in single round-robin
        max_round = max(p.round_number for p in single_round_pairings)
        
        # First half: Original pairings
        all_pairings = list(single_round_pairings)
        
        # Second half: Reverse pairings with adjusted round numbers
        for pairing in single_round_pairings:
            reverse_pairing = MatchPairing(
                home_team=pairing.away_team,  # Swap home and away
                away_team=pairing.home_team,
                round_number=pairing.round_number + max_round
            )
            all_pairings.append(reverse_pairing)
        
        return all_pairings

    def create_matches_from_pairings(
        self,
        tournament: Tournament,
        pairings: List[MatchPairing]
    ) -> List[Match]:
        """
        Create Match objects from MatchPairing objects.
        
        Args:
            tournament: Tournament to create matches for
            pairings: List of MatchPairing objects
            
        Returns:
            List of created Match objects
        """
        matches = []
        
        # Group pairings by round to assign match numbers
        rounds = {}
        for pairing in pairings:
            if pairing.round_number not in rounds:
                rounds[pairing.round_number] = []
            rounds[pairing.round_number].append(pairing)
        
        # Create matches
        for round_num in sorted(rounds.keys()):
            round_pairings = rounds[round_num]
            for match_num, pairing in enumerate(round_pairings, start=1):
                match = Match(
                    tournament=tournament,
                    round_number=round_num,
                    match_number=match_num,
                    team1=pairing.home_team,
                    team2=pairing.away_team,
                    status='SCHEDULED',
                    match_venue=tournament.linked_venue,
                    match_venue_name=tournament.venue or '',
                )
                matches.append(match)
        
        return matches

    def generate_and_save_schedule(
        self,
        tournament: Tournament,
        teams: List[Team],
        double_round_robin: bool = False
    ) -> List[Match]:
        """
        Generate schedule and save matches to database.
        
        Args:
            tournament: Tournament to generate schedule for
            teams: List of teams to schedule
            double_round_robin: If True, generate double round-robin
            
        Returns:
            List of created and saved Match objects
            
        Raises:
            ScheduleGenerationError: If generation or saving fails
        """
        # Validate tournament type
        if tournament.tournament_type != 'league':
            raise ScheduleGenerationError(
                "Schedule generation is only available for league tournaments"
            )
        
        # Check if matches already exist
        existing_matches = Match.objects.filter(tournament=tournament).count()
        if existing_matches > 0:
            raise ScheduleGenerationError(
                f"Tournament already has {existing_matches} matches. "
                "Delete existing matches before regenerating schedule."
            )
        
        # Generate pairings
        pairings = self.generate_schedule(teams, double_round_robin)
        
        # Create match objects
        matches = self.create_matches_from_pairings(tournament, pairings)
        
        # Bulk create matches
        Match.objects.bulk_create(matches)
        
        return matches
