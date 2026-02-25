"""
Pytest configuration for Django tests.
"""
import os
import django
from django.conf import settings
import pytest

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backendapi.settings')

def pytest_configure():
    """Configure Django for pytest"""
    if not settings.configured:
        django.setup()

# Configure pytest-asyncio
pytest_plugins = ('pytest_asyncio',)

@pytest.fixture(scope='session')
def django_db_setup(django_db_setup, django_db_blocker):
    """Ensure migrations are run before tests"""
    with django_db_blocker.unblock():
        from django.core.management import call_command
        call_command('migrate', '--run-syncdb')
