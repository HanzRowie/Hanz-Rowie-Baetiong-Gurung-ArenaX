"""
User Feedback System for Team-Based Tournament System

This module provides user-friendly error messages, suggestions, and help content
to improve the user experience when errors occur in team operations.
"""

from typing import Dict, Any, List, Optional
from django.utils.translation import gettext as _
from .exceptions import TeamBaseException


class UserFeedbackGenerator:
    """Generate user-friendly feedback for team operations"""
    
    # Error message templates with user-friendly language
    ERROR_MESSAGES = {
        'DUPLICATE_TEAM_NAME': {
            'title': _('Team Name Already Exists'),
            'message': _('A team with this name already exists. Please choose a different name.'),
            'suggestions': [
                _('Try adding your location or sport type to make it unique'),
                _('Use abbreviations or numbers to differentiate your team'),
                _('Check if you already have a team with a similar name')
            ],
            'help_link': '/help/team-creation#naming'
        },
        
        'TEAM_SIZE_LIMIT_EXCEEDED': {
            'title': _('Team is Full'),
            'message': _('This team has reached its maximum capacity and cannot accept new members.'),
            'suggestions': [
                _('Remove inactive members to make room for new ones'),
                _('Ask the team owner to increase the team size limit'),
                _('Create a new team if you need more players')
            ],
            'help_link': '/help/team-management#size-limits'
        },
        
        'INSUFFICIENT_PERMISSIONS': {
            'title': _('Permission Denied'),
            'message': _('You don\'t have the required permissions to perform this action.'),
            'suggestions': [
                _('Contact the team owner or a team leader for assistance'),
                _('Check your role in the team settings'),
                _('Make sure you\'re logged in with the correct account')
            ],
            'help_link': '/help/team-roles#permissions'
        },
        
        'INVALID_TEAM_COMPOSITION': {
            'title': _('Team Composition Invalid'),
            'message': _('Your team doesn\'t meet the requirements for this tournament.'),
            'suggestions': [
                _('Add more players to meet the minimum requirements'),
                _('Check the tournament rules for specific requirements'),
                _('Ensure all selected players are active team members')
            ],
            'help_link': '/help/tournaments#team-requirements'
        },
        
        'INVITATION_EXPIRED': {
            'title': _('Invitation Expired'),
            'message': _('This invitation has expired and can no longer be accepted.'),
            'suggestions': [
                _('Ask the team to send you a new invitation'),
                _('Contact the team owner or leader directly'),
                _('Check if you have other pending invitations')
            ],
            'help_link': '/help/invitations#expiration'
        },
        
        'MATCH_ALREADY_SCORED': {
            'title': _('Match Already Completed'),
            'message': _('This match has already been scored and cannot be modified.'),
            'suggestions': [
                _('Contact the tournament organizer if the score is incorrect'),
                _('Check the match details to verify the current score'),
                _('Submit a dispute if you believe there\'s an error')
            ],
            'help_link': '/help/scoring#corrections'
        },
        
        'INVALID_SCORE': {
            'title': _('Invalid Score'),
            'message': _('The score you entered doesn\'t follow the rules for this sport.'),
            'suggestions': [
                _('Check the official scoring rules for this sport'),
                _('Verify all player statistics add up correctly'),
                _('Make sure set scores follow the proper format')
            ],
            'help_link': '/help/scoring#rules'
        },
        
        'REGISTRATION_DEADLINE_PASSED': {
            'title': _('Registration Closed'),
            'message': _('The registration deadline for this tournament has passed.'),
            'suggestions': [
                _('Look for other upcoming tournaments'),
                _('Contact the organizer to ask about late registration'),
                _('Set up notifications for future tournaments')
            ],
            'help_link': '/help/tournaments#registration'
        }
    }
    
    # Context-specific help content
    CONTEXTUAL_HELP = {
        'team_creation': {
            'tips': [
                _('Choose a memorable and unique team name'),
                _('Select the sports your team will participate in'),
                _('You can always add more members after creating the team')
            ],
            'common_issues': [
                _('Team name already exists - try variations'),
                _('Invalid sport selection - check available options'),
                _('Network issues - try refreshing the page')
            ]
        },
        
        'team_management': {
            'tips': [
                _('Only team owners can change team settings'),
                _('Leaders can invite new members and register for tournaments'),
                _('Members can view team information and participate in tournaments')
            ],
            'common_issues': [
                _('Permission denied - check your role'),
                _('Team full - remove inactive members first'),
                _('Player already in team - check membership list')
            ]
        },
        
        'tournament_registration': {
            'tips': [
                _('Check tournament requirements before registering'),
                _('Select your best players for the tournament'),
                _('Make sure all selected players are available')
            ],
            'common_issues': [
                _('Team composition invalid - add more players'),
                _('Registration deadline passed - look for other tournaments'),
                _('Player not eligible - check team membership')
            ]
        },
        
        'match_scoring': {
            'tips': [
                _('Only tournament organizers can record scores'),
                _('Follow official sport rules when entering scores'),
                _('Double-check all statistics before submitting')
            ],
            'common_issues': [
                _('Invalid score format - check sport rules'),
                _('Match already scored - contact organizer for changes'),
                _('Player statistics don\'t match - verify calculations')
            ]
        }
    }
    
    @classmethod
    def generate_error_feedback(cls, exception: TeamBaseException, 
                              context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate comprehensive user feedback for an error"""
        
        error_code = exception.error_code
        error_template = cls.ERROR_MESSAGES.get(error_code, {
            'title': _('An Error Occurred'),
            'message': exception.message,
            'suggestions': [_('Please try again or contact support if the problem persists')],
            'help_link': '/help/general'
        })
        
        feedback = {
            'error_code': error_code,
            'title': error_template['title'],
            'message': error_template['message'],
            'suggestions': error_template['suggestions'],
            'help_link': error_template['help_link'],
            'severity': cls._determine_severity(exception),
            'user_actions': cls._get_user_actions(exception, context),
            'technical_details': cls._get_technical_details(exception, context)
        }
        
        # Add context-specific help if available
        if context and 'operation_context' in context:
            operation_context = context['operation_context']
            if operation_context in cls.CONTEXTUAL_HELP:
                feedback['contextual_help'] = cls.CONTEXTUAL_HELP[operation_context]
        
        return feedback
    
    @classmethod
    def generate_success_feedback(cls, operation: str, result: Any = None, 
                                context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate positive feedback for successful operations"""
        
        success_messages = {
            'create_team': {
                'title': _('Team Created Successfully'),
                'message': _('Your team has been created and you are now the team owner.'),
                'next_steps': [
                    _('Invite players to join your team'),
                    _('Set up your team profile and preferences'),
                    _('Look for tournaments to participate in')
                ]
            },
            'join_team': {
                'title': _('Welcome to the Team'),
                'message': _('You have successfully joined the team.'),
                'next_steps': [
                    _('Check out your team\'s upcoming tournaments'),
                    _('Get to know your teammates'),
                    _('Update your player profile')
                ]
            },
            'register_tournament': {
                'title': _('Tournament Registration Complete'),
                'message': _('Your team has been registered for the tournament.'),
                'next_steps': [
                    _('Check the tournament schedule'),
                    _('Prepare your team for the matches'),
                    _('Set up notifications for match updates')
                ]
            },
            'record_score': {
                'title': _('Match Score Recorded'),
                'message': _('The match score has been successfully recorded.'),
                'next_steps': [
                    _('Review the updated tournament standings'),
                    _('Check player statistics'),
                    _('Prepare for the next match')
                ]
            }
        }
        
        template = success_messages.get(operation, {
            'title': _('Operation Successful'),
            'message': _('The operation completed successfully.'),
            'next_steps': []
        })
        
        return {
            'success': True,
            'title': template['title'],
            'message': template['message'],
            'next_steps': template['next_steps'],
            'result': result
        }
    
    @classmethod
    def _determine_severity(cls, exception: TeamBaseException) -> str:
        """Determine the severity level of an error"""
        
        high_severity_codes = [
            'STATISTICS_CALCULATION_ERROR',
            'HISTORY_RECORDING_ERROR',
            'INTERNAL_SERVER_ERROR'
        ]
        
        medium_severity_codes = [
            'UNAUTHORIZED_SCORING',
            'MATCH_NOT_FOUND',
            'INVALID_OWNERSHIP_TRANSFER'
        ]
        
        if exception.error_code in high_severity_codes:
            return 'high'
        elif exception.error_code in medium_severity_codes:
            return 'medium'
        else:
            return 'low'
    
    @classmethod
    def _get_user_actions(cls, exception: TeamBaseException, 
                         context: Dict[str, Any] = None) -> List[Dict[str, str]]:
        """Get specific actions the user can take to resolve the error"""
        
        actions_map = {
            'DUPLICATE_TEAM_NAME': [
                {'action': 'modify_name', 'label': _('Try a Different Name'), 'type': 'primary'},
                {'action': 'check_existing', 'label': _('View My Teams'), 'type': 'secondary'}
            ],
            'TEAM_SIZE_LIMIT_EXCEEDED': [
                {'action': 'remove_members', 'label': _('Manage Team Members'), 'type': 'primary'},
                {'action': 'contact_owner', 'label': _('Contact Team Owner'), 'type': 'secondary'}
            ],
            'INSUFFICIENT_PERMISSIONS': [
                {'action': 'contact_leader', 'label': _('Contact Team Leader'), 'type': 'primary'},
                {'action': 'check_role', 'label': _('View My Role'), 'type': 'secondary'}
            ],
            'INVITATION_EXPIRED': [
                {'action': 'request_new', 'label': _('Request New Invitation'), 'type': 'primary'},
                {'action': 'find_teams', 'label': _('Find Other Teams'), 'type': 'secondary'}
            ],
            'REGISTRATION_DEADLINE_PASSED': [
                {'action': 'find_tournaments', 'label': _('Find Other Tournaments'), 'type': 'primary'},
                {'action': 'contact_organizer', 'label': _('Contact Organizer'), 'type': 'secondary'}
            ]
        }
        
        return actions_map.get(exception.error_code, [
            {'action': 'retry', 'label': _('Try Again'), 'type': 'primary'},
            {'action': 'contact_support', 'label': _('Contact Support'), 'type': 'secondary'}
        ])
    
    @classmethod
    def _get_technical_details(cls, exception: TeamBaseException, 
                             context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Get technical details for debugging (only in development)"""
        
        from django.conf import settings
        
        if not settings.DEBUG:
            return {}
        
        return {
            'error_code': exception.error_code,
            'exception_type': exception.__class__.__name__,
            'details': exception.details,
            'context': context or {}
        }


class UserNotificationManager:
    """Manage user notifications for team operations"""
    
    NOTIFICATION_TEMPLATES = {
        'team_invitation_received': {
            'title': _('Team Invitation Received'),
            'message': _('You have been invited to join {team_name}'),
            'action_url': '/invitations',
            'action_label': _('View Invitation')
        },
        
        'team_invitation_accepted': {
            'title': _('Invitation Accepted'),
            'message': _('{player_name} has joined your team'),
            'action_url': '/teams/{team_id}',
            'action_label': _('View Team')
        },
        
        'tournament_registration_confirmed': {
            'title': _('Tournament Registration Confirmed'),
            'message': _('Your team has been registered for {tournament_name}'),
            'action_url': '/tournaments/{tournament_id}',
            'action_label': _('View Tournament')
        },
        
        'match_score_recorded': {
            'title': _('Match Score Updated'),
            'message': _('The score for your match has been recorded'),
            'action_url': '/matches/{match_id}',
            'action_label': _('View Match')
        },
        
        'team_role_changed': {
            'title': _('Team Role Updated'),
            'message': _('Your role in {team_name} has been changed to {new_role}'),
            'action_url': '/teams/{team_id}',
            'action_label': _('View Team')
        }
    }
    
    @classmethod
    def create_notification(cls, notification_type: str, recipient_id: str, 
                          data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a user notification"""
        
        template = cls.NOTIFICATION_TEMPLATES.get(notification_type)
        if not template:
            return None
        
        notification = {
            'type': notification_type,
            'recipient_id': recipient_id,
            'title': template['title'].format(**data),
            'message': template['message'].format(**data),
            'action_url': template['action_url'].format(**data),
            'action_label': template['action_label'],
            'created_at': 'now',  # Would use actual timestamp
            'read': False
        }
        
        return notification
    
    @classmethod
    def get_notification_preferences(cls, user_id: str) -> Dict[str, bool]:
        """Get user notification preferences"""
        # In a real implementation, this would fetch from database
        return {
            'email_notifications': True,
            'push_notifications': True,
            'team_invitations': True,
            'tournament_updates': True,
            'match_results': True,
            'role_changes': True
        }


class HelpContentManager:
    """Manage help content and documentation links"""
    
    HELP_ARTICLES = {
        'team-creation': {
            'title': _('Creating a Team'),
            'sections': [
                {
                    'title': _('Getting Started'),
                    'content': _('Learn how to create your first team and set it up for success.')
                },
                {
                    'title': _('Naming Guidelines'),
                    'content': _('Tips for choosing a unique and memorable team name.')
                },
                {
                    'title': _('Sport Selection'),
                    'content': _('How to select the sports your team will participate in.')
                }
            ]
        },
        
        'team-management': {
            'title': _('Managing Your Team'),
            'sections': [
                {
                    'title': _('Team Roles'),
                    'content': _('Understanding owner, leader, and member roles.')
                },
                {
                    'title': _('Adding Members'),
                    'content': _('How to invite and manage team members.')
                },
                {
                    'title': _('Team Settings'),
                    'content': _('Configuring team preferences and limits.')
                }
            ]
        },
        
        'tournaments': {
            'title': _('Tournament Participation'),
            'sections': [
                {
                    'title': _('Registration'),
                    'content': _('How to register your team for tournaments.')
                },
                {
                    'title': _('Requirements'),
                    'content': _('Understanding tournament requirements and rules.')
                },
                {
                    'title': _('Player Selection'),
                    'content': _('Selecting the right players for each tournament.')
                }
            ]
        }
    }
    
    @classmethod
    def get_help_content(cls, topic: str) -> Optional[Dict[str, Any]]:
        """Get help content for a specific topic"""
        return cls.HELP_ARTICLES.get(topic)
    
    @classmethod
    def search_help_content(cls, query: str) -> List[Dict[str, Any]]:
        """Search help content by query"""
        results = []
        query_lower = query.lower()
        
        for topic, article in cls.HELP_ARTICLES.items():
            if query_lower in article['title'].lower():
                results.append({
                    'topic': topic,
                    'title': article['title'],
                    'relevance': 'high'
                })
            else:
                for section in article['sections']:
                    if query_lower in section['content'].lower():
                        results.append({
                            'topic': topic,
                            'title': article['title'],
                            'section': section['title'],
                            'relevance': 'medium'
                        })
        
        return results


# Utility functions for generating user-friendly responses

def create_user_friendly_response(success: bool, operation: str, result: Any = None, 
                                error: TeamBaseException = None, 
                                context: Dict[str, Any] = None) -> Dict[str, Any]:
    """Create a comprehensive user-friendly response"""
    
    if success:
        feedback = UserFeedbackGenerator.generate_success_feedback(operation, result, context)
        return {
            'success': True,
            'data': result,
            'feedback': feedback
        }
    else:
        feedback = UserFeedbackGenerator.generate_error_feedback(error, context)
        return {
            'success': False,
            'error': feedback
        }


def get_operation_help(operation: str) -> Dict[str, Any]:
    """Get help content for a specific operation"""
    
    operation_help_map = {
        'create_team': 'team-creation',
        'manage_team': 'team-management',
        'register_tournament': 'tournaments',
        'score_match': 'scoring'
    }
    
    help_topic = operation_help_map.get(operation)
    if help_topic:
        return HelpContentManager.get_help_content(help_topic)
    
    return None


def format_error_for_user(exception: TeamBaseException, 
                         include_technical: bool = False) -> Dict[str, Any]:
    """Format an exception for user-friendly display"""
    
    feedback = UserFeedbackGenerator.generate_error_feedback(exception)
    
    formatted = {
        'title': feedback['title'],
        'message': feedback['message'],
        'suggestions': feedback['suggestions'],
        'severity': feedback['severity'],
        'user_actions': feedback['user_actions']
    }
    
    if include_technical:
        formatted['technical_details'] = feedback['technical_details']
    
    return formatted