#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backendapi.settings')
django.setup()

from teams.models import Team, TeamMembership
from tournaments.models import Tournament
from accounts.models import CustomUser

def debug_team_data():
    print("=== DEBUGGING TEAM REGISTRATION DATA ===\n")
    
    # Check if Carlos Silva exists
    carlos = CustomUser.objects.filter(email='carlos.silva@arenax.com').first()
    if not carlos:
        print("Carlos Silva not found!")
        return
    
    print(f"Carlos Silva found: {carlos.full_name} ({carlos.id})")
    
    # Find teams Carlos is in
    carlos_memberships = TeamMembership.objects.filter(player=carlos, is_active=True)
    print(f"Carlos is in {carlos_memberships.count()} teams:")
    
    for membership in carlos_memberships:
        print(f"  - {membership.team.name} ({membership.role}) - Sports: {membership.team.sport_types}")
    
    print()
    
    # Get a team tournament
    team_tournaments = Tournament.objects.filter(registration_type='TEAM')
    if not team_tournaments.exists():
        print("No team tournaments found!")
        return
    
    tournament = team_tournaments.first()
    print(f"Tournament: {tournament.title}")
    print(f"Sport: {tournament.sport_type}")
    print(f"Team size required: {tournament.team_size}")
    print()
    
    # Check if Carlos can register any team for this tournament
    eligible_teams_for_carlos = []
    for membership in carlos_memberships:
        team = membership.team
        if (tournament.sport_type in team.sport_types and 
            membership.can_register_for_tournaments() and
            team.member_count >= tournament.team_size):
            eligible_teams_for_carlos.append(team)
    
    print(f"Teams Carlos can register for {tournament.title}:")
    for team in eligible_teams_for_carlos:
        print(f"  - {team.name} (members: {team.member_count})")
        
        # Show team members
        members = TeamMembership.objects.filter(team=team, is_active=True)
        print(f"    Members:")
        for member in members[:5]:
            print(f"      - {member.player.full_name} ({member.player.id}) - {member.role}")
        if members.count() > 5:
            print(f"      ... and {members.count() - 5} more")
        print()

if __name__ == "__main__":
    debug_team_data()