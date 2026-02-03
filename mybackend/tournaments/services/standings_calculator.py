"""
LeagueStandingsCalculator Service

Calculates and maintains league standings based on match results.
Implements standard league points system: 3 points for win, 1 for draw, 0 for loss.
Sorts teams by points, then goal difference, then goals for.
"""

from typing import List, Dict, Optional
from dataclasses import dataclass
from django.db.models import Q, QuerySet
from tournaments.models import Tournament, Match
from teams.models import Team


@dataclass
class StandingsRow:
    """
    Represents a single row in the league standings table.
    Contains all statistics needed for display and sorting.
    """
    position: int
    team_name: str
    team_id: str  # UUID as string
    played: int
    won: int
    drawn: int
    lost: int
    goals_for: int
    goals_against: int
    goal_difference: int
    points: int


class StandingsCalculationError(Exception):
    """Raised when standings calculation fails"""
    pass


class LeagueStandingsCalculator:
    """
    Service for calculating league tournament standings.
    
    Implements standard league rules:
    - 3 points for a win
    - 1 point for a draw
    - 0 points for a loss
    
    Sorting priority:
    1. Points (descending)
    2. Goal difference (descending)
    3. Goals for (descending)
    """

    def calculate_standings(self, tournament_id: str) -> List[StandingsRow]:
        """
        Calculate standings for a league tournament.
        
        Args:
            tournament_id: UUID of the tournament
            
        Returns:
            List of StandingsRow objects sorted by position
            
        Raises:
            StandingsCalculationError: If tournament not found or invalid type
        """
        try:
            tournament = Tournament.objects.get(id=tournament_id)
        except Tournament.DoesNotExist:
            raise StandingsCalculationError(f"Tournament {tournament_id} not found")
        
        if tournament.tournament_type != 'league':
            raise StandingsCalculationError(
                f"Standings calculation is only available for league tournaments. "
                f"Tournament type is '{tournament.tournament_type}'"
            )
        
        # Get all completed matches for this tournament
        matches = Match.objects.filter(
            tournament=tournament,
            status='COMPLETED'
        ).select_related('team1', 'team2')
        
        # Get all teams participating in the tournament
        team_ids = set()
        for match in matches:
            if match.team1:
                team_ids.add(match.team1.id)
            if match.team2:
                team_ids.add(match.team2.id)
        
        # If no completed matches, get teams from all matches
        if not team_ids:
            all_matches = Match.objects.filter(tournament=tournament).select_related('team1', 'team2')
            for match in all_matches:
                if match.team1:
                    team_ids.add(match.team1.id)
                if match.team2:
                    team_ids.add(match.team2.id)
        
        teams = Team.objects.filter(id__in=team_ids)
        
        # Calculate statistics for each team
        standings_data = []
        for team in teams:
            stats = self._calculate_team_stats(team, matches)
            standings_data.append(stats)
        
        # Sort standings
        sorted_standings = self._sort_standings(standings_data)
        
        # Assign positions
        standings_rows = []
        for position, stats in enumerate(sorted_standings, start=1):
            row = StandingsRow(
                position=position,
                team_name=stats['team_name'],
                team_id=str(stats['team_id']),
                played=stats['played'],
                won=stats['won'],
                drawn=stats['drawn'],
                lost=stats['lost'],
                goals_for=stats['goals_for'],
                goals_against=stats['goals_against'],
                goal_difference=stats['goal_difference'],
                points=stats['points']
            )
            standings_rows.append(row)
        
        return standings_rows

    def _calculate_team_stats(self, team: Team, matches: QuerySet) -> Dict:
        """
        Calculate statistics for a single team.
        
        Args:
            team: Team object to calculate stats for
            matches: QuerySet of completed matches
            
        Returns:
            Dictionary containing team statistics
        """
        stats = {
            'team_id': team.id,
            'team_name': team.name,
            'played': 0,
            'won': 0,
            'drawn': 0,
            'lost': 0,
            'goals_for': 0,
            'goals_against': 0,
            'goal_difference': 0,
            'points': 0
        }
        
        for match in matches:
            # Skip matches with incomplete scores (NULL values)
            if match.player1_score is None or match.player2_score is None:
                continue
            
            # Determine if team is team1 or team2
            is_team1 = match.team1 and match.team1.id == team.id
            is_team2 = match.team2 and match.team2.id == team.id
            
            if not (is_team1 or is_team2):
                continue
            
            # Get scores
            team_score = match.player1_score if is_team1 else match.player2_score
            opponent_score = match.player2_score if is_team1 else match.player1_score
            
            # Update statistics
            stats['played'] += 1
            stats['goals_for'] += team_score
            stats['goals_against'] += opponent_score
            
            # Determine result and award points
            if team_score > opponent_score:
                stats['won'] += 1
                stats['points'] += 3
            elif team_score == opponent_score:
                stats['drawn'] += 1
                stats['points'] += 1
            else:
                stats['lost'] += 1
                # 0 points for loss
        
        # Calculate goal difference
        stats['goal_difference'] = stats['goals_for'] - stats['goals_against']
        
        return stats

    def _sort_standings(self, standings_data: List[Dict]) -> List[Dict]:
        """
        Sort standings by points, then goal difference, then goals for.
        
        Args:
            standings_data: List of team statistics dictionaries
            
        Returns:
            Sorted list of team statistics
        """
        return sorted(
            standings_data,
            key=lambda x: (
                -x['points'],           # Points descending (negative for reverse)
                -x['goal_difference'],  # Goal difference descending
                -x['goals_for']         # Goals for descending
            )
        )

    def get_team_position(self, tournament_id: str, team_id: str) -> Optional[int]:
        """
        Get the current position of a specific team in the standings.
        
        Args:
            tournament_id: UUID of the tournament
            team_id: UUID of the team
            
        Returns:
            Team's position (1-indexed) or None if team not found
        """
        standings = self.calculate_standings(tournament_id)
        
        for row in standings:
            if row.team_id == team_id:
                return row.position
        
        return None

    def get_standings_summary(self, tournament_id: str) -> Dict:
        """
        Get a summary of the standings including leader and total teams.
        
        Args:
            tournament_id: UUID of the tournament
            
        Returns:
            Dictionary with standings summary information
        """
        standings = self.calculate_standings(tournament_id)
        
        if not standings:
            return {
                'total_teams': 0,
                'leader': None,
                'matches_played': 0
            }
        
        leader = standings[0]
        total_matches = sum(row.played for row in standings) // 2  # Divide by 2 since each match counts for 2 teams
        
        return {
            'total_teams': len(standings),
            'leader': {
                'team_name': leader.team_name,
                'team_id': leader.team_id,
                'points': leader.points
            },
            'matches_played': total_matches
        }
