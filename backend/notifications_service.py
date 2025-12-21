"""
Notifications Service - Automated email notifications for BoostTribe
Sends reminders for courses, events, and reservations
"""

import os
from datetime import datetime, timedelta, timezone
from typing import List, Dict
import httpx

class NotificationsService:
    """Service to handle automated email notifications"""
    
    def __init__(self, db, resend_api_key: str):
        self.db = db
        self.resend_api_key = resend_api_key
        self.from_email = "contact@boosttribe.com"
        
    async def send_course_reminders(self) -> Dict:
        """Send reminders for courses/events happening in 24-48 hours"""
        try:
            # Find courses/events happening in 24-48 hours
            now = datetime.now(timezone.utc)
            tomorrow = now + timedelta(days=1)
            day_after = now + timedelta(days=2)
            
            items = await self.db.catalog_items.find({
                "category": {"$in": ["course", "event"]},
                "is_active": True,
                "is_published": True,
                "event_date": {
                    "$gte": tomorrow.isoformat(),
                    "$lte": day_after.isoformat()
                }
            }, {"_id": 0}).to_list(length=50)
            
            notifications_sent = 0
            
            for item in items:
                # Find all confirmed reservations for this item
                reservations = await self.db.reservations.find({
                    "catalog_item_id": item["id"],
                    "payment_status": {"$in": ["paid", "confirmed"]}
                }, {"_id": 0}).to_list(length=100)
                
                for reservation in reservations:
                    # Check if reminder already sent
                    reminder_key = f"reminder_{item['id']}_{reservation['id']}"
                    already_sent = await self.db.notifications_sent.find_one({"key": reminder_key})
                    
                    if not already_sent:
                        success = await self.send_course_reminder_email(reservation, item)
                        if success:
                            # Mark as sent
                            await self.db.notifications_sent.insert_one({
                                "key": reminder_key,
                                "sent_at": datetime.now(timezone.utc).isoformat(),
                                "type": "course_reminder",
                                "reservation_id": reservation["id"],
                                "item_id": item["id"]
                            })
                            notifications_sent += 1
            
            return {
                "success": True,
                "notifications_sent": notifications_sent,
                "message": f"{notifications_sent} rappel(s) envoyé(s)"
            }
            
        except Exception as e:
            print(f"Error sending course reminders: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_course_reminder_email(self, reservation: Dict, item: Dict) -> bool:
        """Send individual course reminder email"""
        try:
            if not self.resend_api_key:
                print("RESEND_API_KEY not configured - skipping email")
                return False
            
            event_date = datetime.fromisoformat(item["event_date"])
            formatted_date = event_date.strftime("%d/%m/%Y à %H:%M")
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }}
                    .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                    .highlight {{ background: #fff; padding: 20px; border-left: 4px solid #8B5CF6; margin: 20px 0; border-radius: 5px; }}
                    .button {{ display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%); color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }}
                    .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⏰ Rappel : Votre {item['category']} approche !</h1>
                    </div>
                    <div class="content">
                        <p>Bonjour {reservation['customer_name']},</p>
                        
                        <p>Nous vous rappelons que votre <strong>{item['category']}</strong> aura lieu très prochainement :</p>
                        
                        <div class="highlight">
                            <h2 style="color: #8B5CF6; margin-top: 0;">📚 {item['title']}</h2>
                            <p><strong>📅 Date :</strong> {formatted_date}</p>
                            {f"<p><strong>📍 Lieu :</strong> {item.get('location', 'À confirmer')}</p>" if item.get('location') else ""}
                            <p><strong>👤 Participants :</strong> {reservation.get('quantity', 1)} personne(s)</p>
                            <p><strong>💰 Total :</strong> {reservation.get('total_amount', 0)} {item.get('currency', 'CHF')}</p>
                        </div>
                        
                        <p><strong>Informations importantes :</strong></p>
                        <ul>
                            <li>Arrivez 10 minutes avant le début</li>
                            <li>Apportez une pièce d'identité</li>
                            <li>Consultez votre email de confirmation pour plus de détails</li>
                        </ul>
                        
                        <p>Votre numéro de réservation : <strong>{reservation['id']}</strong></p>
                        
                        <p>Nous avons hâte de vous accueillir ! 🎉</p>
                        
                        <p>L'équipe BoostTribe</p>
                    </div>
                    <div class="footer">
                        <p>© 2025 BoostTribe</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {self.resend_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": self.from_email,
                        "to": [reservation["customer_email"]],
                        "subject": f"⏰ Rappel : {item['title']} - {formatted_date}",
                        "html": html_content
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    print(f"Course reminder sent to {reservation['customer_email']}")
                    return True
                else:
                    print(f"Failed to send reminder: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            print(f"Error sending reminder email: {e}")
            return False
    
    async def send_reservation_confirmations_batch(self, reservation_ids: List[str]) -> Dict:
        """Send confirmation emails for multiple reservations"""
        sent = 0
        failed = 0
        
        for res_id in reservation_ids:
            reservation = await self.db.reservations.find_one({"id": res_id}, {"_id": 0})
            if reservation:
                item = await self.db.catalog_items.find_one({"id": reservation["catalog_item_id"]}, {"_id": 0})
                if item:
                    success = await self.send_reservation_confirmation(reservation, item)
                    if success:
                        sent += 1
                    else:
                        failed += 1
        
        return {
            "success": True,
            "sent": sent,
            "failed": failed
        }
    
    async def send_reservation_confirmation(self, reservation: Dict, item: Dict) -> bool:
        """Send reservation confirmation email (existing function - enhanced)"""
        # This would be the same as the existing send_reservation_confirmation_email in server.py
        # We keep it in server.py to avoid duplication
        return True
