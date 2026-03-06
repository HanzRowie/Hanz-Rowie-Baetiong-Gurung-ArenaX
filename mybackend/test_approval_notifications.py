"""
Test script to verify tournament and venue approval notifications.
Run with: python manage.py shell < test_approval_notifications.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backendapi.settings')
django.setup()

from accounts.models import CustomUser, Notification
from tournaments.models import Tournament
from venues.models import Venue
from tournaments.notification_utils import (
    send_tournament_approved_notification,
    send_tournament_rejected_notification,
    send_venue_approved_notification,
    send_venue_rejected_notification,
    send_documents_requested_notification
)
from django.utils import timezone

print("=" * 80)
print("Testing Tournament and Venue Approval Notifications")
print("=" * 80)

# Get or create test users
try:
    admin = CustomUser.objects.filter(role='ADMIN').first()
    organizer = CustomUser.objects.filter(role='ORGANIZER').first()
    venue_owner = CustomUser.objects.filter(role='VENUE_OWNER').first()
    
    if not admin:
        print("❌ No admin user found. Please create an admin user first.")
        exit(1)
    
    if not organizer:
        print("❌ No organizer user found. Please create an organizer user first.")
        exit(1)
    
    if not venue_owner:
        print("❌ No venue owner user found. Please create a venue owner user first.")
        exit(1)
    
    print(f"✓ Using admin: {admin.full_name}")
    print(f"✓ Using organizer: {organizer.full_name}")
    print(f"✓ Using venue owner: {venue_owner.full_name}")
    print()
    
    # Test 1: Tournament Approved Notification
    print("Test 1: Tournament Approved Notification")
    print("-" * 80)
    tournament = Tournament.objects.filter(organizer=organizer).first()
    if tournament:
        tournament.approval_date = timezone.now()
        tournament.save()
        
        initial_count = Notification.objects.filter(user=organizer).count()
        send_tournament_approved_notification(tournament, admin)
        final_count = Notification.objects.filter(user=organizer).count()
        
        if final_count > initial_count:
            latest_notification = Notification.objects.filter(
                user=organizer,
                notification_type='TOURNAMENT_APPROVED'
            ).latest('created_at')
            print(f"✓ Notification created successfully")
            print(f"  Type: {latest_notification.notification_type}")
            print(f"  Title: {latest_notification.title}")
            print(f"  Message: {latest_notification.message[:100]}...")
        else:
            print("❌ Notification was not created")
    else:
        print("⚠ No tournament found for testing")
    print()
    
    # Test 2: Tournament Rejected Notification
    print("Test 2: Tournament Rejected Notification")
    print("-" * 80)
    if tournament:
        initial_count = Notification.objects.filter(user=organizer).count()
        send_tournament_rejected_notification(
            tournament, 
            admin, 
            "Missing required documentation"
        )
        final_count = Notification.objects.filter(user=organizer).count()
        
        if final_count > initial_count:
            latest_notification = Notification.objects.filter(
                user=organizer,
                notification_type='TOURNAMENT_REJECTED'
            ).latest('created_at')
            print(f"✓ Notification created successfully")
            print(f"  Type: {latest_notification.notification_type}")
            print(f"  Title: {latest_notification.title}")
            print(f"  Message: {latest_notification.message[:100]}...")
        else:
            print("❌ Notification was not created")
    else:
        print("⚠ No tournament found for testing")
    print()
    
    # Test 3: Venue Approved Notification
    print("Test 3: Venue Approved Notification")
    print("-" * 80)
    venue = Venue.objects.filter(owner=venue_owner).first()
    if venue:
        venue.approval_date = timezone.now()
        venue.save()
        
        initial_count = Notification.objects.filter(user=venue_owner).count()
        send_venue_approved_notification(venue, admin)
        final_count = Notification.objects.filter(user=venue_owner).count()
        
        if final_count > initial_count:
            latest_notification = Notification.objects.filter(
                user=venue_owner,
                notification_type='VENUE_APPROVED'
            ).latest('created_at')
            print(f"✓ Notification created successfully")
            print(f"  Type: {latest_notification.notification_type}")
            print(f"  Title: {latest_notification.title}")
            print(f"  Message: {latest_notification.message[:100]}...")
        else:
            print("❌ Notification was not created")
    else:
        print("⚠ No venue found for testing")
    print()
    
    # Test 4: Venue Rejected Notification
    print("Test 4: Venue Rejected Notification")
    print("-" * 80)
    if venue:
        initial_count = Notification.objects.filter(user=venue_owner).count()
        send_venue_rejected_notification(
            venue, 
            admin, 
            "Business license is expired"
        )
        final_count = Notification.objects.filter(user=venue_owner).count()
        
        if final_count > initial_count:
            latest_notification = Notification.objects.filter(
                user=venue_owner,
                notification_type='VENUE_REJECTED'
            ).latest('created_at')
            print(f"✓ Notification created successfully")
            print(f"  Type: {latest_notification.notification_type}")
            print(f"  Title: {latest_notification.title}")
            print(f"  Message: {latest_notification.message[:100]}...")
        else:
            print("❌ Notification was not created")
    else:
        print("⚠ No venue found for testing")
    print()
    
    # Test 5: Documents Requested Notification (Tournament)
    print("Test 5: Documents Requested Notification (Tournament)")
    print("-" * 80)
    if tournament:
        initial_count = Notification.objects.filter(user=organizer).count()
        send_documents_requested_notification(
            resource=tournament,
            resource_type='tournament',
            admin_user=admin,
            requested_documents=['business_license', 'insurance_certificate']
        )
        final_count = Notification.objects.filter(user=organizer).count()
        
        if final_count > initial_count:
            latest_notification = Notification.objects.filter(
                user=organizer,
                notification_type='DOCUMENTS_REQUESTED'
            ).latest('created_at')
            print(f"✓ Notification created successfully")
            print(f"  Type: {latest_notification.notification_type}")
            print(f"  Title: {latest_notification.title}")
            print(f"  Message: {latest_notification.message[:100]}...")
        else:
            print("❌ Notification was not created")
    else:
        print("⚠ No tournament found for testing")
    print()
    
    # Test 6: Documents Requested Notification (Venue)
    print("Test 6: Documents Requested Notification (Venue)")
    print("-" * 80)
    if venue:
        initial_count = Notification.objects.filter(user=venue_owner).count()
        send_documents_requested_notification(
            resource=venue,
            resource_type='venue',
            admin_user=admin,
            requested_documents=['facility_photos', 'operating_permit']
        )
        final_count = Notification.objects.filter(user=venue_owner).count()
        
        if final_count > initial_count:
            latest_notification = Notification.objects.filter(
                user=venue_owner,
                notification_type='DOCUMENTS_REQUESTED'
            ).latest('created_at')
            print(f"✓ Notification created successfully")
            print(f"  Type: {latest_notification.notification_type}")
            print(f"  Title: {latest_notification.title}")
            print(f"  Message: {latest_notification.message[:100]}...")
        else:
            print("❌ Notification was not created")
    else:
        print("⚠ No venue found for testing")
    print()
    
    print("=" * 80)
    print("Testing Complete!")
    print("=" * 80)
    
except Exception as e:
    print(f"❌ Error during testing: {str(e)}")
    import traceback
    traceback.print_exc()
