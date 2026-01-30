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
import uuid

def test_registration_logic():
    print("=== TESTING TEAM REGISTRATION LOGIC ===\n")
    
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
    print(f"Team: {team.name} (ID: {team.id})")
    
    # Find an available tournament
    tournaments = Tournament.objects.filter(registration_type='TEAM', sport_type='FUTSAL')
    available_tournament = None
    
    for t in tournaments:
        existing_reg = TeamTournamentRegistration.objects.filter(tournament=t, team=team).first()
        if not existing_reg:
            available_tournament = t
            break
    
    if not available_tournament:
        print("No available tournaments!")
        return
    
    tournament = available_tournament
    print(f"Tournament: {tournament.title} (ID: {tournament.id})")
    
    # Get team members
    members = TeamMembership.objects.filter(team=team, is_active=True)
    selected_player_ids = [str(m.player.id) for m in members[:5]]
    
    print(f"Selected players: {selected_player_ids}")
    
    # Test the validation logic directly
    print("\n=== TESTING VALIDATION LOGIC ===")
    
    # 1. Validate tournament supports team registration
    if tournament.registration_type != 'TEAM':
        print("❌ Tournament doesn't support team registration")
        return
    print("✅ Tournament supports team registration")
    
    # 2. Validate user can register this team
    if not membership.can_register_for_tournaments():
        print("❌ User cannot register this team")
        return
    print("✅ User can register this team")
    
    # 3. Validate team is not already registered
    if TeamTournamentRegistration.objects.filter(tournament=tournament, team=team).exists():
        print("❌ Team is already registered")
        return
    print("✅ Team is not already registered")
    
    # 4. Validate tournament is open for registration
    if not tournament.is_registration_open:
        print("❌ Tournament registration is closed")
        return
    print("✅ Tournament registration is open")
    
    # 5. Validate selected players exist
    selected_players = CustomUser.objects.filter(
        id__in=selected_player_ids,
        role='PLAYER'
    )
    if selected_players.count() != len(selected_player_ids):
        print("❌ Some selected players were not found")
        return
    print("✅ All selected players found")
    
    # 6. Validate all selected players are team members
    team_member_ids = set(
        TeamMembership.objects.filter(
            team=team,
            is_active=True
        ).values_list('player_id', flat=True)
    )
    
    # Convert selected_player_ids to UUID objects for comparison
    selected_player_uuids = set()
    for pid in selected_player_ids:
        if isinstance(pid, str):
            selected_player_uuids.add(uuid.UUID(pid))
        else:
            selected_player_uuids.add(pid)
    
    print(f"Team member IDs: {len(team_member_ids)} members")
    print(f"Selected player IDs: {len(selected_player_uuids)} players")
    
    if not selected_player_uuids.issubset(team_member_ids):
        missing = selected_player_uuids - team_member_ids
        print(f"❌ Some selected players are not team members: {missing}")
        return
    print("✅ All selected players are team members")
    
    # 7. Create the registration (simulate)
    print("\n=== CREATING REGISTRATION ===")
    
    try:
        registration = TeamTournamentRegistration.objects.create(
            tournament=tournament,
            team=team,
            registered_by=carlos,
            status='PENDING'
        )
        
        # Add selected players
        registration.selected_players.set(selected_players)
        
        print(f"✅ Registration created successfully!")
        print(f"   Registration ID: {registration.id}")
        print(f"   Status: {registration.status}")
        print(f"   Selected players: {registration.selected_players.count()}")
        
        # Clean up - delete the test registration
        registration.delete()
        print("   (Test registration cleaned up)")
        
    except Exception as e:
        print(f"❌ Registration failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_registration_logic()