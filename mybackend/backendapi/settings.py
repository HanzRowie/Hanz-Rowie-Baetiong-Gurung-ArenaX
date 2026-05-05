from pathlib import Path
from decouple import config, Csv

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY
# Removed the insecure default. If missing from .env, the app will safely fail to start.
SECRET_KEY = config('SECRET_KEY') 
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='', cast=Csv())

# Applications
INSTALLED_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "corsheaders",
    "channels",
    "accounts",
    "organizers",
    "referees",
    "tournaments",
    "chat",
    "notifications",
    "venues",
    "payments",
    "teams",
]

# Middleware
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "accounts.middleware.ApprovalStatusMiddleware",  # Admin approval workflow middleware
    "tournaments.security_logging.SecurityLoggingMiddleware",  # Security logging for admin endpoints
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "teams.error_handlers.TeamErrorMiddleware",  # Team error handling middleware
]

# Disable APPEND_SLASH to prevent redirect issues with API calls
APPEND_SLASH = False

# CORS Configuration
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='', cast=Csv())
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = DEBUG  # Allow all origins in development
CORS_ALLOWED_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# URL configuration
ROOT_URLCONF = "backendapi.urls"

# Templates
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# WSGI
WSGI_APPLICATION = "backendapi.wsgi.application"

# Database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Password Hashers - Use faster hasher in development for better performance
# WARNING: MD5PasswordHasher is INSECURE and should ONLY be used in development
if DEBUG:
    PASSWORD_HASHERS = [
        'django.contrib.auth.hashers.MD5PasswordHasher',  # Fast but insecure - dev only
        'django.contrib.auth.hashers.PBKDF2PasswordHasher',  # Keep for existing passwords
        'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    ]
else:
    # Production uses secure PBKDF2 (Django default)
    PASSWORD_HASHERS = [
        'django.contrib.auth.hashers.PBKDF2PasswordHasher',
        'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
        'django.contrib.auth.hashers.Argon2PasswordHasher',
        'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
    ]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Media files
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Default primary key field
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Custom user model
AUTH_USER_MODEL = "accounts.CustomUser"

# REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "accounts.auth.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_RATES": {
        "admin_api": "100/min",  # Admin Control System rate limit (Requirement 18.7)
        "admin_approval": "100/hour",  # Tournament/Venue approval rate limit (Requirement 19.1)
    },
}

# CSRF exemption for API endpoints
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='', cast=Csv())

# Email Configuration (SMTP)
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='')

# Frontend URL for password reset links
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')

# Channels Configuration
ASGI_APPLICATION = "backendapi.asgi.application"

# Channel Layers Configuration
# Use Redis for production and development (with fallback to InMemory if Redis unavailable)
REDIS_URL = config('REDIS_URL', default=None)

if REDIS_URL:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                "hosts": [REDIS_URL],
                "capacity": 1500,  # Maximum number of messages to store
                "expiry": 10,  # Message expiry in seconds
            },
        },
    }
else:
    # Fallback to InMemory for development without Redis
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }

# Khalti Payment Gateway Configuration
# Secure: Defaults are now empty strings. Data must come from .env!
KHALTI_CONFIG = {
    'TEST_PUBLIC_KEY': config('KHALTI_TEST_PUBLIC_KEY', default=''),
    'TEST_SECRET_KEY': config('KHALTI_TEST_SECRET_KEY', default=''),
    'LIVE_PUBLIC_KEY': config('KHALTI_LIVE_PUBLIC_KEY', default=''),
    'LIVE_SECRET_KEY': config('KHALTI_LIVE_SECRET_KEY', default=''),
    'IS_LIVE': config('KHALTI_IS_LIVE', default=False, cast=bool),
    'WEBSITE_URL': config('WEBSITE_URL', default='http://localhost:3000'),
    'RETURN_URL': config('KHALTI_RETURN_URL', default='http://localhost:3000/payment/success'),
    'WEBHOOK_URL': config('KHALTI_WEBHOOK_URL', default='http://localhost:8000/api/webhook/khalti/'),
}

# Payment Mock Mode (for development without Khalti test wallet balance)
PAYMENT_MOCK_MODE = config('PAYMENT_MOCK_MODE', default=False, cast=bool)

# Log Khalti configuration on startup
import logging
logger = logging.getLogger(__name__)
logger.info("=" * 60)
logger.info("KHALTI CONFIGURATION LOADED:")
logger.info(f"  IS_LIVE: {KHALTI_CONFIG['IS_LIVE']}")
logger.info(f"  MOCK_MODE: {PAYMENT_MOCK_MODE}")
# Safe logging: only show the first 10 characters so full keys aren't printed to the console
logger.info(f"  TEST_PUBLIC_KEY: {KHALTI_CONFIG['TEST_PUBLIC_KEY'][:10]}...")
logger.info(f"  LIVE_PUBLIC_KEY: {KHALTI_CONFIG['LIVE_PUBLIC_KEY'][:10]}...")
logger.info(f"  WEBSITE_URL: {KHALTI_CONFIG['WEBSITE_URL']}")
logger.info("=" * 60)

# Logging Configuration for Team Operations
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'team_operations': {
            'format': '{asctime} - {levelname} - [{name}] - {message}',
            'style': '{',
        },
        'security': {
            'format': '{asctime} - {levelname} - [SECURITY] - {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
        'team_operations_filter': {
            '()': 'teams.logging_config.TeamOperationFilter',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'filters': ['require_debug_true'],
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
        'console_always': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'maxBytes': 10 * 1024 * 1024,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'team_operations_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'team_operations.log',
            'maxBytes': 10 * 1024 * 1024,  # 10MB
            'backupCount': 5,
            'formatter': 'team_operations',
            'filters': ['team_operations_filter'],
        },
        'team_errors_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'team_errors.log',
            'maxBytes': 10 * 1024 * 1024,  # 10MB
            'backupCount': 10,
            'formatter': 'verbose',
            'filters': ['team_operations_filter'],
        },
        'security_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'security.log',
            'maxBytes': 10 * 1024 * 1024,  # 10MB
            'backupCount': 10,
            'formatter': 'security',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
        },
        'teams': {
            'handlers': ['console', 'team_operations_file', 'team_errors_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'teams.error_handlers': {
            'handlers': ['console', 'team_errors_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'teams.match_scoring': {
            'handlers': ['console', 'team_operations_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'teams.monitoring': {
            'handlers': ['console', 'team_operations_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'security': {
            'handlers': ['console', 'security_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'tournaments': {
            'handlers': ['console_always', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'venues': {
            'handlers': ['console_always', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Create logs directory if it doesn't exist
import os
os.makedirs(BASE_DIR / 'logs', exist_ok=True)

# Team System Configuration
TEAM_SYSTEM_CONFIG = {
    'MAX_TEAM_SIZE': 15,
    'INVITATION_EXPIRY_DAYS': 7,
    'ERROR_MONITORING_ENABLED': True,
    'PERFORMANCE_MONITORING_ENABLED': True,
    'USER_FEEDBACK_ENABLED': True,
    'ALERT_HANDLERS': {
        'console': DEBUG,
        'email': not DEBUG,
        'slack': False,  # Enable in production
    },
    'HEALTH_CHECK_INTERVAL': 300,  # 5 minutes
    'METRICS_RETENTION_HOURS': 24,
}
