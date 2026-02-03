"""
Tests for RoundRobinScheduleGenerator service
"""

from typing import List, Tuple
from dataclasses import dataclass


# Mock Team class for testing
class MockTeam:
    def __init__(self, name):
        self.name = name
        self.id = name
    
    def __repr__(self):
        return f"Team({self.name})"


@dataclass
class MatchPairing:
    """Represents a match pairing between two teams"""
    home_team: MockTeam
    away_team: MockTeam
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
        teams: List[MockTeam],
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

    def _circle_method(self, teams: List[MockTeam]) -> List[MatchPairing]:
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


def test_single_round_robin_even_teams():
    """Test single round-robin with 4 teams (even number)"""
    
    teams = [MockTeam(f"Team{i}") for i in range(1, 5)]
    generator = RoundRobinScheduleGenerator()
    
    pairings = generator.generate_schedule(teams, double_round_robin=False)
    
    # Expected: 4 teams -> 4*(4-1)/2 = 6 matches
    expected_matches = 4 * 3 // 2
    assert len(pairings) == expected_matches, f"Expected {expected_matches} matches, got {len(pairings)}"
    
    # Verify each team plays every other team exactly once
    for team in teams:
        opponents = []
        for pairing in pairings:
            if pairing.home_team == team:
                opponents.append(pairing.away_team)
            elif pairing.away_team == team:
                opponents.append(pairing.home_team)
        
        # Each team should play 3 opponents (all other teams)
        assert len(opponents) == 3, f"{team} played {len(opponents)} matches, expected 3"
        
        # No duplicate opponents
        assert len(opponents) == len(set(opponents)), f"{team} has duplicate opponents"
    
    print("✓ Single round-robin with 4 teams: PASSED")


def test_single_round_robin_odd_teams():
    """Test single round-robin with 5 teams (odd number)"""
    
    teams = [MockTeam(f"Team{i}") for i in range(1, 6)]
    generator = RoundRobinScheduleGenerator()
    
    pairings = generator.generate_schedule(teams, double_round_robin=False)
    
    # Expected: 5 teams -> 5*(5-1)/2 = 10 matches
    expected_matches = 5 * 4 // 2
    assert len(pairings) == expected_matches, f"Expected {expected_matches} matches, got {len(pairings)}"
    
    # Verify each team plays every other team exactly once
    for team in teams:
        opponents = []
        for pairing in pairings:
            if pairing.home_team == team:
                opponents.append(pairing.away_team)
            elif pairing.away_team == team:
                opponents.append(pairing.home_team)
        
        # Each team should play 4 opponents (all other teams)
        assert len(opponents) == 4, f"{team} played {len(opponents)} matches, expected 4"
        
        # No duplicate opponents
        assert len(opponents) == len(set(opponents)), f"{team} has duplicate opponents"
    
    print("✓ Single round-robin with 5 teams: PASSED")


def test_double_round_robin():
    """Test double round-robin with 3 teams"""
    
    teams = [MockTeam(f"Team{i}") for i in range(1, 4)]
    generator = RoundRobinScheduleGenerator()
    
    pairings = generator.generate_schedule(teams, double_round_robin=True)
    
    # Expected: 3 teams -> 3*(3-1) = 6 matches
    expected_matches = 3 * 2
    assert len(pairings) == expected_matches, f"Expected {expected_matches} matches, got {len(pairings)}"
    
    # Verify each team plays every other team exactly twice
    for team in teams:
        home_opponents = []
        away_opponents = []
        
        for pairing in pairings:
            if pairing.home_team == team:
                home_opponents.append(pairing.away_team)
            elif pairing.away_team == team:
                away_opponents.append(pairing.home_team)
        
        # Each team should play 2 home matches and 2 away matches
        assert len(home_opponents) == 2, f"{team} played {len(home_opponents)} home matches, expected 2"
        assert len(away_opponents) == 2, f"{team} played {len(away_opponents)} away matches, expected 2"
        
        # Should play each opponent once at home and once away
        assert set(home_opponents) == set(away_opponents), f"{team} home and away opponents don't match"
    
    print("✓ Double round-robin with 3 teams: PASSED")


def test_no_team_plays_twice_in_same_round():
    """Test that no team appears twice in the same round"""
    
    teams = [MockTeam(f"Team{i}") for i in range(1, 7)]
    generator = RoundRobinScheduleGenerator()
    
    pairings = generator.generate_schedule(teams, double_round_robin=False)
    
    # Group by round
    rounds = {}
    for pairing in pairings:
        if pairing.round_number not in rounds:
            rounds[pairing.round_number] = []
        rounds[pairing.round_number].extend([pairing.home_team, pairing.away_team])
    
    # Verify no duplicates in each round
    for round_num, teams_in_round in rounds.items():
        unique_teams = set(teams_in_round)
        assert len(teams_in_round) == len(unique_teams), \
            f"Round {round_num} has duplicate teams: {teams_in_round}"
    
    print("✓ No team plays twice in same round: PASSED")


def test_insufficient_teams():
    """Test error handling for insufficient teams"""
    
    generator = RoundRobinScheduleGenerator()
    
    # Test with 0 teams
    try:
        generator.generate_schedule([], double_round_robin=False)
        assert False, "Should have raised ScheduleGenerationError"
    except ScheduleGenerationError as e:
        assert "at least 2 teams" in str(e).lower()
    
    # Test with 1 team
    try:
        generator.generate_schedule([MockTeam("Team1")], double_round_robin=False)
        assert False, "Should have raised ScheduleGenerationError"
    except ScheduleGenerationError as e:
        assert "at least 2 teams" in str(e).lower()
    
    print("✓ Insufficient teams error handling: PASSED")


if __name__ == "__main__":
    print("Running RoundRobinScheduleGenerator tests...\n")
    
    test_single_round_robin_even_teams()
    test_single_round_robin_odd_teams()
    test_double_round_robin()
    test_no_team_plays_twice_in_same_round()
    test_insufficient_teams()
    
    print("\n✅ All tests passed!")
