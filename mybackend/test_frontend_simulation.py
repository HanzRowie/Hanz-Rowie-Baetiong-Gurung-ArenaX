#!/usr/bin/env python
import os
import sys
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backendapi.settings')
django.setup()

from teams.models import Team, TeamMembership, TeamTournamentRegistration
from tournaments.models import Tournament
from accounts.models import CustomUser
from django.test import Client
from django.contrib.auth import authenticate

def test_frontend_simulation():
    print("=== SIMULATING FRONTEND TEAM REGISTRATION ===\n")
    
    # Get Carlos Silva and authenticate
    carlos = CustomUser.objects.filter(email='carlos.silva@arenax.com').first()
    if not carlos:
        print("Carlos Silva not found!")
        return
    
    print(f"User: {carlos.full_name} ({carlos.email})")
    
    # Create a test client and login
    client = Client()
    
    # Simulate login (you might need to adjust this based on your auth system)
    login_data = {
        'email': 'carlos.silva@arenax.com',
        'password': 'player123'
    }
    
    # Get Carlos's team
    membership = TeamMembership.objects.filter(player=carlos, is_active=True).first()
    if not membership:
        print("Carlos has no team membership!")
        return
    
    team = membership.team
    print(f"Team: {team.name} (ID: {team.id})")
    
    # Simulate the frontend API call to get team details
    print("\n=== SIMULATING FRONTEND API CALLS ===")
    
    # 1. Get team details (what frontend does when loading team members)
    print(f"1. GET /api/teams/{team.id}/")
    
    # Simulate the team serializer response
    from teams.serializers import TeamSerializer
    team_data = TeamSerializer(team).data
    print(f"Team data structure:")
    print(f"  - Team ID: {team_data['id']}")
    print(f"  - Memberships count: {len(team_data['memberships'])}")
    
    # Show the membership data structure (what frontend receives)
    print(f"  - Sample membership data:")
    if team_data['memberships']:
        sample_membership = team_data['memberships'][0]
        print(f"    - Player ID: {sample_membership['player']['id']} (type: {type(sample_membership['player']['id'])})")
        print(f"    - Player name: {sample_membership['player']['full_name']}")
        print(f"    - Role: {sample_membership['role']}")
    
    # 2. Get tournament details - find one that the team is NOT registered for
    tournaments = Tournament.objects.filter(registration_type='TEAM', sport_type='FUTSAL')
    available_tournament = None
    
    for t in tournaments:
        existing_reg = TeamTournamentRegistration.objects.filter(tournament=t, team=team).first()
        if not existing_reg:
            available_tournament = t
            break
    
    if not available_tournament:
        print("No available FUTSAL team tournaments found (team may be registered for all)!")
        
        # Show all team tournaments and their registration status
        print("\nAll FUTSAL team tournaments:")
        for t in tournaments:
            existing_reg = TeamTournamentRegistration.objects.filter(tournament=t, team=team).first()
            status = f"Registered ({existing_reg.status})" if existing_reg else "Available"
            print(f"  - {t.title}: {status}")
        return
    
    tournament = available_tournament
    print(f"\n2. Tournament: {tournament.title} (ID: {tournament.id})")
    
    # 3. Simulate team registration request (what frontend sends)
    print(f"\n3. POST /api/tournaments/{tournament.id}/register-team/")
    
    # Extract player IDs the way frontend would
    active_memberships = [m for m in team_data['memberships'] if m['is_active']]
    selected_player_ids = [m['player']['id'] for m in active_memberships[:5]]  # Select first 5
    
    registration_payload = {
        'team_id': team_data['id'],
        'selected_players': selected_player_ids
    }
    
    print(f"Registration payload:")
    print(json.dumps(registration_payload, indent=2))
    
    # Check if team is already registered
    existing_registration = TeamTournamentRegistration.objects.filter(
        tournament=tournament,
        team=team
    ).first()
    
    if existing_registration:
        print(f"⚠️  Team is already registered for this tournament!")
        print(f"   Registration status: {existing_registration.status}")
        print(f"   Registered by: {existing_registration.registered_by.full_name}")
        print(f"   Selected players: {existing_registration.selected_players.count()}")
        return
    
    # 4. Test the actual API endpoint
    print(f"\n4. Testing actual API endpoint...")
    
    # We need to authenticate the request properly
    from rest_framework.test import APIRequestFactory
    from tournaments.views import register_team_for_tournament
    
    factory = APIRequestFactory()
    request = factory.post(
        f'/api/tournaments/{tournament.id}/register-team/',
        data=registration_payload,
        format='json'
    )
    request.user = carlos
    
    try:
        response = register_team_for_tournament(request, str(tournament.id))
        print(f"Response status: {response.status_code}")
        print(f"Response data: {response.data}")
        
        if response.status_code == 201:
            print("✅ Team registration successful!")
        else:
            print("❌ Team registration failed!")
            
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_frontend_simulation()