"""
Google OAuth 2.0 authentication service
"""
from google.oauth2 import id_token
from google.auth.transport import requests
from typing import Dict, Optional
from ..config import settings


class GoogleAuthError(Exception):
    """Google authentication error"""
    pass


async def verify_google_token(token: str) -> Dict[str, str]:
    """
    Verify Google ID Token and extract user information

    Args:
        token: Google ID Token from frontend

    Returns:
        Dict containing user info:
        - email: User's email address
        - name: User's full name
        - picture: User's profile picture URL
        - sub: Google user ID (unique identifier)

    Raises:
        GoogleAuthError: If token verification fails
    """
    try:
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )

        # Verify the issuer
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise GoogleAuthError('Invalid token issuer')

        # Extract user information
        user_info = {
            'email': idinfo.get('email', ''),
            'name': idinfo.get('name', ''),
            'picture': idinfo.get('picture', ''),
            'sub': idinfo.get('sub', ''),  # Google user ID
        }

        # Validate required fields
        if not user_info['email'] or not user_info['sub']:
            raise GoogleAuthError('Missing required user information')

        return user_info

    except ValueError as e:
        # Invalid token
        raise GoogleAuthError(f'Invalid token: {str(e)}')
    except Exception as e:
        # Other errors
        raise GoogleAuthError(f'Token verification failed: {str(e)}')
