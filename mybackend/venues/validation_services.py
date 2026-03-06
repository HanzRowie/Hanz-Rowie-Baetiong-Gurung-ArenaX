"""
Validation services for venue approval workflow.

This module provides automated validation checks to assist admins in making
informed approval decisions for venues.
"""

from typing import Dict, List, Any
from decimal import Decimal

from .models import Venue


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


class VenueValidationService:
    """
    Service for validating venue data during approval workflow.
    
    Performs automated checks including:
    - Business license document validation
    - Facility photos validation (minimum 3 required)
    - Operating hours completeness
    - Pricing information validation
    - Owner rejection history checks
    """
    
    def __init__(self, venue: Venue):
        self.venue = venue
        self.results: List[ValidationResult] = []
    
    def validate_all(self) -> List[Dict[str, Any]]:
        """
        Run all validation checks and return results.
        
        Returns:
            List of validation result dictionaries with severity levels
        """
        self.results = []
        
        self.validate_business_license()
        self.validate_facility_photos()
        self.validate_operating_hours()
        self.validate_pricing_information()
        self.check_owner_rejection_history()
        
        return [result.to_dict() for result in self.results]
    
    def validate_business_license(self):
        """Validate that business license document is uploaded."""
        verification_docs = self.venue.verification_documents or {}
        
        has_business_license = any(
            doc_type in ['business_license', 'business_registration', 'trade_license']
            for doc_type in verification_docs.keys()
        )
        
        if not has_business_license:
            self.results.append(ValidationResult(
                field='verification_documents',
                message='Business license document is required. Upload business license, business registration, or trade license.',
                severity=ValidationResult.SEVERITY_ERROR,
                code='ERROR_MISSING_BUSINESS_LICENSE'
            ))
        else:
            self.results.append(ValidationResult(
                field='verification_documents',
                message='Business license document is uploaded.',
                severity=ValidationResult.SEVERITY_INFO,
                code='INFO_BUSINESS_LICENSE_PRESENT'
            ))
    
    def validate_facility_photos(self):
        """Validate that at least 3 facility photos are uploaded."""
        verification_docs = self.venue.verification_documents or {}
        
        # Count facility photos
        facility_photo_count = 0
        for doc_type, doc_data in verification_docs.items():
            if 'facility_photo' in doc_type.lower() or 'venue_photo' in doc_type.lower():
                # Handle both single document and list of documents
                if isinstance(doc_data, list):
                    facility_photo_count += len(doc_data)
                else:
                    facility_photo_count += 1
        
        if facility_photo_count < 3:
            self.results.append(ValidationResult(
                field='verification_documents',
                message=f'Only {facility_photo_count} facility photo(s) uploaded. Minimum 3 photos required to show venue condition.',
                severity=ValidationResult.SEVERITY_ERROR,
                code='ERROR_INSUFFICIENT_PHOTOS'
            ))
        elif facility_photo_count < 5:
            self.results.append(ValidationResult(
                field='verification_documents',
                message=f'{facility_photo_count} facility photos uploaded. Consider requesting more photos for better venue representation.',
                severity=ValidationResult.SEVERITY_WARNING,
                code='WARNING_FEW_PHOTOS'
            ))
        else:
            self.results.append(ValidationResult(
                field='verification_documents',
                message=f'{facility_photo_count} facility photos uploaded.',
                severity=ValidationResult.SEVERITY_INFO,
                code='INFO_SUFFICIENT_PHOTOS'
            ))
    
    def validate_operating_hours(self):
        """Validate that operating hours are specified for all days."""
        operating_days = self.venue.operating_days or []
        
        if not operating_days:
            self.results.append(ValidationResult(
                field='operating_days',
                message='No operating days specified. Venue must specify which days it operates.',
                severity=ValidationResult.SEVERITY_ERROR,
                code='ERROR_NO_OPERATING_DAYS'
            ))
            return
        
        # Check if venue has default opening and closing times
        if not self.venue.default_opening_time or not self.venue.default_closing_time:
            self.results.append(ValidationResult(
                field='operating_hours',
                message='Operating hours (opening and closing times) are not specified.',
                severity=ValidationResult.SEVERITY_ERROR,
                code='ERROR_NO_OPERATING_HOURS'
            ))
        else:
            # Validate that closing time is after opening time
            if self.venue.default_closing_time <= self.venue.default_opening_time:
                self.results.append(ValidationResult(
                    field='operating_hours',
                    message='Closing time must be after opening time.',
                    severity=ValidationResult.SEVERITY_ERROR,
                    code='ERROR_INVALID_OPERATING_HOURS'
                ))
            else:
                days_count = len(operating_days)
                weekday_names = {
                    1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday',
                    5: 'Friday', 6: 'Saturday', 7: 'Sunday'
                }
                operating_day_names = [weekday_names.get(day, str(day)) for day in operating_days]
                
                self.results.append(ValidationResult(
                    field='operating_hours',
                    message=f'Venue operates {days_count} days per week: {", ".join(operating_day_names)}. Hours: {self.venue.default_opening_time} - {self.venue.default_closing_time}.',
                    severity=ValidationResult.SEVERITY_INFO,
                    code='INFO_OPERATING_HOURS_COMPLETE'
                ))
    
    def validate_pricing_information(self):
        """Validate that pricing information is complete and positive."""
        price_per_hour = self.venue.price_per_hour
        
        if not price_per_hour:
            self.results.append(ValidationResult(
                field='price_per_hour',
                message='Price per hour is not specified.',
                severity=ValidationResult.SEVERITY_ERROR,
                code='ERROR_NO_PRICING'
            ))
        elif price_per_hour <= 0:
            self.results.append(ValidationResult(
                field='price_per_hour',
                message=f'Price per hour ({price_per_hour}) must be positive.',
                severity=ValidationResult.SEVERITY_ERROR,
                code='ERROR_INVALID_PRICING'
            ))
        elif price_per_hour < Decimal('100.00'):
            self.results.append(ValidationResult(
                field='price_per_hour',
                message=f'Price per hour ({price_per_hour}) seems unusually low. Verify this is correct.',
                severity=ValidationResult.SEVERITY_WARNING,
                code='WARNING_LOW_PRICING'
            ))
        elif price_per_hour > Decimal('10000.00'):
            self.results.append(ValidationResult(
                field='price_per_hour',
                message=f'Price per hour ({price_per_hour}) seems unusually high. Verify this is correct.',
                severity=ValidationResult.SEVERITY_WARNING,
                code='WARNING_HIGH_PRICING'
            ))
        else:
            self.results.append(ValidationResult(
                field='price_per_hour',
                message=f'Price per hour: {price_per_hour}',
                severity=ValidationResult.SEVERITY_INFO,
                code='INFO_PRICING_VALID'
            ))
        
        # Check capacity
        if not self.venue.capacity or self.venue.capacity <= 0:
            self.results.append(ValidationResult(
                field='capacity',
                message='Venue capacity must be specified and positive.',
                severity=ValidationResult.SEVERITY_ERROR,
                code='ERROR_INVALID_CAPACITY'
            ))
        elif self.venue.capacity < 10:
            self.results.append(ValidationResult(
                field='capacity',
                message=f'Venue capacity ({self.venue.capacity}) seems low. Verify this is correct.',
                severity=ValidationResult.SEVERITY_WARNING,
                code='WARNING_LOW_CAPACITY'
            ))
    
    def check_owner_rejection_history(self):
        """Check if venue owner has previous rejected venues and generate warnings."""
        owner = self.venue.owner
        
        # Count rejected venues by this owner
        rejected_count = Venue.objects.filter(
            owner=owner,
            approval_status='REJECTED'
        ).exclude(
            id=self.venue.id
        ).count()
        
        if rejected_count > 0:
            # Get most recent rejection reason
            recent_rejection = Venue.objects.filter(
                owner=owner,
                approval_status='REJECTED'
            ).exclude(
                id=self.venue.id
            ).order_by('-approval_date').first()
            
            message = f'Owner has {rejected_count} previously rejected venue(s).'
            if recent_rejection and recent_rejection.rejection_reason:
                message += f' Most recent reason: "{recent_rejection.rejection_reason[:100]}"'
            
            severity = ValidationResult.SEVERITY_WARNING if rejected_count < 3 else ValidationResult.SEVERITY_ERROR
            
            self.results.append(ValidationResult(
                field='owner',
                message=message,
                severity=severity,
                code='WARNING_OWNER_HISTORY' if rejected_count < 3 else 'ERROR_OWNER_HISTORY'
            ))
        else:
            self.results.append(ValidationResult(
                field='owner',
                message='Owner has no previous rejections.',
                severity=ValidationResult.SEVERITY_INFO,
                code='INFO_CLEAN_OWNER_HISTORY'
            ))
