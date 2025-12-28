import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class WhatsAppClient:
    """Simple WhatsApp Cloud API client for sending text messages"""
    
    def __init__(
        self,
        phone_id: str,
        access_token: str,
        api_version: str = "v20.0",
        base_url: str = "https://graph.facebook.com"
    ):
        self.phone_id = phone_id
        self.access_token = access_token
        self.api_version = api_version
        self.base_url = base_url
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            timeout=30.0
        )
    
    def _get_url(self, endpoint: str) -> str:
        """Construct full API URL"""
        return f"{self.base_url}/{self.api_version}/{self.phone_id}/{endpoint}"
    
    async def send_text_message(
        self,
        recipient_phone: str,
        message_text: str,
        preview_url: bool = False
    ) -> Dict[str, Any]:
        """
        Send a simple text message
        
        Args:
            recipient_phone: Phone number in E.164 format (e.g., +15551234567)
            message_text: Message body text
            preview_url: Whether to show URL previews
            
        Returns:
            Response from WhatsApp API with message_id
        """
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient_phone,
            "type": "text",
            "text": {
                "preview_url": preview_url,
                "body": message_text
            }
        }
        
        try:
            response = await self.client.post(
                self._get_url("messages"),
                json=payload
            )
            response.raise_for_status()
            result = response.json()
            logger.info(f"WhatsApp message sent to {recipient_phone}")
            return result
        except httpx.HTTPError as e:
            logger.error(f"Failed to send WhatsApp message: {e}")
            if hasattr(e, 'response') and e.response is not None:
                error_detail = e.response.json() if e.response.text else str(e)
                logger.error(f"WhatsApp API error: {error_detail}")
            raise Exception(f"WhatsApp API error: {str(e)}")
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
