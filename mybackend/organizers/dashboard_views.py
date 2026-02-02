from django.http import JsonResponse, HttpResponse
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import datetime, timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
import json
from io import BytesIO
import csv
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch

from tournaments.models import Tournament, Match, TournamentRegistration
from teams.models import Team, TeamTournamentRegistration, FutsalScore, FutsalPlayerStat
from accounts.models import CustomUser


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def organizer_dashboard_stats(request):
    """Get organizer dashboard statistics"""
    if request.user.role != 'ORGANIZER':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get organizer's tournaments
    tournaments = Tournament.objects.filter(organizer=request.user)
    
    # Basic stats
    total_tournaments = tournaments.count()
    upcoming_events = tournaments.filter(status='UPCOMING').count()
    completed_events = tournaments.filter(status='COMPLETED').count()
    ongoing_events = tournaments.filter(status='ONGOING').count()
    
    # Participant stats - handle both individual and team registrations
    individual_participants = 0
    team_participants = 0
    
    for tournament in tournaments:
        if tournament.registration_type == 'INDIVIDUAL':
            individual_participants += TournamentRegistration.objects.filter(
                tournament=tournament,
                status='ACCEPTED'
            ).count()
        else:  # TEAM registration
            team_participants += TeamTournamentRegistration.objects.filter(
                tournament=tournament,
                status='CONFIRMED'
            ).count()
    
    total_participants = individual_participants + team_participants
    
    # Revenue calculation - multiply by participant count
    total_revenue = 0
    for tournament in tournaments:
        if tournament.registration_type == 'INDIVIDUAL':
            participant_count = TournamentRegistration.objects.filter(
                tournament=tournament,
                status='ACCEPTED'
            ).count()
        else:
            participant_count = TeamTournamentRegistration.objects.filter(
                tournament=tournament,
                status='CONFIRMED'
            ).count()
        
        total_revenue += float(tournament.entry_fee) * participant_count
    
    # Calculate averages
    avg_participants = total_participants / total_tournaments if total_tournaments > 0 else 0
    
    # Fill rate calculation
    total_capacity = sum(tournament.max_participants for tournament in tournaments)
    fill_rate = (total_participants / total_capacity * 100) if total_capacity > 0 else 0
    
    # Revenue growth (simple calculation for now)
    revenue_growth = 18 if total_revenue > 0 else 0
    
    return Response({
        'totalTournaments': total_tournaments,
        'totalParticipants': total_participants,
        'upcomingEvents': upcoming_events + ongoing_events,  # Include ongoing as "upcoming"
        'completedEvents': completed_events,
        'totalRevenue': total_revenue,
        'averageParticipants': round(avg_participants, 1),
        'fillRate': round(fill_rate, 1),
        'revenueGrowth': revenue_growth
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_matches(request):
    """Get recent completed matches for organizer's tournaments"""
    if request.user.role != 'ORGANIZER':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    limit = int(request.GET.get('limit', 10))
    
    # Get completed matches from organizer's tournaments
    matches = Match.objects.filter(
        tournament__organizer=request.user,
        status='COMPLETED'
    ).select_related(
        'tournament', 'player1', 'player2', 'team1', 'team2'
    ).order_by('-actual_end_time')[:limit]
    
    match_data = []
    for match in matches:
        match_info = {
            'id': str(match.id),
            'tournament': {
                'id': str(match.tournament.id),
                'title': match.tournament.title,
                'sport_type': match.tournament.sport_type
            },
            'team1_score': match.player1_score or 0,
            'team2_score': match.player2_score or 0,
            'status': match.status,
            'completed_at': match.actual_end_time.isoformat() if match.actual_end_time else None,
            'round_number': match.round_number,
            'match_number': match.match_number
        }
        
        # Add team or player info based on tournament type
        if match.tournament.registration_type == 'TEAM':
            match_info['team1'] = {
                'id': str(match.team1.id) if match.team1 else None,
                'name': match.team1.name if match.team1 else 'TBD'
            }
            match_info['team2'] = {
                'id': str(match.team2.id) if match.team2 else None,
                'name': match.team2.name if match.team2 else 'TBD'
            }
        else:
            match_info['player1'] = {
                'id': str(match.player1.id) if match.player1 else None,
                'full_name': match.player1.full_name if match.player1 else 'TBD'
            }
            match_info['player2'] = {
                'id': str(match.player2.id) if match.player2 else None,
                'full_name': match.player2.full_name if match.player2 else 'TBD'
            }
        
        match_data.append(match_info)
    
    return Response(match_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_activity(request):
    """Get recent activity for organizer's tournaments"""
    if request.user.role != 'ORGANIZER':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    limit = int(request.GET.get('limit', 10))
    activities = []
    
    # Recent registrations
    recent_registrations = TournamentRegistration.objects.filter(
        tournament__organizer=request.user,
        status='ACCEPTED'
    ).select_related('tournament', 'player').order_by('-registered_at')[:5]
    
    for reg in recent_registrations:
        activities.append({
            'id': f"reg_{reg.id}",
            'type': 'registration',
            'message': f"New registration for {reg.tournament.title} by {reg.player.full_name}.",
            'timestamp': reg.registered_at.isoformat(),
            'tournament': {
                'id': str(reg.tournament.id),
                'title': reg.tournament.title
            },
            'player': {
                'id': str(reg.player.id),
                'full_name': reg.player.full_name
            }
        })
    
    # Recent team registrations
    recent_team_registrations = TeamTournamentRegistration.objects.filter(
        tournament__organizer=request.user,
        status='CONFIRMED'
    ).select_related('tournament', 'team').order_by('-registered_at')[:5]
    
    for reg in recent_team_registrations:
        activities.append({
            'id': f"team_reg_{reg.id}",
            'type': 'registration',
            'message': f"New team registration for {reg.tournament.title} by {reg.team.name}.",
            'timestamp': reg.registered_at.isoformat(),
            'tournament': {
                'id': str(reg.tournament.id),
                'title': reg.tournament.title
            },
            'team': {
                'id': str(reg.team.id),
                'name': reg.team.name
            }
        })
    
    # Recent match results
    recent_matches = Match.objects.filter(
        tournament__organizer=request.user,
        status='COMPLETED'
    ).select_related('tournament').order_by('-actual_end_time')[:5]
    
    for match in recent_matches:
        activities.append({
            'id': f"match_{match.id}",
            'type': 'match_result',
            'message': f"Match result verified for Match #{match.match_number} ({match.player1_score}-{match.player2_score}).",
            'timestamp': match.actual_end_time.isoformat() if match.actual_end_time else match.created_at.isoformat(),
            'tournament': {
                'id': str(match.tournament.id),
                'title': match.tournament.title
            }
        })
    
    # Sort all activities by timestamp and limit
    activities.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return Response(activities[:limit])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def match_reports(request):
    """Get available match reports for organizer's tournaments"""
    if request.user.role != 'ORGANIZER':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    tournaments = Tournament.objects.filter(
        organizer=request.user
    ).annotate(
        total_matches=Count('matches'),
        completed_matches=Count('matches', filter=Q(matches__status='COMPLETED'))
    )
    
    reports = []
    for tournament in tournaments:
        # Get participant count
        if tournament.registration_type == 'TEAM':
            participants = TeamTournamentRegistration.objects.filter(
                tournament=tournament, status='CONFIRMED'
            ).count()
        else:
            participants = TournamentRegistration.objects.filter(
                tournament=tournament, status='ACCEPTED'
            ).count()
        
        reports.append({
            'tournament_id': str(tournament.id),
            'tournament_title': tournament.title,
            'sport_type': tournament.sport_type,
            'total_matches': tournament.total_matches,
            'completed_matches': tournament.completed_matches,
            'participants': participants,
            'start_date': tournament.date.isoformat(),
            'end_date': tournament.date.isoformat(),  # For now, same as start
            'status': tournament.status
        })
    
    return Response(reports)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_match_report(request, tournament_id):
    """Download match report for a specific tournament"""
    if request.user.role != 'ORGANIZER':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        tournament = Tournament.objects.get(id=tournament_id, organizer=request.user)
    except Tournament.DoesNotExist:
        return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)
    
    format_type = request.GET.get('format', 'pdf')
    
    if format_type == 'pdf':
        return generate_pdf_report(tournament)
    elif format_type == 'csv':
        return generate_csv_report(tournament)
    else:
        return Response({'error': 'Invalid format'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_all_match_reports(request):
    """Download combined match report for all organizer's tournaments"""
    if request.user.role != 'ORGANIZER':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    tournaments = Tournament.objects.filter(organizer=request.user)
    format_type = request.GET.get('format', 'pdf')
    
    if format_type == 'pdf':
        return generate_combined_pdf_report(tournaments)
    elif format_type == 'csv':
        return generate_combined_csv_report(tournaments)
    else:
        return Response({'error': 'Invalid format'}, status=status.HTTP_400_BAD_REQUEST)


def generate_pdf_report(tournament):
    """Generate PDF report for a tournament"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title = Paragraph(f"Match Report: {tournament.title}", styles['Title'])
    story.append(title)
    story.append(Spacer(1, 12))
    
    # Tournament info
    info_data = [
        ['Tournament', tournament.title],
        ['Sport', tournament.sport_type],
        ['Date', tournament.date.strftime('%Y-%m-%d')],
        ['Status', tournament.status],
        ['Venue', tournament.venue_name],
    ]
    
    info_table = Table(info_data, colWidths=[2*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(info_table)
    story.append(Spacer(1, 12))
    
    # Matches
    matches = Match.objects.filter(tournament=tournament).order_by('round_number', 'match_number')
    
    if matches.exists():
        story.append(Paragraph("Match Results", styles['Heading2']))
        story.append(Spacer(1, 12))
        
        match_data = [['Round', 'Match', 'Participant 1', 'Participant 2', 'Score', 'Status']]
        
        for match in matches:
            if tournament.registration_type == 'TEAM':
                p1_name = match.team1.name if match.team1 else 'TBD'
                p2_name = match.team2.name if match.team2 else 'TBD'
            else:
                p1_name = match.player1.full_name if match.player1 else 'TBD'
                p2_name = match.player2.full_name if match.player2 else 'TBD'
            
            score = f"{match.player1_score or 0} - {match.player2_score or 0}"
            
            match_data.append([
                str(match.round_number),
                str(match.match_number),
                p1_name,
                p2_name,
                score,
                match.status
            ])
        
        match_table = Table(match_data)
        match_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(match_table)
    
    doc.build(story)
    buffer.seek(0)
    
    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{tournament.title}_match_report.pdf"'
    return response


def generate_csv_report(tournament):
    """Generate CSV report for a tournament"""
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{tournament.title}_match_report.csv"'
    
    writer = csv.writer(response)
    writer.writerow(['Tournament', 'Sport', 'Date', 'Round', 'Match', 'Participant 1', 'Participant 2', 'Score 1', 'Score 2', 'Status'])
    
    matches = Match.objects.filter(tournament=tournament).order_by('round_number', 'match_number')
    
    for match in matches:
        if tournament.registration_type == 'TEAM':
            p1_name = match.team1.name if match.team1 else 'TBD'
            p2_name = match.team2.name if match.team2 else 'TBD'
        else:
            p1_name = match.player1.full_name if match.player1 else 'TBD'
            p2_name = match.player2.full_name if match.player2 else 'TBD'
        
        writer.writerow([
            tournament.title,
            tournament.sport_type,
            tournament.date.strftime('%Y-%m-%d'),
            match.round_number,
            match.match_number,
            p1_name,
            p2_name,
            match.player1_score or 0,
            match.player2_score or 0,
            match.status
        ])
    
    return response


def generate_combined_pdf_report(tournaments):
    """Generate combined PDF report for multiple tournaments"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title = Paragraph("Combined Match Reports", styles['Title'])
    story.append(title)
    story.append(Spacer(1, 12))
    
    for tournament in tournaments:
        # Tournament section
        tournament_title = Paragraph(f"{tournament.title} ({tournament.sport_type})", styles['Heading2'])
        story.append(tournament_title)
        story.append(Spacer(1, 6))
        
        # Tournament matches
        matches = Match.objects.filter(tournament=tournament).order_by('round_number', 'match_number')
        
        if matches.exists():
            match_data = [['Round', 'Match', 'Participant 1', 'Participant 2', 'Score', 'Status']]
            
            for match in matches:
                if tournament.registration_type == 'TEAM':
                    p1_name = match.team1.name if match.team1 else 'TBD'
                    p2_name = match.team2.name if match.team2 else 'TBD'
                else:
                    p1_name = match.player1.full_name if match.player1 else 'TBD'
                    p2_name = match.player2.full_name if match.player2 else 'TBD'
                
                score = f"{match.player1_score or 0} - {match.player2_score or 0}"
                
                match_data.append([
                    str(match.round_number),
                    str(match.match_number),
                    p1_name,
                    p2_name,
                    score,
                    match.status
                ])
            
            match_table = Table(match_data)
            match_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(match_table)
            story.append(Spacer(1, 12))
    
    doc.build(story)
    buffer.seek(0)
    
    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="combined_match_reports.pdf"'
    return response


def generate_combined_csv_report(tournaments):
    """Generate combined CSV report for multiple tournaments"""
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="combined_match_reports.csv"'
    
    writer = csv.writer(response)
    writer.writerow(['Tournament', 'Sport', 'Date', 'Round', 'Match', 'Participant 1', 'Participant 2', 'Score 1', 'Score 2', 'Status'])
    
    for tournament in tournaments:
        matches = Match.objects.filter(tournament=tournament).order_by('round_number', 'match_number')
        
        for match in matches:
            if tournament.registration_type == 'TEAM':
                p1_name = match.team1.name if match.team1 else 'TBD'
                p2_name = match.team2.name if match.team2 else 'TBD'
            else:
                p1_name = match.player1.full_name if match.player1 else 'TBD'
                p2_name = match.player2.full_name if match.player2 else 'TBD'
            
            writer.writerow([
                tournament.title,
                tournament.sport_type,
                tournament.date.strftime('%Y-%m-%d'),
                match.round_number,
                match.match_number,
                p1_name,
                p2_name,
                match.player1_score or 0,
                match.player2_score or 0,
                match.status
            ])
    
    return response