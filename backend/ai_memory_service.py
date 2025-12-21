"""
AI Memory Service for conversational context
Maintains conversation history for personalized responses
"""
from typing import List, Dict, Optional
from datetime import datetime, timezone
from collections import deque
import logging

logger = logging.getLogger(__name__)


class AIMemoryService:
    def __init__(self, db, max_history: int = 5):
        """
        Initialize AI Memory Service
        
        Args:
            db: MongoDB database instance
            max_history: Maximum number of messages to keep in memory per contact
        """
        self.db = db
        self.max_history = max_history
        # In-memory cache for fast access
        self.conversation_cache: Dict[str, deque] = {}
    
    async def add_message(self, contact_id: str, role: str, content: str, 
                         channel: str = "whatsapp") -> None:
        """
        Add a message to conversation history
        
        Args:
            contact_id: ID of the contact
            role: 'user' or 'assistant'
            content: Message content
            channel: Communication channel (whatsapp, email)
        """
        try:
            message = {
                "role": role,
                "content": content,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "channel": channel
            }
            
            # Update in-memory cache
            if contact_id not in self.conversation_cache:
                self.conversation_cache[contact_id] = deque(maxlen=self.max_history)
            
            self.conversation_cache[contact_id].append(message)
            
            # Persist to database
            await self.db.conversation_history.update_one(
                {"contact_id": contact_id},
                {
                    "$push": {
                        "messages": {
                            "$each": [message],
                            "$slice": -self.max_history  # Keep only last N messages
                        }
                    },
                    "$set": {
                        "last_updated": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            
            logger.info(f"Added {role} message to conversation for contact {contact_id}")
        except Exception as e:
            logger.error(f"Error adding message to conversation history: {e}")
    
    async def get_conversation_history(self, contact_id: str) -> List[Dict]:
        """
        Get conversation history for a contact
        
        Args:
            contact_id: ID of the contact
            
        Returns:
            List of messages in chronological order
        """
        try:
            # Check cache first
            if contact_id in self.conversation_cache:
                return list(self.conversation_cache[contact_id])
            
            # Load from database
            conversation = await self.db.conversation_history.find_one(
                {"contact_id": contact_id},
                {"_id": 0, "messages": 1}
            )
            
            if conversation and "messages" in conversation:
                messages = conversation["messages"]
                # Update cache
                self.conversation_cache[contact_id] = deque(messages, maxlen=self.max_history)
                return messages
            
            return []
        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            return []
    
    async def clear_conversation(self, contact_id: str) -> None:
        """
        Clear conversation history for a contact
        
        Args:
            contact_id: ID of the contact
        """
        try:
            # Clear from cache
            if contact_id in self.conversation_cache:
                del self.conversation_cache[contact_id]
            
            # Clear from database
            await self.db.conversation_history.delete_one({"contact_id": contact_id})
            
            logger.info(f"Cleared conversation history for contact {contact_id}")
        except Exception as e:
            logger.error(f"Error clearing conversation history: {e}")
    
    async def get_context_for_ai(self, contact_id: str, contact_name: str, 
                                campaign_context: Optional[str] = None) -> str:
        """
        Build context string for AI from conversation history
        
        Args:
            contact_id: ID of the contact
            contact_name: Name of the contact
            campaign_context: Optional context about current campaign
            
        Returns:
            Formatted context string for AI
        """
        try:
            history = await self.get_conversation_history(contact_id)
            
            context_parts = [
                f"Conversation avec {contact_name}:",
                ""
            ]
            
            if campaign_context:
                context_parts.append(f"Contexte de la campagne: {campaign_context}")
                context_parts.append("")
            
            if history:
                context_parts.append("Historique récent:")
                for msg in history:
                    role_label = "Client" if msg["role"] == "user" else "Vous (Afroboost)"
                    context_parts.append(f"{role_label}: {msg['content']}")
            else:
                context_parts.append("Première interaction avec ce contact.")
            
            return "\n".join(context_parts)
        except Exception as e:
            logger.error(f"Error building AI context: {e}")
            return f"Conversation avec {contact_name}"
    
    async def get_conversation_summary(self, contact_id: str) -> Dict:
        """
        Get summary statistics for a conversation
        
        Args:
            contact_id: ID of the contact
            
        Returns:
            Dictionary with conversation statistics
        """
        try:
            history = await self.get_conversation_history(contact_id)
            
            user_messages = [msg for msg in history if msg["role"] == "user"]
            assistant_messages = [msg for msg in history if msg["role"] == "assistant"]
            
            return {
                "total_messages": len(history),
                "user_messages": len(user_messages),
                "assistant_messages": len(assistant_messages),
                "last_interaction": history[-1]["timestamp"] if history else None,
                "channels_used": list(set(msg.get("channel", "unknown") for msg in history))
            }
        except Exception as e:
            logger.error(f"Error getting conversation summary: {e}")
            return {
                "total_messages": 0,
                "user_messages": 0,
                "assistant_messages": 0,
                "last_interaction": None,
                "channels_used": []
            }
