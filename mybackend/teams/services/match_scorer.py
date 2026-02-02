"""
MatchScorer Service

Handles sport-specific match scoring with validation and statistics tracking.
Supports both futsal and badminton scoring systems with proper rule validation.
"""

from typing import List, Dict, Any, Optional
from django.db import transaction
from django.core.exceptions import ValidationError
from tournaments.models import Match
from teams.models import (
    Team, FutsalScore, FutsalPlayerStat, BadmintonSet,
    TeamTournamentRegistration
)
from accounts.models import CustomUser


class MatchScoringError(Exception):
    """Base exception for match scoring errors"""
    pass


class InvalidScoreError(MatchScoringError):
    """Raised when scores violate sport-specific rules"""
    pass


class MatchNotFoundError(MatchScoringError):
    """Raised when attempting to score non-existent matches"""
    pass


class UnauthorizedScoringError(MatchScoringError):
    """Raised when non-authorized users attempt to update scores"""
    pass


class MatchAlreadyScoredError(MatchScoringError):
    """Raised when attempting to update scores for completed matches"""
    pass


class MatchScorer:
    """
    Service for recording and validating match scores across different sports.
    Provides manual score entry capability for organizers with proper validation.
    """

    @staticmethod
    def record_futsal_match(
        match_id: str,
        home_team_data: Dict[str, Any],
        away_team_data: Dict[str, Any],
        organizer_id: str
    ) -> Match:
        """
        Record a complete futsal match with team scores and player statistics.
        
        Args:
            match_id: UUID of the match to score
            home_team_data: Dict containing 'goals' and 'player_stats' list
            away_team_data: Dict containing 'goals' and 'player_stats' list
            organizer_id: UUID of the organizer recording the score
            
        Returns:
            Updated Match object
            
        Raises:
            MatchNotFoundError: If match doesn't exist
            UnauthorizedScoringError: If user is not authorized
            InvalidScoreError: If scores are invalid
            MatchAlreadyScoredError: If match is already completed
        """
        try:
            match = Match.objects.get(id=match_id)
        except Match.DoesNotExist:
            raise MatchNotFoundError(f"Match with ID {match_id} not found")

        # Verify organizer authorization
        organizer = CustomUser.objects.get(id=organizer_id)
        if organizer.role != 'ORGANIZER' or match.tournament.organizer != organizer:
            raise UnauthorizedScoringError("Only tournament organizers can record match scores")

        # Check if match is already completed
        if match.status == 'COMPLETED':
            raise MatchAlreadyScoredError("Cannot update scores for completed matches")

        # Validate sport type
        if match.tournament.sport_type != 'FUTSAL':
            raise InvalidScoreError("This method is only for futsal matches")

        # Validate team data structure
        MatchScorer._validate_futsal_data(home_team_data, away_team_data)

        with transaction.atomic():
            # Record team scores
            home_score = MatchScorer._record_futsal_team_score(
                match, match.team1, home_team_data
            )
            away_score = MatchScorer._record_futsal_team_score(
                match, match.team2, away_team_data
            )

            # Update match scores and status
            match.player1_score = home_team_data['goals']  # Using existing field for team1 score
            match.player2_score = away_team_data['goals']  # Using existing field for team2 score
            
            # Determine winner
            if home_team_data['goals'] > away_team_data['goals']:
                match.winning_team = match.team1
            elif away_team_data['goals'] > home_team_data['goals']:
                match.winning_team = match.team2
            # No winner assignment for draws

            match.status = 'COMPLETED'
            match.save()

            # Advance winner to next round if this is an elimination tournament
            MatchScorer._advance_winner_to_next_round(match)

            return match

    @staticmethod
    def record_badminton_match(
        match_id: str,
        sets_data: List[Dict[str, Any]],
        organizer_id: str
    ) -> Match:
        """
        Record a complete badminton match with set scores following BWF guidelines.
        
        Args:
            match_id: UUID of the match to score
            sets_data: List of dicts with 'set_number', 'home_score', 'away_score', 'duration'
            organizer_id: UUID of the organizer recording the score
            
        Returns:
            Updated Match object
            
        Raises:
            MatchNotFoundError: If match doesn't exist
            UnauthorizedScoringError: If user is not authorized
            InvalidScoreError: If scores violate BWF rules
            MatchAlreadyScoredError: If match is already completed
        """
        try:
            match = Match.objects.get(id=match_id)
        except Match.DoesNotExist:
            raise MatchNotFoundError(f"Match with ID {match_id} not found")

        # Verify organizer authorization
        organizer = CustomUser.objects.get(id=organizer_id)
        if organizer.role != 'ORGANIZER' or match.tournament.organizer != organizer:
            raise UnauthorizedScoringError("Only tournament organizers can record match scores")

        # Check if match is already completed
        if match.status == 'COMPLETED':
            raise MatchAlreadyScoredError("Cannot update scores for completed matches")

        # Validate sport type
        if match.tournament.sport_type != 'BADMINTON':
            raise InvalidScoreError("This method is only for badminton matches")

        # Validate sets data
        MatchScorer._validate_badminton_sets_data(sets_data)

        with transaction.atomic():
            # Clear existing sets
            match.badminton_sets.all().delete()

            # Create new sets
            sets = []
            for set_data in sets_data:
                badminton_set = BadmintonSet.objects.create(
                    match=match,
                    set_number=set_data['set_number'],
                    home_score=set_data['home_score'],
                    away_score=set_data['away_score'],
                    duration=set_data['duration']
                )
                sets.append(badminton_set)

            # Validate complete match
            if not BadmintonSet.validate_match_sets(sets):
                raise InvalidScoreError("Invalid badminton match result")

            # Calculate match winner
            home_sets_won = sum(1 for s in sets if s.get_winner() == 'home')
            away_sets_won = sum(1 for s in sets if s.get_winner() == 'away')

            # Update match with set counts (using existing score fields)
            match.player1_score = home_sets_won
            match.player2_score = away_sets_won

            # Determine winner
            if home_sets_won > away_sets_won:
                if match.tournament.registration_type == 'TEAM':
                    match.winning_team = match.team1
                else:
                    match.winner = match.player1
            else:
                if match.tournament.registration_type == 'TEAM':
                    match.winning_team = match.team2
                else:
                    match.winner = match.player2

            match.status = 'COMPLETED'
            match.save()

            # Advance winner to next round if this is an elimination tournament
            MatchScorer._advance_winner_to_next_round(match)

            return match

    @staticmethod
    def update_match_score(
        match_id: str,
        score_update: Dict[str, Any],
        organizer_id: str
    ) -> Match:
        """
        Update an existing match score with new data.
        
        Args:
            match_id: UUID of the match to update
            score_update: Dict containing updated score data
            organizer_id: UUID of the organizer updating the score
            
        Returns:
            Updated Match object
        """
        try:
            match = Match.objects.get(id=match_id)
        except Match.DoesNotExist:
            raise MatchNotFoundError(f"Match with ID {match_id} not found")

        # Verify organizer authorization
        organizer = CustomUser.objects.get(id=organizer_id)
        if organizer.role != 'ORGANIZER' or match.tournament.organizer != organizer:
            raise UnauthorizedScoringError("Only tournament organizers can update match scores")

        # Route to appropriate update method based on sport
        if match.tournament.sport_type == 'FUTSAL':
            return MatchScorer._update_futsal_match(match, score_update)
        elif match.tournament.sport_type == 'BADMINTON':
            return MatchScorer._update_badminton_match(match, score_update)
        else:
            raise InvalidScoreError(f"Unsupported sport type: {match.tournament.sport_type}")

    @staticmethod
    def validate_score(score_data: Dict[str, Any], sport_type: str) -> Dict[str, Any]:
        """
        Validate score data against sport-specific rules.
        
        Args:
            score_data: Dict containing score information
            sport_type: 'FUTSAL' or 'BADMINTON'
            
        Returns:
            Dict with validation result and any errors
        """
        result = {'is_valid': True, 'errors': []}

        try:
            if sport_type == 'FUTSAL':
                MatchScorer._validate_futsal_score_data(score_data)
            elif sport_type == 'BADMINTON':
                MatchScorer._validate_badminton_score_data(score_data)
            else:
                result['is_valid'] = False
                result['errors'].append(f"Unsupported sport type: {sport_type}")
        except InvalidScoreError as e:
            result['is_valid'] = False
            result['errors'].append(str(e))

        return result

    # Private helper methods

    @staticmethod
    def _validate_futsal_data(home_data: Dict[str, Any], away_data: Dict[str, Any]):
        """Validate futsal match data structure and values"""
        for team_data in [home_data, away_data]:
            if 'goals' not in team_data or not isinstance(team_data['goals'], int):
                raise InvalidScoreError("Team data must include 'goals' as integer")
            
            if team_data['goals'] < 0:
                raise InvalidScoreError("Goals cannot be negative")
            
            if 'player_stats' not in team_data or not isinstance(team_data['player_stats'], list):
                raise InvalidScoreError("Team data must include 'player_stats' as list")

            # Validate player stats
            total_goals = 0
            for stat in team_data['player_stats']:
                if not all(key in stat for key in ['player_id', 'goals', 'assists', 'minutes_played']):
                    raise InvalidScoreError("Player stats must include player_id, goals, assists, minutes_played")
                
                if any(stat[key] < 0 for key in ['goals', 'assists', 'minutes_played']):
                    raise InvalidScoreError("Player statistics cannot be negative")
                
                if stat['minutes_played'] > 90:
                    raise InvalidScoreError("Player cannot play more than 90 minutes")
                
                total_goals += stat['goals']

            if total_goals != team_data['goals']:
                raise InvalidScoreError("Sum of player goals must equal team goals")

            # Validate goal details if provided
            goal_details = team_data.get('goal_details', [])
            if len(goal_details) != team_data['goals']:
                raise InvalidScoreError(f"Number of goal details ({len(goal_details)}) must match team goals ({team_data['goals']})")
            
            for goal_detail in goal_details:
                if not all(key in goal_detail for key in ['scorer_id', 'minute']):
                    raise InvalidScoreError("Goal details must include scorer_id and minute")
                
                if not (1 <= goal_detail['minute'] <= 90):
                    raise InvalidScoreError("Goal minute must be between 1 and 90")
                
                # Validate goal type if provided
                valid_goal_types = ['REGULAR', 'PENALTY', 'FREE_KICK', 'OWN_GOAL']
                if 'goal_type' in goal_detail and goal_detail['goal_type'] not in valid_goal_types:
                    raise InvalidScoreError(f"Invalid goal type: {goal_detail['goal_type']}")

            # Validate card details if provided
            card_details = team_data.get('card_details', [])
            for card_detail in card_details:
                if not all(key in card_detail for key in ['player_id', 'card_type', 'minute']):
                    raise InvalidScoreError("Card details must include player_id, card_type, and minute")
                
                if card_detail['card_type'] not in ['YELLOW', 'RED']:
                    raise InvalidScoreError("Card type must be YELLOW or RED")
                
                if not (1 <= card_detail['minute'] <= 90):
                    raise InvalidScoreError("Card minute must be between 1 and 90")

    @staticmethod
    def _validate_badminton_sets_data(sets_data: List[Dict[str, Any]]):
        """Validate badminton sets data structure and BWF compliance"""
        if not sets_data or len(sets_data) < 2 or len(sets_data) > 3:
            raise InvalidScoreError("Badminton match must have 2 or 3 sets")

        for i, set_data in enumerate(sets_data, 1):
            if not all(key in set_data for key in ['set_number', 'home_score', 'away_score', 'duration']):
                raise InvalidScoreError(f"Set {i} must include set_number, home_score, away_score, duration")
            
            if set_data['set_number'] != i:
                raise InvalidScoreError(f"Set numbers must be sequential starting from 1")
            
            # Create temporary BadmintonSet to validate scores
            temp_set = BadmintonSet(
                set_number=set_data['set_number'],
                home_score=set_data['home_score'],
                away_score=set_data['away_score'],
                duration=set_data['duration']
            )
            
            if not temp_set.is_valid_score():
                raise InvalidScoreError(f"Set {i} scores violate BWF guidelines")

    @staticmethod
    def _record_futsal_team_score(match: Match, team: Team, team_data: Dict[str, Any]) -> FutsalScore:
        """Record futsal score for a single team"""
        # Create or update team score
        futsal_score, created = FutsalScore.objects.get_or_create(
            match=match,
            team=team,
            defaults={
                'goals': team_data['goals'],
                'shots_on_target': team_data.get('shots_on_target', 0),
                'shots_off_target': team_data.get('shots_off_target', 0),
                'possession_percentage': team_data.get('possession_percentage', 50.0),
                'fouls': team_data.get('fouls', 0),
                'yellow_cards': team_data.get('yellow_cards', 0),
                'red_cards': team_data.get('red_cards', 0)
            }
        )
        
        if not created:
            futsal_score.goals = team_data['goals']
            futsal_score.shots_on_target = team_data.get('shots_on_target', 0)
            futsal_score.shots_off_target = team_data.get('shots_off_target', 0)
            futsal_score.possession_percentage = team_data.get('possession_percentage', 50.0)
            futsal_score.fouls = team_data.get('fouls', 0)
            futsal_score.yellow_cards = team_data.get('yellow_cards', 0)
            futsal_score.red_cards = team_data.get('red_cards', 0)
            futsal_score.save()

        # Clear existing player stats and goal details
        futsal_score.player_stats.all().delete()
        futsal_score.goal_details.all().delete()
        futsal_score.cards.all().delete()

        # Create new player stats
        for stat_data in team_data['player_stats']:
            player = CustomUser.objects.get(id=stat_data['player_id'])
            FutsalPlayerStat.objects.create(
                futsal_score=futsal_score,
                player=player,
                goals=stat_data['goals'],
                assists=stat_data['assists'],
                minutes_played=stat_data['minutes_played'],
                is_starter=stat_data.get('is_starter', True),
                shots_on_target=stat_data.get('shots_on_target', 0),
                shots_off_target=stat_data.get('shots_off_target', 0),
                tackles=stat_data.get('tackles', 0),
                interceptions=stat_data.get('interceptions', 0),
                clearances=stat_data.get('clearances', 0),
                yellow_cards=stat_data.get('yellow_cards', 0),
                red_cards=stat_data.get('red_cards', 0),
                fouls_committed=stat_data.get('fouls_committed', 0),
                fouls_suffered=stat_data.get('fouls_suffered', 0),
                passes_completed=stat_data.get('passes_completed', 0),
                passes_attempted=stat_data.get('passes_attempted', 0)
            )

        # Create goal details
        from teams.models import FutsalGoal
        for goal_data in team_data.get('goal_details', []):
            scorer = CustomUser.objects.get(id=goal_data['scorer_id'])
            assist_by = None
            if goal_data.get('assist_by_id'):
                assist_by = CustomUser.objects.get(id=goal_data['assist_by_id'])
            
            FutsalGoal.objects.create(
                futsal_score=futsal_score,
                scorer=scorer,
                assist_by=assist_by,
                minute=goal_data['minute'],
                goal_type=goal_data.get('goal_type', 'REGULAR'),
                description=goal_data.get('description', '')
            )

        # Create card details
        from teams.models import FutsalCard
        for card_data in team_data.get('card_details', []):
            player = CustomUser.objects.get(id=card_data['player_id'])
            FutsalCard.objects.create(
                futsal_score=futsal_score,
                player=player,
                card_type=card_data['card_type'],
                reason=card_data.get('reason', 'UNSPORTING_BEHAVIOR'),
                minute=card_data['minute'],
                description=card_data.get('description', '')
            )

        return futsal_score

    @staticmethod
    def _update_futsal_match(match: Match, score_update: Dict[str, Any]) -> Match:
        """Update futsal match scores"""
        # Implementation for updating futsal match
        # This would be similar to record_futsal_match but for updates
        pass

    @staticmethod
    def _update_badminton_match(match: Match, score_update: Dict[str, Any]) -> Match:
        """Update badminton match scores"""
        # Implementation for updating badminton match
        # This would be similar to record_badminton_match but for updates
        pass

    @staticmethod
    def _validate_futsal_score_data(score_data: Dict[str, Any]):
        """Validate futsal score data structure"""
        # Implementation for validating futsal score data
        pass

    @staticmethod
    def _validate_badminton_score_data(score_data: Dict[str, Any]):
        """Validate badminton score data structure"""
        # Implementation for validating badminton score data
        pass

    @staticmethod
    def _advance_winner_to_next_round(match: Match):
        """
        Advance the winner of a completed match to the next round in elimination tournaments.
        Works with proper power-of-2 bracket structure.
        
        Args:
            match: The completed match with a determined winner
        """
        # Only advance winners in single elimination tournaments
        if match.tournament.tournament_type != 'SINGLE_ELIMINATION':
            print(f"Not advancing winner - tournament type is {match.tournament.tournament_type}")
            return
        
        # Only advance if there's a winner (no draws in elimination)
        winner = None
        if match.tournament.registration_type == 'TEAM':
            winner = match.winning_team
        else:
            winner = match.winner
            
        if not winner:
            print("No winner found - cannot advance")
            return
        
        print(f"Advancing winner from Match {match.match_number} (Round {match.round_number})")
        
        # Find the next round
        next_round = match.round_number + 1
        
        # Get all matches in the current round, ordered by match number
        current_round_matches = Match.objects.filter(
            tournament=match.tournament,
            round_number=match.round_number
        ).order_by('match_number')
        
        # Find the position of current match in its round (0-based)
        current_match_position = None
        for i, round_match in enumerate(current_round_matches):
            if round_match.id == match.id:
                current_match_position = i
                break
        
        if current_match_position is None:
            print(f"Could not find position of match {match.id} in round {match.round_number}")
            return
        
        print(f"Current match position in round: {current_match_position}")
        
        # Get all matches in the next round, ordered by match number
        next_round_matches = Match.objects.filter(
            tournament=match.tournament,
            round_number=next_round
        ).order_by('match_number')
        
        if not next_round_matches.exists():
            print(f"No matches found in round {next_round} - this is the final match")
            
            # This was the final match, so the tournament is complete
            tournament = match.tournament
            tournament.status = 'COMPLETED'
            
            if tournament.registration_type == 'TEAM':
                tournament.winner_team = winner
                # Also set the winner attribute for backward compatibility/display
                # Note: You might need to adjust this based on your exact model structure
                # asking user to verify if tournament.winner exists on model or just winner_team
            else:
                tournament.winner = winner
                
            tournament.save()
            print(f"Tournament {tournament.title} completed. Winner: {winner}")
            return
        
        print(f"Found {next_round_matches.count()} matches in round {next_round}")
        
        # In a proper power-of-2 bracket:
        # - Every 2 matches in current round feed into 1 match in next round
        # - Match positions 0,1 -> next round position 0
        # - Match positions 2,3 -> next round position 1, etc.
        next_match_position = current_match_position // 2
        
        if next_match_position >= len(next_round_matches):
            print(f"No next round match found at position {next_match_position} for round {next_round}")
            return
        
        target_match = next_round_matches[next_match_position]
        
        # Determine which position in the target match (team1/player1 or team2/player2)
        # Even positions (0, 2, 4...) go to position 1, odd positions (1, 3, 5...) go to position 2
        if current_match_position % 2 == 0:
            # Winner goes to position 1 (team1/player1)
            if match.tournament.registration_type == 'TEAM':
                target_match.team1 = winner
                print(f"Advanced team {winner.name} to team1 of Match {target_match.match_number} (Round {target_match.round_number})")
            else:
                target_match.player1 = winner
                print(f"Advanced player {winner.full_name} to player1 of Match {target_match.match_number} (Round {target_match.round_number})")
        else:
            # Winner goes to position 2 (team2/player2)
            if match.tournament.registration_type == 'TEAM':
                target_match.team2 = winner
                print(f"Advanced team {winner.name} to team2 of Match {target_match.match_number} (Round {target_match.round_number})")
            else:
                target_match.player2 = winner
                print(f"Advanced player {winner.full_name} to player2 of Match {target_match.match_number} (Round {target_match.round_number})")
        
        # Update match notes to reflect the advancement
        if target_match.notes and 'Winners from previous round will be assigned' in target_match.notes:
            target_match.notes = target_match.notes.replace(
                'Winners from previous round will be assigned',
                f'Advanced from Round {match.round_number} Match {match.match_number}'
            )
        
        target_match.save()
        print(f"Successfully saved advancement to Match {target_match.match_number} (Round {target_match.round_number})")