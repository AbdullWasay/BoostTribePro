"""
ChatAI Service - Intelligence artificielle pour le chat publicitaire
Connaissance des produits, cartes cadeaux, et mémoire conversationnelle
"""

import os
import re
from typing import Dict, List, Optional
from datetime import datetime, timezone

class ChatAIService:
    """Service IA pour le chat publicitaire intelligent"""
    
    def __init__(self, db, openai_api_key: str):
        self.db = db
        self.api_key = openai_api_key
        self.system_prompt = """Tu es un assistant virtuel BoostTribe, expert en marketing et vente.
Tu connais parfaitement le catalogue de produits, cours, événements, cartes cadeaux et réductions.
Tu es amical, professionnel et tu aides les clients à trouver ce qu'ils recherchent.

Si tu ne connais pas une réponse, tu dois proposer de transférer la demande à un coach BoostTribe.
Utilise toujours le contexte fourni sur les produits disponibles pour répondre précisément.

Quand un client demande un produit:
1. Présente-lui les options disponibles avec prix
2. Explique les avantages
3. Propose un lien direct pour acheter
4. Suggère des produits complémentaires si pertinent

Si le client veut parler à un humain, réponds:
"Je vais transmettre votre demande à un coach BoostTribe. Il vous recontactera très rapidement!"
"""
    
    async def get_catalog_context(self) -> str:
        """Récupère le catalogue pour le contexte IA"""
        try:
            items = await self.db.catalog_items.find(
                {"is_published": True, "is_active": True},
                {"_id": 0}
            ).to_list(length=100)
            
            if not items:
                return "Aucun produit disponible actuellement."
            
            context = "📦 CATALOGUE DISPONIBLE:\n\n"
            for item in items:
                stock_info = ""
                if item.get('stock_quantity') is not None:
                    stock_info = f" (Stock: {item['stock_quantity']})"
                elif item.get('max_attendees'):
                    places_left = item['max_attendees'] - item.get('current_attendees', 0)
                    stock_info = f" ({places_left} places restantes)"
                
                context += f"- {item['title']}: {item['price']} {item['currency']}{stock_info}\n"
                context += f"  Catégorie: {item['category']}, Description: {item['description']}\n"
                context += f"  Lien: /p/{item.get('slug', item['id'])}\n\n"
            
            return context
        except Exception as e:
            print(f"Error fetching catalog context: {e}")
            return "Catalogue temporairement indisponible."
    
    async def get_gift_cards_context(self) -> str:
        """Récupère les infos sur les cartes cadeaux"""
        return """🎁 CARTES CADEAUX:
Les clients peuvent offrir des cartes cadeaux personnalisées:
- Montants configurables
- Validité 1 an
- Utilisables sur tous les produits/services
- Message personnalisé inclus
"""
    
    async def get_discounts_context(self) -> str:
        """Récupère les codes promo actifs"""
        try:
            now = datetime.now(timezone.utc)
            discounts = await self.db.discounts.find(
                {
                    "is_active": True,
                    "start_date": {"$lte": now.isoformat()},
                    "end_date": {"$gte": now.isoformat()}
                },
                {"_id": 0, "code": 1, "name": 1, "discount_type": 1, "discount_value": 1}
            ).to_list(length=10)
            
            if not discounts:
                return ""
            
            context = "💰 PROMOTIONS ACTIVES:\n\n"
            for disc in discounts:
                if disc['discount_type'] == 'percentage':
                    context += f"- Code {disc['code']}: {disc['discount_value']}% de réduction\n"
                else:
                    context += f"- Code {disc['code']}: {disc['discount_value']} CHF de réduction\n"
                context += f"  {disc['name']}\n\n"
            
            return context
        except Exception as e:
            print(f"Error fetching discounts: {e}")
            return ""
    
    async def get_conversation_history(self, visitor_email: str, limit: int = 5) -> List[Dict]:
        """Récupère l'historique des conversations d'un visiteur"""
        try:
            chats = await self.db.ad_chats.find(
                {"visitor_email": visitor_email},
                {"_id": 0, "messages": 1}
            ).sort("last_message_at", -1).limit(limit).to_list(length=limit)
            
            history = []
            for chat in chats:
                for msg in chat.get('messages', [])[-3:]:  # Derniers 3 messages par chat
                    history.append({
                        "role": "user" if msg['sender'] == 'visitor' else "assistant",
                        "content": msg['content']
                    })
            
            return history
        except Exception as e:
            print(f"Error fetching history: {e}")
            return []
    
    def detect_human_request(self, message: str) -> bool:
        """Détecte si le client demande à parler à un humain"""
        keywords = [
            "parler à quelqu'un", "parler à un humain", "agent", "coach",
            "personne réelle", "humain", "conseiller", "vendeur",
            "talk to someone", "speak to human", "real person",
            "mit jemandem sprechen", "menschlich"
        ]
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in keywords)
    
    async def generate_response(
        self,
        message: str,
        visitor_email: Optional[str] = None,
        chat_id: Optional[str] = None
    ) -> Dict:
        """Génère une réponse IA intelligente"""
        try:
            # Détection demande humaine
            needs_human = self.detect_human_request(message)
            if needs_human:
                return {
                    "response": "Je vais transmettre votre demande à un coach BoostTribe. Il vous recontactera très rapidement ! 🚀",
                    "needs_human_escalation": True,
                    "suggested_products": []
                }
            
            # Construire le contexte
            catalog_context = await self.get_catalog_context()
            gift_cards_context = await self.get_gift_cards_context()
            discounts_context = await self.get_discounts_context()
            
            # Historique conversation
            history = []
            if visitor_email:
                history = await self.get_conversation_history(visitor_email)
            
            # Préparer les messages pour l'IA
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "system", "content": f"CONTEXTE ACTUEL:\n\n{catalog_context}\n{gift_cards_context}\n{discounts_context}"}
            ]
            
            # Ajouter historique
            messages.extend(history[-5:])  # Derniers 5 échanges
            
            # Message actuel
            messages.append({"role": "user", "content": message})
            
            # Appel à l'IA (OpenAI direct)
            try:
                from openai import OpenAI
                client = OpenAI(api_key=self.api_key)
                
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=500
                )
                
                ai_response = response.choices[0].message.content
                
                # Détecter produits mentionnés pour suggestions
                suggested_products = await self._extract_product_suggestions(ai_response)
                
                return {
                    "response": ai_response,
                    "needs_human_escalation": False,
                    "suggested_products": suggested_products
                }
                
            except Exception as e:
                print(f"OpenAI API error: {e}")
                # Fallback response
                return {
                    "response": "Je suis temporairement indisponible. Un coach BoostTribe va vous contacter rapidement !",
                    "needs_human_escalation": True,
                    "suggested_products": []
                }
            
        except Exception as e:
            print(f"Error generating AI response: {e}")
            return {
                "response": "Désolé, une erreur s'est produite. Un coach va vous aider très vite !",
                "needs_human_escalation": True,
                "suggested_products": []
            }
    
    async def _extract_product_suggestions(self, ai_response: str) -> List[str]:
        """Extrait les IDs de produits suggérés depuis la réponse IA"""
        # Chercher les liens /p/ dans la réponse
        pattern = r'/p/([a-zA-Z0-9-]+)'
        matches = re.findall(pattern, ai_response)
        return matches[:3]  # Max 3 suggestions
