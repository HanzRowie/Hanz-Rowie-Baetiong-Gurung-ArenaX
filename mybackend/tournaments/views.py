from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from accounts.decorators import jwt_required
from accounts.models import CustomUser
from accounts.utils import decode_jwt
from django.core.exceptions import ValidationError
import uuid

from .models import Tournament, TournamentRegistration, Match
from .serializers import TournamentSerializer, TournamentRegistrationSerializer, MatchSerializer
from referees.models import RefereeBooking
from referees.serializers import RefereeBookingSerializer

class TournamentViewSet(viewsets.ModelViewSet):
    queryset = Tournament.objects.all().order_by('-created_at')
    serializer_class = TournamentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Role-based filtering
        if user.role == 'ORGANIZER':
            # Organizers only see their own tournaments
            queryset = Tournament.objects.filter(organizer=user)
        else:
            # Players, referees, and venue owners see all tournaments
            queryset = Tournament.objects.all()
        
        # Apply additional filters
        sport_type = self.request.query_params.get('sport_type', None)
        status_filter = self.request.query_params.get('status', None)
        registration_type = self.request.query_params.get('registration_type', None)

        if sport_type:
            queryset = queryset.filter(sport_type=sport_type)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if registration_type:
            queryset = queryset.filter(registration_type=registration_type)

        return queryset.order_by('-created_at')
    
    def update(self, request, *args, **kwargs):
        """Override update to prevent tournament type change after matches exist"""
        instance = self.get_object()
        
        # Check if tournament_type is being changed
        new_tournament_type = request.data.get('tournament_type')
        if new_tournament_type and new_tournament_type != instance.tournament_type:
            # Check if matches exist
            if Match.objects.filter(tournament=instance).exists():
                return Response({
                    'error': 'Cannot change tournament type after matches have been created.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return super().update(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def generate_schedule(self, request, pk=None):
        """Generate round-robin schedule for league tournament"""
        tournament = self.get_object()
        
        # Check if user is the organizer
        if request.user != tournament.organizer:
            return Response({
                'error': 'Only tournament organizers can generate schedules'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Validate tournament type
        if tournament.tournament_type != 'league':
            return Response({
                'error': 'Schedule generation is only available for league tournaments'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get teams for this tournament
        if tournament.registration_type == 'TEAM':
            from teams.models import TeamTournamentRegistration
            team_registrations = TeamTournamentRegistration.objects.filter(
                tournament=tournament,
                status='CONFIRMED'
            ).select_related('team')
            teams = [reg.team for reg in team_registrations]
        else:
            return Response({
                'error': 'League tournaments currently only support team registration'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate minimum teams
        if len(teams) < 2:
            return Response({
                'error': f'At least 2 teams are required to generate a schedule. Current teams: {len(teams)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if schedule already exists
        existing_matches = Match.objects.filter(tournament=tournament).count()
        if existing_matches > 0:
            return Response({
                'error': f'Tournament already has {existing_matches} matches. Delete existing matches before regenerating schedule.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate schedule
        try:
            from tournaments.services.schedule_generator import RoundRobinScheduleGenerator
            
            generator = RoundRobinScheduleGenerator()
            double_round_robin = request.data.get('double_round_robin', False)
            
            matches = generator.generate_and_save_schedule(
                tournament=tournament,
                teams=teams,
                double_round_robin=double_round_robin
            )
            
            return Response({
                'message': 'Schedule generated successfully',
                'tournament_id': str(tournament.id),
                'matches_created': len(matches),
                'rounds': max(m.round_number for m in matches),
                'double_round_robin': double_round_robin
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'error': f'Failed to generate schedule: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def standings(self, request, pk=None):
        """Get current standings for league tournament"""
        tournament = self.get_object()
        
        # Validate tournament type
        if tournament.tournament_type != 'league':
            return Response({
                'error': 'Standings are only available for league tournaments'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from tournaments.services.standings_calculator import LeagueStandingsCalculator
            
            calculator = LeagueStandingsCalculator()
            standings = calculator.calculate_standings(str(tournament.id))
            
            # Convert StandingsRow objects to dictionaries
            standings_data = [
                {
                    'position': row.position,
                    'team_name': row.team_name,
                    'team_id': row.team_id,
                    'played': row.played,
                    'won': row.won,
                    'drawn': row.drawn,
                    'lost': row.lost,
                    'goals_for': row.goals_for,
                    'goals_against': row.goals_against,
                    'goal_difference': row.goal_difference,
                    'points': row.points
                }
                for row in standings
            ]
            
            return Response({
                'tournament_id': str(tournament.id),
                'tournament_name': tournament.title,
                'standings': standings_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Failed to calculate standings: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def top_scorers(self, request, pk=None):
        """Get top scorers for tournament"""
        tournament = self.get_object()
        
        # Validate tournament type
        if tournament.tournament_type != 'league':
            return Response({
                'error': 'Player statistics are only available for league tournaments'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from tournaments.services.player_stats_aggregator import PlayerStatsAggregator
            
            aggregator = PlayerStatsAggregator()
            limit = int(request.query_params.get('limit', 10))
            top_scorers = aggregator.get_top_scorers(str(tournament.id), limit=limit)
            
            # Convert PlayerStats objects to dictionaries
            scorers_data = [
                {
                    'rank': player.rank,
                    'player_id': player.player_id,
                    'player_name': player.player_name,
                    'team_name': player.team_name,
                    'goals': player.goals,
                    'assists': player.assists
                }
                for player in top_scorers
            ]
            
            return Response({
                'tournament_id': str(tournament.id),
                'tournament_name': tournament.title,
                'top_scorers': scorers_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Failed to get top scorers: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def top_assists(self, request, pk=None):
        """Get top assist providers for tournament"""
        tournament = self.get_object()
        
        # Validate tournament type
        if tournament.tournament_type != 'league':
            return Response({
                'error': 'Player statistics are only available for league tournaments'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from tournaments.services.player_stats_aggregator import PlayerStatsAggregator
            
            aggregator = PlayerStatsAggregator()
            limit = int(request.query_params.get('limit', 10))
            top_assists = aggregator.get_top_assists(str(tournament.id), limit=limit)
            
            # Convert PlayerStats objects to dictionaries
            assists_data = [
                {
                    'rank': player.rank,
                    'player_id': player.player_id,
                    'player_name': player.player_name,
                    'team_name': player.team_name,
                    'goals': player.goals,
                    'assists': player.assists
                }
                for player in top_assists
            ]
            
            return Response({
                'tournament_id': str(tournament.id),
                'tournament_name': tournament.title,
                'top_assists': assists_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Failed to get top assists: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TournamentRegistrationViewSet(viewsets.ModelViewSet):
    queryset = TournamentRegistration.objects.all()
    serializer_class = TournamentRegistrationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TournamentRegistration.objects.filter(player=self.request.user)

@api_view(['POST'])
def register_for_tournament(request, tournament_id):
    """Register a player for a tournament"""
    # Simple JWT authentication check
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        # Import here to avoid circular imports
        from accounts.utils import decode_jwt
        
        token = auth_header.split(' ')[1]
        payload = decode_jwt(token)
        if not payload:
            return Response({'error': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = CustomUser.objects.get(id=payload['user_id'])
        tournament = get_object_or_404(Tournament, id=tournament_id)

        # Validate registration type compatibility
        if tournament.registration_type == 'TEAM':
            return Response({
                'error': 'This tournament requires team registration. Please register as a team.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if user is already registered
        if TournamentRegistration.objects.filter(tournament=tournament, player=user).exists():
            return Response({'error': 'Already registered for this tournament'}, status=status.HTTP_400_BAD_REQUEST)

        # Create registration with PENDING status (requires organizer approval)
        registration = TournamentRegistration.objects.create(
            tournament=tournament,
            player=user,
            status='PENDING'
        )

        return Response({
            'message': 'Registration submitted successfully. Awaiting organizer approval.',
            'registration_id': str(registration.id),
            'tournament': tournament.title,
            'status': 'PENDING'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@jwt_required
def withdraw_from_tournament(request, tournament_id):
    """Withdraw from a tournament"""
    user = CustomUser.objects.get(id=request.user_id)
    tournament = get_object_or_404(Tournament, id=tournament_id)

    try:
        registration = TournamentRegistration.objects.get(
            tournament=tournament,
            player=user
        )

        # Check if tournament has started
        from django.utils import timezone
        if timezone.now() >= tournament.date:
            return Response({'error': 'Cannot withdraw from an ongoing tournament'}, status=status.HTTP_400_BAD_REQUEST)

        registration.delete()
        return Response({'message': 'Successfully withdrawn from tournament'}, status=status.HTTP_200_OK)

    except TournamentRegistration.DoesNotExist:
        return Response({'error': 'Not registered for this tournament'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_tournaments(request):
    """Get tournaments for current user based on their role"""
    user = request.user
    
    if user.role == 'ORGANIZER':
        # Organizers get their created tournaments
        organized_tournaments = Tournament.objects.filter(organizer=user).order_by('-created_at')
        
        # Also get tournaments they're registered for (if any)
        registrations = TournamentRegistration.objects.filter(player=user).select_related('tournament')
        registered_tournaments = [reg.tournament for reg in registrations]
        
        return Response({
            'organized_tournaments': TournamentSerializer(organized_tournaments, many=True).data,
            'registered_tournaments': TournamentSerializer(registered_tournaments, many=True).data
        }, status=status.HTTP_200_OK)
    
    elif user.role == 'PLAYER':
        # Players get tournaments they're registered for
        registrations = TournamentRegistration.objects.filter(player=user).select_related('tournament')
        registered_tournaments = [reg.tournament for reg in registrations]
        
        return Response({
            'organized_tournaments': [],
            'registered_tournaments': TournamentSerializer(registered_tournaments, many=True).data
        }, status=status.HTTP_200_OK)
    
    else:
        # Other roles (REFEREE, VENUE_OWNER) get empty lists for now
        return Response({
            'organized_tournaments': [],
            'registered_tournaments': []
        }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_tournament(request):
    """Create a new tournament (organizer only)"""
    if request.user.role != 'ORGANIZER':
        return Response({'error': 'Only organizers can create tournaments'}, status=status.HTTP_403_FORBIDDEN)

    try:
        data = request.data.copy()
        linked_venue_id = data.get('linked_venue_id')
        
        # If a venue is selected, create a booking for it
        venue_booking = None
        if linked_venue_id:
            from venues.models import Venue, VenueBooking
            from datetime import datetime, timedelta
            
            try:
                venue = Venue.objects.get(id=linked_venue_id)
                
                start_time_str = data.get('start_time')
                end_time_str = data.get('end_time')
                
                # Default to 1 hour after start_time if not provided or empty
                if not end_time_str and start_time_str:
                    try:
                        start_dt = datetime.strptime(start_time_str, '%H:%M')
                        end_dt = start_dt + timedelta(hours=1)
                        end_time_str = end_dt.strftime('%H:%M')
                    except Exception:
                        end_time_str = start_time_str

                # Create venue booking data
                booking_data = {
                    'date': data.get('date'),
                    'start_time': start_time_str,
                    'end_time': end_time_str,
                    'purpose': f"Tournament: {data.get('title', 'Tournament')}",
                    'notes': f"Automatically booked for tournament creation. Tournament ID will be updated after creation."
                }
                
                # Validate required fields
                if not all([booking_data['date'], booking_data['start_time']]):
                    return Response({'error': 'Date and start_time are required for venue booking'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Convert time strings to time objects
                start_time_obj = datetime.strptime(booking_data['start_time'], '%H:%M').time()
                end_time_obj = datetime.strptime(booking_data['end_time'], '%H:%M').time()
                
                # Parse date
                if isinstance(booking_data['date'], str):
                    date_obj = datetime.strptime(booking_data['date'], '%Y-%m-%d').date()
                else:
                    date_obj = booking_data['date']
                
                # Create the venue booking
                venue_booking = VenueBooking(
                    venue=venue,
                    user=request.user,
                    date=date_obj,
                    start_time=start_time_obj,
                    end_time=end_time_obj,
                    purpose=booking_data['purpose'],
                    notes=booking_data['notes'],
                    status='CONFIRMED'  # Auto-confirm tournament bookings
                )
                
                # This will run validation and save
                venue_booking.save()
                
                # Update tournament data with venue info
                data['venue'] = venue.name
                data['venue_address'] = venue.location
                data['linked_venue'] = venue.id
                data['venue_booking'] = venue_booking.id
                
            except Venue.DoesNotExist:
                return Response({'error': 'Selected venue does not exist'}, status=status.HTTP_400_BAD_REQUEST)
            except ValidationError as e:
                # Return the validation error messages
                error_messages = e.message_dict if hasattr(e, 'message_dict') else {'__all__': [str(e)]}
                return Response({
                    'error': 'Venue booking validation failed',
                    'details': error_messages
                }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                import traceback
                error_details = traceback.format_exc()
                print(f"Venue booking error: {error_details}")
                return Response({
                    'error': f'Venue booking failed: {str(e)}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create the tournament
        serializer = TournamentSerializer(data=data)
        if serializer.is_valid():
            tournament = serializer.save(organizer=request.user)
            
            # Update venue booking with tournament reference
            if venue_booking:
                venue_booking.notes = f"Tournament: {tournament.title} (ID: {tournament.id})"
                venue_booking.save()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            # If tournament creation fails and we created a booking, clean it up
            if venue_booking:
                venue_booking.delete()
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Tournament creation error: {error_details}")
        return Response({
            'error': f'Tournament creation failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_match_result(request, tournament_id, match_id):
    """Update match result with scores and winner"""
    try:
        tournament = get_object_or_404(Tournament, id=tournament_id)
        match = get_object_or_404(Match, id=match_id, tournament=tournament)
        
        # Check if user is the organizer
        if request.user != tournament.organizer:
            return Response({
                'error': 'Only tournament organizers can update match results'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get the data from request
        data = request.data
        
        # Update scores based on tournament type
        if tournament.registration_type == 'TEAM':
            # For team tournaments, use player1_score and player2_score fields
            if 'team1_score' in data:
                match.player1_score = data['team1_score']
            if 'team2_score' in data:
                match.player2_score = data['team2_score']
            
            # Set winner
            if 'winner_id' in data:
                try:
                    from teams.models import Team
                    winner_team = Team.objects.get(id=data['winner_id'])
                    match.winning_team = winner_team
                except Team.DoesNotExist:
                    return Response({
                        'error': 'Winner team not found'
                    }, status=status.HTTP_400_BAD_REQUEST)
        else:
            # For individual tournaments
            if 'player1_score' in data:
                match.player1_score = data['player1_score']
            if 'player2_score' in data:
                match.player2_score = data['player2_score']
            
            # Set winner
            if 'winner_id' in data:
                try:
                    from accounts.models import CustomUser
                    winner_player = CustomUser.objects.get(id=data['winner_id'])
                    match.winner = winner_player
                except CustomUser.DoesNotExist:
                    return Response({
                        'error': 'Winner player not found'
                    }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update match status
        match.status = 'COMPLETED'
        match.save()
        
        # Try to advance winner to next round
        try:
            from teams.services.match_scorer import MatchScorer
            print(f"Attempting to advance winner from Match {match.match_number} (Round {match.round_number})")
            print(f"Tournament type: {tournament.tournament_type}, Registration type: {tournament.registration_type}")
            print(f"Match status: {match.status}")
            if tournament.registration_type == 'TEAM':
                print(f"Winning team: {match.winning_team}")
            else:
                print(f"Winner: {match.winner}")
            MatchScorer._advance_winner_to_next_round(match)
            print("Winner advancement completed successfully")
        except Exception as e:
            # Log the error but don't fail the request
            print(f"Error advancing winner: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # Return updated match data
        serializer = MatchSerializer(match)
        return Response({
            'message': 'Match result updated successfully',
            'match': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to update match result: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MatchViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Match.objects.all().order_by('round_number', 'match_number')
    serializer_class = MatchSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['post'])
    def submit_result(self, request, pk=None):
        """
        Submit match result with player statistics for league tournaments.
        
        Request body:
        {
            "home_score": 3,
            "away_score": 2,
            "player_stats": [
                {"player_id": "uuid", "goals": 2, "assists": 1},
                {"player_id": "uuid", "goals": 1, "assists": 0},
                ...
            ]
        }
        """
        match = self.get_object()
        tournament = match.tournament
        
        # Check if user is the organizer
        if request.user != tournament.organizer:
            return Response({
                'error': 'Only tournament organizers can submit match results'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Validate tournament type
        if tournament.tournament_type != 'league':
            return Response({
                'error': 'Player statistics submission is only available for league tournaments'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get data from request
        home_score = request.data.get('home_score')
        away_score = request.data.get('away_score')
        player_stats = request.data.get('player_stats', [])
        
        # Validate scores are provided
        if home_score is None or away_score is None:
            return Response({
                'error': 'Both home_score and away_score are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate scores are non-negative integers
        try:
            home_score = int(home_score)
            away_score = int(away_score)
            if home_score < 0 or away_score < 0:
                return Response({
                    'error': 'Scores must be non-negative integers'
                }, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({
                'error': 'Scores must be valid integers'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get teams from match
        home_team = match.team1
        away_team = match.team2
        
        if not home_team or not away_team:
            return Response({
                'error': 'Match does not have both teams assigned'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate player statistics
        from teams.models import TeamMembership
        from tournaments.models import PlayerMatchStats
        
        home_goals_sum = 0
        away_goals_sum = 0
        validated_stats = []
        seen_players = set()  # Track players to prevent duplicates
        
        for stat in player_stats:
            player_id = stat.get('player_id')
            goals = stat.get('goals', 0)
            assists = stat.get('assists', 0)
            
            if not player_id:
                return Response({
                    'error': 'Each player stat must include player_id'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check for duplicate player entries
            if player_id in seen_players:
                return Response({
                    'error': f'Duplicate statistics entry for player {player_id}. Each player can only have one statistics entry per match.'
                }, status=status.HTTP_400_BAD_REQUEST)
            seen_players.add(player_id)
            
            # Validate goals and assists are non-negative
            try:
                goals = int(goals)
                assists = int(assists)
                if goals < 0 or assists < 0:
                    return Response({
                        'error': 'Goals and assists must be non-negative integers'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({
                    'error': 'Goals and assists must be valid integers'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Skip if both goals and assists are 0
            if goals == 0 and assists == 0:
                continue
            
            # Validate player exists
            try:
                player = CustomUser.objects.get(id=player_id, role='PLAYER')
            except CustomUser.DoesNotExist:
                return Response({
                    'error': f'Player with ID {player_id} not found or is not a player'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check if player belongs to one of the teams
            is_home_player = TeamMembership.objects.filter(
                team=home_team,
                player=player,
                is_active=True
            ).exists()
            
            is_away_player = TeamMembership.objects.filter(
                team=away_team,
                player=player,
                is_active=True
            ).exists()
            
            if not is_home_player and not is_away_player:
                return Response({
                    'error': f'Player {player.full_name} is not a member of either team in this match. Players must belong to one of the competing teams.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Ensure player is not on both teams (should not happen, but validate)
            if is_home_player and is_away_player:
                return Response({
                    'error': f'Player {player.full_name} cannot be a member of both teams'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Add goals to appropriate team total
            if is_home_player:
                home_goals_sum += goals
            elif is_away_player:
                away_goals_sum += goals
            
            validated_stats.append({
                'player': player,
                'goals': goals,
                'assists': assists
            })
        
        # Validate sum of player goals equals team scores
        if home_goals_sum != home_score:
            return Response({
                'error': f'Sum of home team player goals ({home_goals_sum}) must equal home team score ({home_score})'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if away_goals_sum != away_score:
            return Response({
                'error': f'Sum of away team player goals ({away_goals_sum}) must equal away team score ({away_score})'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update match with scores
        match.player1_score = home_score  # For team tournaments, team scores are stored in player score fields
        match.player2_score = away_score
        match.status = 'COMPLETED'
        
        # Determine winner
        if home_score > away_score:
            match.winning_team = home_team
        elif away_score > home_score:
            match.winning_team = away_team
        # else: draw, no winner
        
        match.save()
        
        # Delete existing player stats for this match (if updating)
        PlayerMatchStats.objects.filter(match=match).delete()
        
        # Create player statistics records
        player_stats_objects = []
        for stat in validated_stats:
            player_stats_objects.append(
                PlayerMatchStats(
                    player=stat['player'],
                    match=match,
                    goals=stat['goals'],
                    assists=stat['assists']
                )
            )
        
        if player_stats_objects:
            PlayerMatchStats.objects.bulk_create(player_stats_objects)
        
        # Trigger standings recalculation (happens automatically on next request)
        # The standings calculator reads from completed matches
        
        return Response({
            'message': 'Match result submitted successfully',
            'match_id': str(match.id),
            'home_score': home_score,
            'away_score': away_score,
            'player_stats_count': len(player_stats_objects),
            'status': 'COMPLETED'
        }, status=status.HTTP_200_OK)


class PlayerStatsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for player statistics in league tournaments.
    Provides endpoints for viewing aggregated player statistics.
    """
    permission_classes = [IsAuthenticated]
    
    # No default queryset since we use custom actions
    queryset = CustomUser.objects.none()
    
    @action(detail=False, methods=['get'])
    def my_stats(self, request):
        """
        Get authenticated player's statistics across all league tournaments.
        
        Query params:
        - tournament_id (optional): Filter stats by specific tournament
        """
        player = request.user
        
        if player.role != 'PLAYER':
            return Response({
                'error': 'Only players can view their statistics'
            }, status=status.HTTP_403_FORBIDDEN)
        
        tournament_id = request.query_params.get('tournament_id')
        
        try:
            from tournaments.services.player_stats_aggregator import PlayerStatsAggregator
            
            aggregator = PlayerStatsAggregator()
            stats = aggregator.get_player_stats(
                player_id=str(player.id),
                tournament_id=tournament_id
            )
            
            # Format rank display
            rank_suffix = self._get_ordinal_suffix(stats.rank)
            rank_display = f"{stats.rank}{rank_suffix} out of {stats.total_players} players"
            
            return Response({
                'player_id': stats.player_id,
                'player_name': stats.player_name,
                'team_name': stats.team_name,
                'goals': stats.goals,
                'assists': stats.assists,
                'rank': stats.rank,
                'rank_display': rank_display,
                'total_players': stats.total_players
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Failed to get player statistics: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def tournament_stats(self, request):
        """
        Get player stats for a specific tournament.
        
        Query params:
        - tournament_id (required): Tournament to get stats for
        - player_id (optional): Specific player ID (defaults to authenticated user)
        """
        tournament_id = request.query_params.get('tournament_id')
        
        if not tournament_id:
            return Response({
                'error': 'tournament_id query parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get player ID (default to authenticated user)
        player_id = request.query_params.get('player_id', str(request.user.id))
        
        # If requesting another player's stats, allow it (public information)
        
        try:
            from tournaments.services.player_stats_aggregator import PlayerStatsAggregator
            
            aggregator = PlayerStatsAggregator()
            stats = aggregator.get_player_stats(
                player_id=player_id,
                tournament_id=tournament_id
            )
            
            # Format rank display
            rank_suffix = self._get_ordinal_suffix(stats.rank)
            rank_display = f"{stats.rank}{rank_suffix} out of {stats.total_players} players"
            
            return Response({
                'tournament_id': tournament_id,
                'player_id': stats.player_id,
                'player_name': stats.player_name,
                'team_name': stats.team_name,
                'goals': stats.goals,
                'assists': stats.assists,
                'rank': stats.rank,
                'rank_display': rank_display,
                'total_players': stats.total_players
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Failed to get tournament statistics: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_ordinal_suffix(self, number: int) -> str:
        """
        Get ordinal suffix for a number (1st, 2nd, 3rd, 4th, etc.)
        
        Args:
            number: The number to get suffix for
            
        Returns:
            Ordinal suffix string ('st', 'nd', 'rd', or 'th')
        """
        if 10 <= number % 100 <= 20:
            return 'th'
        else:
            suffix_map = {1: 'st', 2: 'nd', 3: 'rd'}
            return suffix_map.get(number % 10, 'th')



class RefereeBookingViewSet(viewsets.ModelViewSet):
    queryset = RefereeBooking.objects.all()
    serializer_class = RefereeBookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'REFEREE':
            return RefereeBooking.objects.filter(referee=self.request.user)
        elif self.request.user.role == 'ORGANIZER':
            return RefereeBooking.objects.filter(requested_by=self.request.user)
        return RefereeBooking.objects.none()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tournament_participants(request, tournament_id):
    """Get participants for a tournament"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can view participants'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get status filter from query params
    status_filter = request.query_params.get('status', None)
    
    participants = []
    status_counts = {}
    
    if tournament.registration_type == 'TEAM':
        # Handle team registrations
        from teams.models import TeamTournamentRegistration
        
        team_registrations = TeamTournamentRegistration.objects.filter(
            tournament=tournament
        ).select_related('team', 'registered_by').prefetch_related('selected_players')
        
        if status_filter:
            # Map status filter to team registration status
            team_status_map = {
                'PENDING': 'PENDING',
                'ACCEPTED': 'CONFIRMED',
                'REJECTED': 'CANCELLED'
            }
            mapped_status = team_status_map.get(status_filter.upper())
            if mapped_status:
                team_registrations = team_registrations.filter(status=mapped_status)
        
        for registration in team_registrations:
            # Map team registration status to participant status
            participant_status = 'PENDING'
            if registration.status == 'CONFIRMED':
                participant_status = 'ACCEPTED'
            elif registration.status == 'CANCELLED':
                participant_status = 'REJECTED'
            
            # Get selected players for this team
            selected_players = []
            for player in registration.selected_players.all():
                selected_players.append({
                    'id': str(player.id),
                    'full_name': player.full_name,
                    'email': player.email,
                    'profile_picture': player.profile_picture.url if player.profile_picture else None,
                    'skill_level': player.skill_level
                })
            
            participants.append({
                'id': str(registration.id),
                'type': 'team',
                'team': {
                    'id': str(registration.team.id),
                    'name': registration.team.name,
                    'sport_types': registration.team.sport_types,
                    'member_count': registration.team.member_count
                },
                'registered_by': {
                    'id': str(registration.registered_by.id),
                    'full_name': registration.registered_by.full_name,
                    'email': registration.registered_by.email
                },
                'selected_players': selected_players,
                'selected_player_count': len(selected_players),
                'status': participant_status,
                'registration_date': registration.registered_at,
                'notes': f'Team registration by {registration.registered_by.full_name}',
                'payment_status': 'paid'  # Simplified for now
            })
        
        # Calculate status counts for teams
        status_counts = {
            'pending': TeamTournamentRegistration.objects.filter(tournament=tournament, status='PENDING').count(),
            'accepted': TeamTournamentRegistration.objects.filter(tournament=tournament, status='CONFIRMED').count(),
            'rejected': TeamTournamentRegistration.objects.filter(tournament=tournament, status='CANCELLED').count(),
            'total': TeamTournamentRegistration.objects.filter(tournament=tournament).count()
        }
        
    else:
        # Handle individual registrations
        registrations = TournamentRegistration.objects.filter(tournament=tournament).select_related('player')
        
        if status_filter:
            registrations = registrations.filter(status=status_filter.upper())
        
        for registration in registrations:
            participants.append({
                'id': str(registration.id),
                'type': 'individual',
                'user': {
                    'id': str(registration.player.id),
                    'full_name': registration.player.full_name,
                    'email': registration.player.email,
                    'profile_picture': registration.player.profile_picture.url if registration.player.profile_picture else None,
                    'skill_level': registration.player.skill_level
                },
                'status': registration.status,
                'registration_date': registration.registered_at,
                'notes': registration.notes,
                'payment_status': 'paid'  # Simplified for now
            })
        
        # Calculate status counts for individuals
        status_counts = {
            'pending': TournamentRegistration.objects.filter(tournament=tournament, status='PENDING').count(),
            'accepted': TournamentRegistration.objects.filter(tournament=tournament, status='ACCEPTED').count(),
            'rejected': TournamentRegistration.objects.filter(tournament=tournament, status='REJECTED').count(),
            'total': TournamentRegistration.objects.filter(tournament=tournament).count()
        }
    
    return Response({
        'participants': participants,
        'status_counts': status_counts,
        'max_participants': tournament.max_participants,
        'registration_type': tournament.registration_type
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tournament_referees(request, tournament_id):
    """Get referee assignments for a tournament"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can view referee assignments'}, status=status.HTTP_403_FORBIDDEN)
    
    referee_bookings = RefereeBooking.objects.filter(tournament=tournament).select_related('referee')
    referees = []
    
    for booking in referee_bookings:
        referees.append({
            'id': str(booking.id),
            'referee': {
                'id': str(booking.referee.id),
                'full_name': booking.referee.full_name,
                'email': booking.referee.email
            },
            'match_date': booking.match_date,
            'fee': float(booking.fee) if booking.fee else 0.0,
            'status': booking.status
        })
    
    return Response(referees, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tournament_matches(request, tournament_id):
    """Get all matches for a tournament"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Get all matches for this tournament
    matches = Match.objects.filter(tournament=tournament).select_related(
        'team1', 'team2', 'winner', 'winning_team'
    ).order_by('round_number', 'match_number')
    
    serializer = MatchSerializer(matches, many=True)
    
    return Response({
        'matches': serializer.data,
        'total_matches': matches.count()
    }, status=status.HTTP_200_OK)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_tournament_participant(request, tournament_id, participant_id):
    """Remove a participant from a tournament"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can remove participants'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        registration = TournamentRegistration.objects.get(id=participant_id, tournament=tournament)
        registration.delete()
        return Response({'message': 'Participant removed successfully'}, status=status.HTTP_200_OK)
    except TournamentRegistration.DoesNotExist:
        return Response({'error': 'Participant not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_tournament_referee(request, tournament_id, referee_id):
    """Remove a referee assignment from a tournament"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can remove referee assignments'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        referee_booking = RefereeBooking.objects.get(id=referee_id, tournament=tournament)
        referee_booking.delete()
        return Response({'message': 'Referee assignment removed successfully'}, status=status.HTTP_200_OK)
    except RefereeBooking.DoesNotExist:
        return Response({'error': 'Referee assignment not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def accept_tournament_participant(request, tournament_id, participant_id):
    """Accept a participant's registration for a tournament"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can accept participants'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        registration = TournamentRegistration.objects.get(id=participant_id, tournament=tournament)
        
        # Check if tournament is full
        accepted_count = TournamentRegistration.objects.filter(
            tournament=tournament, 
            status='ACCEPTED'
        ).count()
        
        if accepted_count >= tournament.max_participants:
            return Response({'error': 'Tournament is already full'}, status=status.HTTP_400_BAD_REQUEST)
        
        registration.status = 'ACCEPTED'
        registration.save()
        
        return Response({
            'message': f'Participant {registration.player.full_name} accepted successfully',
            'participant': {
                'id': str(registration.id),
                'user': {
                    'id': str(registration.player.id),
                    'full_name': registration.player.full_name,
                    'email': registration.player.email
                },
                'status': registration.status,
                'registration_date': registration.registered_at
            }
        }, status=status.HTTP_200_OK)
        
    except TournamentRegistration.DoesNotExist:
        return Response({'error': 'Participant registration not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def reject_tournament_participant(request, tournament_id, participant_id):
    """Reject a participant's registration for a tournament"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can reject participants'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        registration = TournamentRegistration.objects.get(id=participant_id, tournament=tournament)
        
        registration.status = 'REJECTED'
        registration.notes = request.data.get('reason', 'No reason provided')
        registration.save()
        
        return Response({
            'message': f'Participant {registration.player.full_name} rejected successfully',
            'participant': {
                'id': str(registration.id),
                'user': {
                    'id': str(registration.player.id),
                    'full_name': registration.player.full_name,
                    'email': registration.player.email
                },
                'status': registration.status,
                'registration_date': registration.registered_at,
                'rejection_reason': registration.notes
            }
        }, status=status.HTTP_200_OK)
        
    except TournamentRegistration.DoesNotExist:
        return Response({'error': 'Participant registration not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_accept_participants(request, tournament_id):
    """Accept multiple participants at once"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can accept participants'}, status=status.HTTP_403_FORBIDDEN)
    
    participant_ids = request.data.get('participant_ids', [])
    if not participant_ids:
        return Response({'error': 'No participant IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Check current accepted count
        accepted_count = TournamentRegistration.objects.filter(
            tournament=tournament, 
            status='ACCEPTED'
        ).count()
        
        # Check if accepting all would exceed limit
        if accepted_count + len(participant_ids) > tournament.max_participants:
            return Response({
                'error': f'Cannot accept {len(participant_ids)} participants. Only {tournament.max_participants - accepted_count} spots remaining.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update registrations
        updated_registrations = TournamentRegistration.objects.filter(
            id__in=participant_ids,
            tournament=tournament,
            status='PENDING'
        )
        
        updated_count = updated_registrations.update(status='ACCEPTED')
        
        return Response({
            'message': f'Successfully accepted {updated_count} participants',
            'accepted_count': updated_count,
            'total_accepted': accepted_count + updated_count
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_reject_participants(request, tournament_id):
    """Reject multiple participants at once"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can reject participants'}, status=status.HTTP_403_FORBIDDEN)
    
    participant_ids = request.data.get('participant_ids', [])
    rejection_reason = request.data.get('reason', 'Bulk rejection - no specific reason provided')
    
    if not participant_ids:
        return Response({'error': 'No participant IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Update registrations
        updated_registrations = TournamentRegistration.objects.filter(
            id__in=participant_ids,
            tournament=tournament,
            status='PENDING'
        )
        
        updated_count = updated_registrations.update(
            status='REJECTED',
            notes=rejection_reason
        )
        
        return Response({
            'message': f'Successfully rejected {updated_count} participants',
            'rejected_count': updated_count,
            'reason': rejection_reason
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Team Tournament Registration Endpoints

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_team_for_tournament(request, tournament_id):
    """Register a team for a tournament"""
    try:
        from teams.models import Team, TeamMembership, TeamTournamentRegistration
        from teams.services.tournament_validator import TournamentValidator
        from accounts.models import CustomUser
        
        tournament = get_object_or_404(Tournament, id=tournament_id)
        
        # Validate tournament supports team registration
        if tournament.registration_type != 'TEAM':
            return Response({
                'error': 'This tournament only accepts individual registrations'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get team ID and selected players from request
        team_id = request.data.get('team_id')
        selected_player_ids = request.data.get('selected_players', [])
        
        if not team_id:
            return Response({
                'error': 'Team ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not selected_player_ids:
            return Response({
                'error': 'Selected players are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get team and validate user can register it
        try:
            team = Team.objects.get(id=team_id, is_active=True)
        except Team.DoesNotExist:
            return Response({
                'error': 'Team not found or inactive'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user can register this team (must be owner or leader)
        try:
            membership = TeamMembership.objects.get(
                team=team,
                player=request.user,
                is_active=True
            )
            if not membership.can_register_for_tournaments():
                return Response({
                    'error': 'Only team owners and leaders can register teams for tournaments'
                }, status=status.HTTP_403_FORBIDDEN)
        except TeamMembership.DoesNotExist:
            return Response({
                'error': 'You are not a member of this team'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if team is already registered
        if TeamTournamentRegistration.objects.filter(tournament=tournament, team=team).exists():
            return Response({
                'error': 'Team is already registered for this tournament'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate tournament is open for registration
        if not tournament.is_registration_open:
            return Response({
                'error': 'Tournament registration is closed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate team composition using TournamentValidator
        validator = TournamentValidator()
        validation_result = validator.validate_team_composition(team, tournament)
        
        if not validation_result.is_valid:
            return Response({
                'error': '; '.join(validation_result.errors)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate selected players
        try:
            selected_players = CustomUser.objects.filter(
                id__in=selected_player_ids,
                role='PLAYER'
            )
        except ValueError as e:
            return Response({
                'error': f'Invalid player ID format: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if selected_players.count() != len(selected_player_ids):
            return Response({
                'error': 'Some selected players were not found'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate all selected players are team members
        team_member_ids = set(
            TeamMembership.objects.filter(
                team=team,
                is_active=True
            ).values_list('player_id', flat=True)
        )
        
        # Convert selected_player_ids to UUID objects for comparison
        try:
            selected_player_uuids = set()
            for pid in selected_player_ids:
                if isinstance(pid, str):
                    selected_player_uuids.add(uuid.UUID(pid))
                else:
                    selected_player_uuids.add(pid)
        except ValueError as e:
            return Response({
                'error': f'Invalid UUID format in selected players: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not selected_player_uuids.issubset(team_member_ids):
            return Response({
                'error': 'All selected players must be active team members'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if any selected players are already registered for this tournament with another team
        existing_registrations = TeamTournamentRegistration.objects.filter(
            tournament=tournament
        ).prefetch_related('selected_players')
        
        already_registered_players = []
        for reg in existing_registrations:
            for player in reg.selected_players.all():
                if player.id in selected_player_uuids:
                    already_registered_players.append({
                        'player_name': player.full_name,
                        'team_name': reg.team.name
                    })
        
        if already_registered_players:
            player_details = ', '.join([
                f"{p['player_name']} (already with {p['team_name']})" 
                for p in already_registered_players
            ])
            return Response({
                'error': f'The following players are already registered for this tournament with another team: {player_details}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create team tournament registration
        registration = TeamTournamentRegistration.objects.create(
            tournament=tournament,
            team=team,
            registered_by=request.user,
            status='PENDING'
        )
        
        # Add selected players
        registration.selected_players.set(selected_players)
        
        # Record activity history
        from teams.models import ActivityHistory
        ActivityHistory.objects.create(
            team=team,
            event_type='TOURNAMENT_REGISTERED',
            description=f'Team registered for tournament: {tournament.title}',
            performed_by=request.user,
            metadata={
                'tournament_id': str(tournament.id),
                'tournament_title': tournament.title,
                'selected_players': len(selected_player_ids)
            }
        )
        
        return Response({
            'message': 'Team registered successfully. Awaiting organizer approval.',
            'registration_id': str(registration.id),
            'tournament': tournament.title,
            'team': team.name,
            'selected_players': len(selected_player_ids),
            'status': 'PENDING'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': f'Registration failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def team_available_tournaments(request, team_id):
    """Get available tournaments for a specific team"""
    try:
        from teams.models import Team, TeamMembership, TeamTournamentRegistration
        from django.utils import timezone
        
        # Get team and validate user access
        try:
            team = Team.objects.get(id=team_id, is_active=True)
        except Team.DoesNotExist:
            return Response({
                'error': 'Team not found or inactive'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a member of this team
        try:
            TeamMembership.objects.get(
                team=team,
                player=request.user,
                is_active=True
            )
        except TeamMembership.DoesNotExist:
            return Response({
                'error': 'You are not a member of this team'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get tournaments that:
        # 1. Accept team registration
        # 2. Match team's sport types
        # 3. Are open for registration
        # 4. Team is not already registered for
        
        # Get already registered tournament IDs
        registered_tournament_ids = TeamTournamentRegistration.objects.filter(
            team=team
        ).values_list('tournament_id', flat=True)
        
        # Filter tournaments
        available_tournaments = Tournament.objects.filter(
            registration_type='TEAM',
            sport_type__in=team.sport_types,
            status='UPCOMING',
            registration_deadline__gt=timezone.now()
        ).exclude(
            id__in=registered_tournament_ids
        ).order_by('date', 'start_time')
        
        # Apply additional filters from query params
        sport_filter = request.query_params.get('sport_type')
        if sport_filter:
            available_tournaments = available_tournaments.filter(sport_type=sport_filter)
        
        # Serialize tournaments
        serializer = TournamentSerializer(
            available_tournaments, 
            many=True, 
            context={'request': request}
        )
        
        return Response({
            'team': {
                'id': str(team.id),
                'name': team.name,
                'sport_types': team.sport_types
            },
            'available_tournaments': serializer.data,
            'total_count': available_tournaments.count()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to fetch available tournaments: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tournament_registered_players(request, tournament_id):
    """Get all players already registered for a tournament across all teams"""
    try:
        from teams.models import TeamTournamentRegistration
        
        # Get tournament
        try:
            tournament = Tournament.objects.get(id=tournament_id)
        except Tournament.DoesNotExist:
            return Response({
                'error': 'Tournament not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get all team registrations for this tournament
        team_registrations = TeamTournamentRegistration.objects.filter(
            tournament=tournament
        ).prefetch_related('selected_players', 'team')
        
        # Collect all registered players with their team info
        registered_players = []
        player_ids_set = set()
        
        for registration in team_registrations:
            for player in registration.selected_players.all():
                if player.id not in player_ids_set:
                    player_ids_set.add(player.id)
                    registered_players.append({
                        'player_id': str(player.id),
                        'player_name': player.full_name,
                        'player_email': player.email,
                        'team_id': str(registration.team.id),
                        'team_name': registration.team.name,
                        'registration_status': registration.status
                    })
        
        return Response({
            'tournament_id': str(tournament.id),
            'tournament_title': tournament.title,
            'registered_players': registered_players,
            'total_players': len(registered_players)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to fetch registered players: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_tournament_bracket(request, tournament_id):
    """Generate tournament bracket for a tournament"""
    try:
        tournament = get_object_or_404(Tournament, id=tournament_id)
        
        # Check if user is the organizer
        if request.user != tournament.organizer:
            return Response({
                'error': 'Only tournament organizers can generate brackets'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if tournament has enough participants
        if tournament.registration_type == 'INDIVIDUAL':
            accepted_registrations = TournamentRegistration.objects.filter(
                tournament=tournament,
                status='ACCEPTED'
            )
            participant_count = accepted_registrations.count()
            participants = [reg.player for reg in accepted_registrations]
        else:  # TEAM registration
            from teams.models import TeamTournamentRegistration
            accepted_registrations = TeamTournamentRegistration.objects.filter(
                tournament=tournament,
                status='CONFIRMED'
            )
            participant_count = accepted_registrations.count()
            participants = [reg.team for reg in accepted_registrations]
        
        if participant_count < tournament.min_participants:
            return Response({
                'error': f'Not enough participants. Minimum required: {tournament.min_participants}, current: {participant_count}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if bracket already exists
        existing_matches = Match.objects.filter(tournament=tournament)
        if existing_matches.exists():
            return Response({
                'error': 'Tournament bracket already exists. Delete existing matches first if you want to regenerate.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate bracket - supports knockout and single elimination
        if tournament.tournament_type in ['SINGLE_ELIMINATION', 'knockout']:
            matches = generate_single_elimination_bracket(tournament, participants)
        elif tournament.tournament_type == 'league':
            return Response({
                'error': 'League tournaments use round-robin scheduling. Use the generate schedule endpoint instead.'
            }, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({
                'error': f'Tournament type {tournament.tournament_type} is not supported.'
            }, status=status.HTTP_501_NOT_IMPLEMENTED)
        
        # Update tournament status
        tournament.status = 'ONGOING'
        tournament.save()
        
        return Response({
            'message': 'Tournament bracket generated successfully',
            'tournament_id': str(tournament.id),
            'tournament_type': tournament.tournament_type,
            'participant_count': participant_count,
            'matches_created': len(matches),
            'status': 'ONGOING'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': f'Failed to generate bracket: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def generate_single_elimination_bracket(tournament, participants):
    """Generate single elimination bracket following proper power-of-2 structure"""
    import random
    from datetime import timedelta
    from django.utils import timezone
    import math
    
    # Shuffle participants for random seeding
    participants_list = list(participants)
    random.shuffle(participants_list)
    
    participant_count = len(participants_list)
    
    # Calculate the bracket structure based on power of 2
    next_power_of_2 = 2 ** math.ceil(math.log2(participant_count))
    byes_needed = next_power_of_2 - participant_count
    
    print(f"Participants: {participant_count}, Next power of 2: {next_power_of_2}, Byes needed: {byes_needed}")
    
    # Create bracket structure following standard tournament format
    matches = []
    match_number = 1
    
    # Calculate how many rounds we need
    total_rounds = math.ceil(math.log2(next_power_of_2))
    
    # FIXED: Proper bracket generation
    # For power of 2 participants (2, 4, 8, 16, etc.), no BYEs needed
    # For non-power of 2, calculate how many teams must play in round 1
    
    round_number = 1
    
    if byes_needed == 0:
        # Perfect power of 2 - all teams play in round 1
        first_round_matches = participant_count // 2
        print(f"Perfect bracket: {participant_count} teams, {first_round_matches} matches in round 1")
        
        for i in range(first_round_matches):
            participant1 = participants_list[i * 2]
            participant2 = participants_list[i * 2 + 1]
            
            # Calculate match time
            match_time_offset = timedelta(hours=(match_number - 1) * 1.5)
            match_time = timezone.make_aware(
                timezone.datetime.combine(tournament.date, tournament.start_time)
            ) + match_time_offset
            
            # Create the match
            if tournament.registration_type == 'INDIVIDUAL':
                match = Match.objects.create(
                    tournament=tournament,
                    round_number=round_number,
                    match_number=match_number,
                    player1=participant1,
                    player2=participant2,
                    scheduled_time=match_time,
                    status='SCHEDULED'
                )
            else:  # TEAM
                match = Match.objects.create(
                    tournament=tournament,
                    round_number=round_number,
                    match_number=match_number,
                    team1=participant1,
                    team2=participant2,
                    scheduled_time=match_time,
                    status='SCHEDULED'
                )
            
            matches.append(match)
            match_number += 1
    else:
        # Non-power of 2 - need BYEs
        # Calculate: how many teams must play to reduce to next_power_of_2/2?
        # Example: 6 teams -> next power = 8, need 4 teams in round 2
        # So 2 teams get BYE, 4 teams play (2 matches)
        teams_in_round_2 = next_power_of_2 // 2
        teams_that_must_play = (participant_count - teams_in_round_2) * 2
        
        teams_playing = participants_list[:teams_that_must_play]
        teams_with_bye = participants_list[teams_that_must_play:]
        
        print(f"BYE bracket: {len(teams_playing)} teams play in R1, {len(teams_with_bye)} teams get BYE")
        print(f"After R1: {len(teams_playing)//2} winners + {len(teams_with_bye)} BYE teams = {teams_in_round_2} teams in R2")
        
        # Create matches for teams that play
        for i in range(0, len(teams_playing), 2):
            participant1 = teams_playing[i]
            participant2 = teams_playing[i + 1]
            
            # Calculate match time
            match_time_offset = timedelta(hours=(match_number - 1) * 1.5)
            match_time = timezone.make_aware(
                timezone.datetime.combine(tournament.date, tournament.start_time)
            ) + match_time_offset
            
            # Create the match
            if tournament.registration_type == 'INDIVIDUAL':
                match = Match.objects.create(
                    tournament=tournament,
                    round_number=round_number,
                    match_number=match_number,
                    player1=participant1,
                    player2=participant2,
                    scheduled_time=match_time,
                    status='SCHEDULED'
                )
            else:  # TEAM
                match = Match.objects.create(
                    tournament=tournament,
                    round_number=round_number,
                    match_number=match_number,
                    team1=participant1,
                    team2=participant2,
                    scheduled_time=match_time,
                    status='SCHEDULED'
                )
            
            matches.append(match)
            match_number += 1
        
        # Create BYE matches for teams that advance automatically
        for team in teams_with_bye:
            match_time_offset = timedelta(hours=(match_number - 1) * 1.5)
            match_time = timezone.make_aware(
                timezone.datetime.combine(tournament.date, tournament.start_time)
            ) + match_time_offset
            
            if tournament.registration_type == 'INDIVIDUAL':
                match = Match.objects.create(
                    tournament=tournament,
                    round_number=round_number,
                    match_number=match_number,
                    player1=team,
                    player2=None,
                    scheduled_time=match_time,
                    status='COMPLETED',
                    notes='BYE',
                    winner=team
                )
            else:  # TEAM
                match = Match.objects.create(
                    tournament=tournament,
                    round_number=round_number,
                    match_number=match_number,
                    team1=team,
                    team2=None,
                    scheduled_time=match_time,
                    status='COMPLETED',
                    notes='BYE',
                    winning_team=team
                )
            
            matches.append(match)
            match_number += 1
    
    print(f"Created {len(matches)} matches in round 1")
    
    # Generate subsequent rounds (empty placeholders)
    current_round_matches_count = len(matches)
    
    while current_round_matches_count > 1:
        round_number += 1
        matches_in_this_round = current_round_matches_count // 2
        
        print(f"Round {round_number}: Creating {matches_in_this_round} matches")
        
        for i in range(matches_in_this_round):
            match_time_offset = timedelta(hours=(match_number - 1) * 1.5)
            match_time = timezone.make_aware(
                timezone.datetime.combine(tournament.date, tournament.start_time)
            ) + match_time_offset
            
            if tournament.registration_type == 'INDIVIDUAL':
                match = Match.objects.create(
                    tournament=tournament,
                    round_number=round_number,
                    match_number=match_number,
                    scheduled_time=match_time,
                    status='SCHEDULED',
                    notes='Winners from previous round will be assigned'
                )
            else:
                match = Match.objects.create(
                    tournament=tournament,
                    round_number=round_number,
                    match_number=match_number,
                    scheduled_time=match_time,
                    status='SCHEDULED',
                    notes='Winners from previous round will be assigned'
                )
            
            matches.append(match)
            match_number += 1
            
        current_round_matches_count = matches_in_this_round
    
    # Auto-advance winners from BYE matches to next round
    if byes_needed > 0:
        from teams.services.match_scorer import MatchScorer
        print("Auto-advancing BYE winners...")
        for m in matches:
            if m.round_number == 1 and m.notes == 'BYE':
                try:
                    MatchScorer._advance_winner_to_next_round(m)
                    print(f"Advanced BYE winner from match {m.match_number}")
                except Exception as e:
                    print(f"Failed to advance BYE match {m.match_number}: {e}")
    
    print(f"Created {len(matches)} matches across {round_number} rounds")
    print(f"Round structure: {[len([m for m in matches if m.round_number == r]) for r in range(1, round_number + 1)]}")
    
    return matches




@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def accept_team_participant(request, tournament_id, registration_id):
    """Accept a team's registration for a tournament"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can accept team participants'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        from teams.models import TeamTournamentRegistration
        
        registration = TeamTournamentRegistration.objects.get(id=registration_id, tournament=tournament)
        
        # Check if tournament is full
        accepted_count = TeamTournamentRegistration.objects.filter(
            tournament=tournament, 
            status='CONFIRMED'
        ).count()
        
        if accepted_count >= tournament.max_participants:
            return Response({'error': 'Tournament is already full'}, status=status.HTTP_400_BAD_REQUEST)
        
        registration.status = 'CONFIRMED'
        registration.save()
        
        # Record activity history
        from teams.models import ActivityHistory
        ActivityHistory.objects.create(
            team=registration.team,
            event_type='TOURNAMENT_REGISTERED',
            description=f'Team accepted for tournament: {tournament.title}',
            performed_by=request.user,
            metadata={
                'tournament_id': str(tournament.id),
                'tournament_title': tournament.title,
                'status': 'CONFIRMED'
            }
        )
        
        return Response({
            'message': f'Team {registration.team.name} accepted successfully',
            'team': {
                'id': str(registration.team.id),
                'name': registration.team.name,
                'sport_types': registration.team.sport_types
            },
            'status': 'CONFIRMED',
            'registration_date': registration.registered_at,
            'selected_player_count': registration.selected_player_count
        }, status=status.HTTP_200_OK)
        
    except TeamTournamentRegistration.DoesNotExist:
        return Response({'error': 'Team registration not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def reject_team_participant(request, tournament_id, registration_id):
    """Reject a team's registration for a tournament"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can reject team participants'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        from teams.models import TeamTournamentRegistration, ActivityHistory
        
        registration = TeamTournamentRegistration.objects.get(id=registration_id, tournament=tournament)
        
        rejection_reason = request.data.get('reason', 'No reason provided')
        
        registration.status = 'CANCELLED'
        registration.save()
        
        # Record activity history
        ActivityHistory.objects.create(
            team=registration.team,
            event_type='TOURNAMENT_REGISTERED',
            description=f'Team rejected for tournament: {tournament.title}. Reason: {rejection_reason}',
            performed_by=request.user,
            metadata={
                'tournament_id': str(tournament.id),
                'tournament_title': tournament.title,
                'status': 'CANCELLED',
                'rejection_reason': rejection_reason
            }
        )
        
        return Response({
            'message': f'Team {registration.team.name} rejected successfully',
            'team': {
                'id': str(registration.team.id),
                'name': registration.team.name,
                'sport_types': registration.team.sport_types
            },
            'status': 'CANCELLED',
            'registration_date': registration.registered_at,
            'rejection_reason': rejection_reason
        }, status=status.HTTP_200_OK)
        
    except TeamTournamentRegistration.DoesNotExist:
        return Response({'error': 'Team registration not found'}, status=status.HTTP_404_NOT_FOUND)