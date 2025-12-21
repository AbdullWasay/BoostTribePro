"""
WhatsApp Business API Service
Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
"""
import requests
import os
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class WhatsAppService:
    def __init__(self, access_token: str, phone_number_id: str):
        """
        Initialize WhatsApp Business API client
        
        Args:
            access_token: Meta WhatsApp Business API token
            phone_number_id: Phone number ID from Meta Business
        """
        self.access_token = access_token
        self.phone_number_id = phone_number_id
        self.base_url = f"https://graph.facebook.com/v18.0/{phone_number_id}"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    
    def send_text_message(self, to: str, message: str) -> Dict:
        """
        Send a text message via WhatsApp
        
        Args:
            to: Recipient phone number with country code (e.g., "41791234567")
            message: Text message content
            
        Returns:
            Response from WhatsApp API
        """
        try:
            url = f"{self.base_url}/messages"
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to,
                "type": "text",
                "text": {
                    "preview_url": False,
                    "body": message
                }
            }
            
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            return response.json()
        except Exception as e:
            logger.error(f"Error sending WhatsApp message to {to}: {e}")
            raise
    
    def send_template_message(self, to: str, template_name: str, language: str = "fr", 
                             components: Optional[List] = None) -> Dict:
        """
        Send a template message (for campaigns)
        
        Args:
            to: Recipient phone number
            template_name: Name of the approved template
            language: Language code (fr, en, de)
            components: Template components (header, body, buttons)
        """
        try:
            url = f"{self.base_url}/messages"
            payload = {
                "messaging_product": "whatsapp",
                "to": to,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": language}
                }
            }
            
            if components:
                payload["template"]["components"] = components
            
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            return response.json()
        except Exception as e:
            logger.error(f"Error sending WhatsApp template to {to}: {e}")
            raise
    
    def send_media_message(self, to: str, media_type: str, media_url: str, 
                          caption: Optional[str] = None) -> Dict:
        """
        Send media (image, video, document)
        
        Args:
            to: Recipient phone number
            media_type: Type of media (image, video, document)
            media_url: URL of the media file
            caption: Optional caption for the media
        """
        try:
            url = f"{self.base_url}/messages"
            payload = {
                "messaging_product": "whatsapp",
                "to": to,
                "type": media_type,
                media_type: {
                    "link": media_url
                }
            }
            
            if caption and media_type in ["image", "video"]:
                payload[media_type]["caption"] = caption
            
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            return response.json()
        except Exception as e:
            logger.error(f"Error sending WhatsApp media to {to}: {e}")
            raise
    
    def mark_message_read(self, message_id: str) -> Dict:
        """
        Mark a message as read
        
        Args:
            message_id: ID of the message to mark as read
        """
        try:
            url = f"{self.base_url}/messages"
            payload = {
                "messaging_product": "whatsapp",
                "status": "read",
                "message_id": message_id
            }
            
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            return response.json()
        except Exception as e:
            logger.error(f"Error marking message as read: {e}")
            raise
    
    def get_media(self, media_id: str) -> bytes:
        """
        Download media from WhatsApp
        
        Args:
            media_id: ID of the media to download
            
        Returns:
            Media binary content
        """
        try:
            # First, get media URL
            url = f"https://graph.facebook.com/v18.0/{media_id}"
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            media_url = response.json().get("url")
            
            # Then download the media
            media_response = requests.get(media_url, headers=self.headers)
            media_response.raise_for_status()
            
            return media_response.content
        except Exception as e:
            logger.error(f"Error downloading media {media_id}: {e}")
            raise
    
    @staticmethod
    def verify_webhook(mode: str, token: str, challenge: str, verify_token: str) -> Optional[str]:
        """
        Verify webhook subscription
        
        Args:
            mode: Mode parameter from webhook
            token: Token parameter from webhook
            challenge: Challenge parameter from webhook
            verify_token: Your verify token
            
        Returns:
            Challenge if verification succeeds, None otherwise
        """
        if mode == "subscribe" and token == verify_token:
            logger.info("Webhook verified successfully")
            return challenge
        return None
