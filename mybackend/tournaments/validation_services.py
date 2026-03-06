"""
Validation services for tournament approval workflow.

This module provides automated validation checks to assist admins in making
informed approval decisions for tournaments.
"""

from datetime import date, datetime
from typing import Dict, List, Any
from django.utils import timezone
from django.db.models import Q

from .models import Tournament
from venues.models import Venue


class ValidationResult:
    """Represents a single validation check result."""
    
    SEVERITY_ERROR = 'error'
    SEVERITY_WARNING = 'warning'
    SEVERITY_INFO = 'info'
    
    def __init__(self, field: str, message: str, severity: str, code: str = None):
        self.field = field
        self.message = message
        self.severity = severity
        self.code = code or f"{severity.upper()}_{field.upper()}"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'field': self.field,
            'message': self.message,
            'severity': self.severity,
            'code': self.code
        }


class TournamentValidationService:
    """
    Service for validating tournament data during approval workflow.
    
    Performs automated checks including:
    - Date validation (tournament must be in the future)
    - Venue approval status validation
    - Organizer rejection history checks
    - Prize pool payment verification
    - Venue availability validation
    """
    
    def __init__(self, tournament: Tournament):
        self.tournament = tournament
        self.results: List[ValidationResult] = []
    
    def validate_all(self) -> List[Dict[str, Any]]:
        """
        Run all validation checks and return results.
        
        Returns:
            List of validation result dictionaries with severity levels
        """
        self.results = []
        
        self.validate_start_date()
        self.validate_linked_venue_status()
        self.check_organizer_rejection_history()
        self.validate_prize_pool_documents()
        self.validate_venue_availability()
        
        return [result.to_dict() for result in self.results]
    
    def validate_start_date(self):
        """Validate that tournament start date is in the future."""
        tournament_date = self.tournament.date
        today = date.today()
        
        if tournament_date < today:
            self.results.append(ValidationResult(
                field='date',
                message=f'Tournament date ({tournament_date}) is in the past. Tournament must be scheduled for a future date.',
                severity=ValidationResult.SEVERITY_ERROR,
                code='ERROR_PAST_DATE'
            ))
        elif tournament_date == today:
            self.results.append(ValidationResult(
                field='date',
                message='Tournament is scheduled for today. Verify this is intentional.',
                severity=ValidationResult.SEVERITY_WARNING,
                code='WARNING_TODAY_DATE'
            ))
        else:
            days_until = (tournament_date - today).days
            if days_until < 7:
                self.results.append(ValidationResult(
                    field='date',
                    message=f'Tournament is scheduled in {days_until} days. Short notice for participants.',
                    severity=ValidationResult.SEVERITY_INFO,
                    code='INFO_SHORT_NOTICE'
                ))
    
    def validate_linked_venue_status(self):
        """Validate that linked venue has APPROVED status."""
        if not self.tournament.linked_venue:
            self.results.append(ValidationResult(
                field='linked_venue',
                message='No linked venue. Tournament is using a custom venue location.',
                severity=ValidationResult.SEVERITY_INFO,
                code='INFO_NO_LINKED_VENUE'
            ))
            return
        
        venue = self.tournament.linked_venue
        
        if venue.approval_status != 'APPROVED':
            self.results.append(ValidationResult(
                field='linked_venue',
                message=f'Linked venue "{venue.name}" has status {venue.approval_status}. Venue must be APPROVED before tournament can be approved.',
                severity=ValidationResult.SEVERITY_ERROR,
                code='ERROR_VENUE_NOT_APPROVED'
            ))
        else:
            self.results.append(ValidationResult(
                field='linked_venue',
                message=f'Linked venue "{venue.name}" is approved.',
                severity=ValidationResult.SEVERITY_INFO,
                code='INFO_VENUE_APPROVED'
            ))
    
    def check_organizer_rejection_history(self):
        """Check if organizer has previous rejected tournaments and generate warnings."""
        organizer = self.tournament.organizer
        
        # Count rejected tournaments by this organizer
        rejected_count = Tournament.objects.filter(
            organizer=organizer,
            approval_status='REJECTED'
        ).exclude(
            id=self.tournament.id
        ).count()
        
        if rejected_count > 0:
            # Get most recent rejection reason
            recent_rejection = Tournament.objects.filter(
                organizer=organizer,
                approval_status='REJECTED'
            ).exclude(
                id=self.tournament.id
            ).order_by('-approval_date').first()
            
            message = f'Organizer has {rejected_count} previously rejected tournament(s).'
            if recent_rejection and recent_rejection.rejection_reason:
                message += f' Most recent reason: "{recent_rejection.rejection_reason[:100]}"'
            
            severity = ValidationResult.SEVERITY_WARNING if rejected_count < 3 else ValidationResult.SEVERITY_ERROR
            
            self.results.append(ValidationResult(
                field='organizer',
                message=message,
                severity=severity,
                code='WARNING_ORGANIZER_HISTORY' if rejected_count < 3 else 'ERROR_ORGANIZER_HISTORY'
            ))
        else:
            self.results.append(ValidationResult(
                field='organizer',
                message='Organizer has no previous rejections.',
                severity=ValidationResult.SEVERITY_INFO,
                code='INFO_CLEAN_ORGANIZER_HISTORY'
            ))
    
    def validate_prize_pool_documents(self):
        """Validate that tournaments with prize pools have payment verification documents."""
        if not self.tournament.prize_pool or self.tournament.prize_pool <= 0:
            return
        
        # Check if verification_documents contains payment-related documents
        verification_docs = self.tournament.verification_documents or {}
        
        has_payment_verification = any(
            doc_type in ['payment_verification', 'prize_pool_proof', 'bank_statement', 'financial_guarantee']
            for doc_type in verification_docs.keys()
        )
        
        if not has_payment_verification:
            self.results.append(ValidationResult(
                field='prize_pool',
                message=f'Tournament has prize pool of {self.tournament.prize_pool} but no payment verification documents uploaded. Require proof of funds.',
                severity=ValidationResult.SEVERITY_ERROR,
                code='ERROR_MISSING_PAYMENT_VERIFICATION'
            ))
        else:
            self.results.append(ValidationResult(
                field='prize_pool',
                message=f'Prize pool of {self.tournament.prize_pool} has payment verification documents.',
                severity=ValidationResult.SEVERITY_INFO,
                code='INFO_PAYMENT_VERIFIED'
            ))
    
    def validate_venue_availability(self):
        """Validate that venue is available for requested tournament dates."""
        if not self.tournament.linked_venue:
            return
        
        venue = self.tournament.linked_venue
        tournament_date = self.tournament.date
        start_time = self.tournament.start_time
        end_time = self.tournament.end_time
        
        # Check if venue operates on this day
        if not venue.is_operating_day(tournament_date):
            weekday_name = tournament_date.strftime('%A')
            self.results.append(ValidationResult(
                field='date',
                message=f'Venue "{venue.name}" is not open on {weekday_name}s.',
                severity=ValidationResult.SEVERITY_ERROR,
                code='ERROR_VENUE_CLOSED'
            ))
            return
        
        # Check if time falls within operating hours
        if end_time and not venue.is_available_at_time(tournament_date, start_time, end_time):
            operating_hours = venue.get_operating_hours(tournament_date)
            if operating_hours:
                self.results.append(ValidationResult(
                    field='start_time',
                    message=f'Tournament time ({start_time}-{end_time}) is outside venue operating hours ({operating_hours["open"]}-{operating_hours["close"]}).',
                    severity=ValidationResult.SEVERITY_ERROR,
                    code='ERROR_OUTSIDE_OPERATING_HOURS'
                ))
        else:
            self.results.append(ValidationResult(
                field='date',
                message='Venue is available for the requested date and time.',
                severity=ValidationResult.SEVERITY_INFO,
                code='INFO_VENUE_AVAILABLE'
            ))
