#!/usr/bin/env python
"""Query database for all users, venues, and tournaments"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backendapi.settings')
django.setup()

from accounts.models import CustomUser
from venues.models import Venue
from tournaments.models import Tournament
from django.db.models import Count

print("=" * 80)
print("DATABASE OVERVIEW")
print("=" * 80)

# Users by Role
print("\n📊 USERS BY ROLE:")
print("-" * 80)
roles = CustomUser.objects.values('role').annotate(count=Count('id')).order_by('role')
for role in roles:
    print(f"{role['role']:15} : {role['count']:3} users")

print(f"\n{'Total Users':15} : {CustomUser.objects.count():3}")

# All Users Details
print("\n" + "=" * 80)
print("👥 ALL USERS DETAILS:")
print("=" * 80)

users = CustomUser.objects.all().order_by('role', 'full_name')
for user in users:
    verified = "✓" if user.is_verified else "✗"
    print(f"\n{user.role:12} | {verified} | {user.full_name:25}")
    print(f"             Email: {user.email}")
    print(f"             ID: {user.id}")

# Venues
print("\n" + "=" * 80)
print("🏟️  VENUES:")
print("=" * 80)
venues = Venue.objects.all().order_by('name')
print(f"Total Venues: {venues.count()}\n")
for venue in venues:
    print(f"\n{venue.name}")
    print(f"  Owner: {venue.owner.full_name} ({venue.owner.email})")
    print(f"  Sport: {venue.sport_type}")
    print(f"  Location: {venue.location}")
    print(f"  Price: NPR {venue.price_per_hour}/hour")
    print(f"  ID: {venue.id}")

# Tournaments
print("\n" + "=" * 80)
print("🏆 TOURNAMENTS:")
print("=" * 80)
tournaments = Tournament.objects.all().order_by('-date')
print(f"Total Tournaments: {tournaments.count()}\n")
for tournament in tournaments:
    print(f"\n{tournament.title}")
    print(f"  Organizer: {tournament.organizer.full_name} ({tournament.organizer.email})")
    print(f"  Sport: {tournament.sport_type}")
    print(f"  Type: {tournament.tournament_type}")
    print(f"  Date: {tournament.date} at {tournament.start_time}")
    print(f"  Status: {tournament.status}")
    print(f"  Participants: {tournament.registrations.count()}/{tournament.max_participants}")
    print(f"  Entry Fee: NPR {tournament.entry_fee}")
    print(f"  ID: {tournament.id}")

print("\n" + "=" * 80)
print("SUMMARY:")
print("=" * 80)
print(f"Total Users:       {CustomUser.objects.count()}")
print(f"Total Venues:      {Venue.objects.count()}")
print(f"Total Tournaments: {Tournament.objects.count()}")
print("=" * 80)
