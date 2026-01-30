#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backendapi.settings')
django.setup()

from teams.models import Team, TeamMembership, TeamTournamentRegistration
from tournaments.models import Tournament
from accounts.models import CustomUser
import requests
import json

def test_team_registration():
    print("=== TESTING TEAM REGISTRATION API ===\n")
    
    # Get Carlos Silva
    carlos = CustomUser.objects.filter(email='carlos.silva@arenax.com').first()
    if not carlos:
        print("Carlos Silva not found!")
        return
    
    # Get his team
    membership = TeamMembership.objects.filter(player=carlos, is_active=True).first()
    if not membership:
        print("Carlos has no team membership!")
        return
    
    team = membership.team
    print(f"Team: {team.name}")
    print(f"Team ID: {team.id}")
    
    # Get team members
    members = TeamMembership.objects.filter(team=team, is_active=True)
    print(f"Team members ({members.count()}):")
    member_ids = []
    for member in members:
        print(f"  - {member.player.full_name} ({member.player.id})")
        member_ids.append(str(member.player.id))
    
    # Get a team tournament
    tournament = Tournament.objects.filter(registration_type='TEAM', sport_type='FUTSAL').first()
    if not tournament:
        print("No FUTSAL team tournament found!")
        return
    
    print(f"\nTournament: {tournament.title}")
    print(f"Tournament ID: {tournament.id}")
    
    # Select first 5 players for registration
    selected_players = member_ids[:5]
    print(f"\nSelected players for registration: {selected_players}")
    
    # Test the registration data
    registration_data = {
        'team_id': str(team.id),
        'selected_players': selected_players
    }
    
    print(f"\nRegistration data: {json.dumps(registration_data, indent=2)}")
    
    # Check if this would pass backend validation
    from django.test import RequestFactory
    from django.contrib.auth import get_user_model
    from tournaments.views import register_team_for_tournament
    
    # Create a mock request
    factory = RequestFactory()
    request = factory.post(f'/api/tournaments/{tournament.id}/register-team/', 
                          data=json.dumps(registration_data),
                          content_type='application/json')
    request.user = carlos
    
    print("\n=== BACKEND VALIDATION TEST ===")
    print(f"Team member IDs in database: {set(TeamMembership.objects.filter(team=team, is_active=True).values_list('player_id', flat=True))}")
    print(f"Selected player IDs: {set(selected_players)}")
    
    # Check if all selected players are team members
    team_member_ids = set(TeamMembership.objects.filter(team=team, is_active=True).values_list('player_id', flat=True))
    selected_player_ids_set = set([uuid.UUID(pid) for pid in selected_players])
    
    print(f"Team member IDs (UUID): {team_member_ids}")
    print(f"Selected player IDs (UUID): {selected_player_ids_set}")
    print(f"All selected players are team members: {selected_player_ids_set.issubset(team_member_ids)}")

if __name__ == "__main__":
    import uuid
    test_team_registration()