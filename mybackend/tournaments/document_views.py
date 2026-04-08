"""
Document upload views for tournament conditional approval workflow.
"""
import os
import uuid
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Tournament


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_tournament_documents(request, tournament_id):
    """
    Allow tournament organizer to upload verification documents for conditional approval.
    Triggers admin notification via pre_save signal.
    """
    try:
        tournament = Tournament.objects.get(id=tournament_id, organizer=request.user)
    except Tournament.DoesNotExist:
        return Response({'error': 'Tournament not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

    if tournament.approval_status != 'CONDITIONAL_APPROVAL':
        return Response(
            {'error': 'Documents can only be uploaded when tournament is in CONDITIONAL_APPROVAL status.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    files = request.FILES
    if not files:
        return Response({'error': 'No files provided.'}, status=status.HTTP_400_BAD_REQUEST)

    current_docs = dict(tournament.verification_documents or {})

    for field_name, uploaded_file in files.items():
        doc_type = request.data.get(f'{field_name}_type', field_name)
        ext = os.path.splitext(uploaded_file.name)[1]
        unique_name = f"tournament_docs/{tournament_id}/{uuid.uuid4().hex}{ext}"
        saved_path = default_storage.save(unique_name, ContentFile(uploaded_file.read()))

        try:
            file_url = request.build_absolute_uri(default_storage.url(saved_path))
        except Exception:
            file_url = f"/media/{saved_path}"

        current_docs[doc_type] = {
            'file_url': file_url,
            'file_name': uploaded_file.name,
            'uploaded_at': timezone.now().isoformat(),
        }

    tournament.verification_documents = current_docs
    tournament.save()  # triggers pre_save signal → admin notification

    return Response({
        'message': 'Documents uploaded successfully. Admins have been notified.',
        'verification_documents': current_docs,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tournament_document_status(request, tournament_id):
    """Return the current approval status and requested/submitted documents for a tournament."""
    try:
        tournament = Tournament.objects.get(id=tournament_id, organizer=request.user)
    except Tournament.DoesNotExist:
        return Response({'error': 'Tournament not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        'approval_status': tournament.approval_status,
        'requested_documents': tournament.requested_documents or [],
        'verification_documents': tournament.verification_documents or {},
        'rejection_reason': tournament.rejection_reason or '',
        'approval_notes': tournament.approval_notes or '',
    })
