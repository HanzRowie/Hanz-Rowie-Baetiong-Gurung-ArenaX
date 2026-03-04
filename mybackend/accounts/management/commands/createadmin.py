"""
Management command to create an admin user.
"""
from django.core.management.base import BaseCommand
from accounts.models import CustomUser


class Command(BaseCommand):
    help = 'Create an admin user'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Admin email address')
        parser.add_argument('--password', type=str, help='Admin password')
        parser.add_argument('--name', type=str, help='Admin full name')
        parser.add_argument('--phone', type=str, default='+0000000000', help='Admin phone number')

    def handle(self, *args, **options):
        email = options.get('email')
        password = options.get('password')
        name = options.get('name')
        phone = options.get('phone')

        # Interactive mode if arguments not provided
        if not email:
            email = input('Email address: ')
        
        if not password:
            from getpass import getpass
            password = getpass('Password: ')
            password_confirm = getpass('Password (again): ')
            if password != password_confirm:
                self.stdout.write(self.style.ERROR('Passwords do not match'))
                return
        
        if not name:
            name = input('Full name: ')

        # Check if user already exists
        if CustomUser.objects.filter(email=email).exists():
            self.stdout.write(self.style.ERROR(f'User with email {email} already exists'))
            return

        # Create admin user
        try:
            admin = CustomUser.objects.create_user(
                username=email.split('@')[0],  # Use email prefix as username
                email=email,
                password=password,
                full_name=name,
                phone_number=phone,
                role='ADMIN',
                is_verified=True,
                approval_status='APPROVED',
                is_staff=True,
                is_superuser=True
            )
            
            self.stdout.write(self.style.SUCCESS(f'Successfully created admin user: {admin.email}'))
            self.stdout.write(self.style.SUCCESS(f'Name: {admin.full_name}'))
            self.stdout.write(self.style.SUCCESS(f'Role: {admin.role}'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating admin user: {str(e)}'))
