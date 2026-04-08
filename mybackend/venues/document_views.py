"""
Document upload views for venue conditional approval workflow.
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
from .models import Venue


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_venue_documents(request, venue_id):
    """
    Allow venue owner to upload verification documents for conditional approval.
    Accepts multiple files with document_type labels.
    Triggers admin notification via pre_save signal.
    """
    try:
        venue = Venue.objects.get(id=venue_id, owner=request.user)
    except Venue.DoesNotExist:
        return Response({'error': 'Venue not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

    if venue.approval_status != 'CONDITIONAL_APPROVAL':
        return Response(
            {'error': 'Documents can only be uploaded when venue is in CONDITIONAL_APPROVAL status.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    files = request.FILES
    if not files:
        return Response({'error': 'No files provided.'}, status=status.HTTP_400_BAD_REQUEST)

    current_docs = dict(venue.verification_documents or {})

    for field_name, uploaded_file in files.items():
        # field_name is used as the document type label
        doc_type = request.data.get(f'{field_name}_type', field_name)
        ext = os.path.splitext(uploaded_file.name)[1]
        unique_name = f"venue_docs/{venue_id}/{uuid.uuid4().hex}{ext}"
        saved_path = default_storage.save(unique_name, ContentFile(uploaded_file.read()))

        # Build absolute URL
        request_obj = request
        if hasattr(default_storage, 'url'):
            try:
                file_url = request_obj.build_absolute_uri(default_storage.url(saved_path))
            except Exception:
                file_url = f"/media/{saved_path}"
        else:
            file_url = f"/media/{saved_path}"

        current_docs[doc_type] = {
            'file_url': file_url,
            'file_name': uploaded_file.name,
            'uploaded_at': timezone.now().isoformat(),
        }

    venue.verification_documents = current_docs
    venue.save()  # triggers pre_save signal → admin notification

    return Response({
        'message': 'Documents uploaded successfully. Admins have been notified.',
        'verification_documents': current_docs,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_venue_document_status(request, venue_id):
    """Return the current approval status and requested/submitted documents for a venue."""
    try:
        venue = Venue.objects.get(id=venue_id, owner=request.user)
    except Venue.DoesNotExist:
        return Response({'error': 'Venue not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        'approval_status': venue.approval_status,
        'requested_documents': venue.requested_documents or [],
        'verification_documents': venue.verification_documents or {},
        'rejection_reason': venue.rejection_reason or '',
        'approval_notes': venue.approval_notes or '',
    })
