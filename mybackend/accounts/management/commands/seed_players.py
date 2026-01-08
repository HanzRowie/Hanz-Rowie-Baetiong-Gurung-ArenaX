from django.core.management.base import BaseCommand
from accounts.models import CustomUser
from django.utils import timezone
import random

class Command(BaseCommand):
    help = 'Seeds the database with dummy players'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding players...')
        
        # Define some realistic data
        names = [
            "Aarav Sharma", "Bibek Thapa", "Chirag KC", "Dinesh Adhikari", "Elina Gurung",
            "Firoj Maharjan", "Gita Paudel", "Hari Krishna", "Ishwor Bhatta", "Jenish Rai",
            "Kiran Limbu", "Laxmi Tamang", "Manish Kartel", "Nabin Shrestha", "Oshan Magar",
            "Prakash Dahal", "Rabin Gharti", "Sujan Karki", "Sushil Nepal", "Ujwal Basnet"
        ]
        
        locations = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara", "Biratnagar", "Dharan", "Butwal"]
        skills = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"]
        sports_pool = ["Futsal", "Badminton"]
        
        # Create 20 players
        created_count = 0
        for name in names:
            email = f"{name.lower().replace(' ', '.')}@example.com"
            username = email.split('@')[0]
            
            if CustomUser.objects.filter(email=email).exists():
                self.stdout.write(f'User {email} already exists, skipping.')
                continue
                
            # Randomize profile data
            preferred_sports = random.sample(sports_pool, k=random.randint(1, 2))
            skill = random.choice(skills)
            location = random.choice(locations)
            
            # Create user
            user = CustomUser.objects.create_user(
                username=username,
                email=email,
                password="password123",
                full_name=name,
                role="PLAYER",
                phone_number=f"98{random.randint(10000000, 99999999)}"
            )
            
            # Update profile fields
            user.is_verified = True
            user.bio = f"I am a {skill.lower()} player who loves {', '.join(preferred_sports)}. Looking for competitive matches in {location}."
            user.location = location
            user.preferred_sports = preferred_sports
            user.skill_level = skill
            user.is_available_for_matches = random.choice([True, True, False]) # Higher chance of being available
            user.date_of_birth = timezone.now().date()
            user.gender = random.choice(["MALE", "FEMALE"])
            
            # Add some stats
            user.matches_played = random.randint(0, 50)
            if user.matches_played > 0:
                user.matches_won = random.randint(0, user.matches_played)
                user.matches_lost = user.matches_played - user.matches_won
            
            user.save()
            created_count += 1
            
        self.stdout.write(self.style.SUCCESS(f'Successfully created {created_count} players!'))
