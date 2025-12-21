from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, BackgroundTasks
from fastapi.responses import Response, RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import io
import base64
from openai import OpenAI
import resend
import openpyxl
import pandas as pd


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ========================
# MODELS
# ========================

class AdminSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    openai_api_key: Optional[str] = None
    resend_api_key: Optional[str] = None
    company_name: str = "Afroboost"
    sender_email: str = "contact@afroboost.com"
    sender_name: str = "Coach Bassi"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminSettingsUpdate(BaseModel):
    openai_api_key: Optional[str] = None
    resend_api_key: Optional[str] = None
    company_name: Optional[str] = None
    sender_email: Optional[str] = None
    sender_name: Optional[str] = None

class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    tags: List[str] = []
    group: str = "general"
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    stats: Dict = {"emails_received": 0, "emails_opened": 0, "emails_clicked": 0}

class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    tags: List[str] = []
    group: str = "general"
    active: bool = True

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    tags: Optional[List[str]] = None
    group: Optional[str] = None
    active: Optional[bool] = None

class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subject: str
    content_html: str
    language: str = "fr"
    status: str = "draft"  # draft, scheduled, sending, sent, failed
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    target_groups: List[str] = []
    target_tags: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    stats: Dict = {"sent": 0, "opened": 0, "clicked": 0, "failed": 0}

class CampaignCreate(BaseModel):
    title: str
    subject: str
    content_html: str
    language: str = "fr"
    scheduled_at: Optional[datetime] = None
    target_groups: List[str] = []
    target_tags: List[str] = []

class CampaignUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    content_html: Optional[str] = None
    language: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    target_groups: Optional[List[str]] = None
    target_tags: Optional[List[str]] = None
    status: Optional[str] = None

class EmailLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    contact_id: str
    contact_email: str
    status: str  # sent, opened, clicked, failed, bounced
    sent_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    error_message: Optional[str] = None

class AIGenerateRequest(BaseModel):
    prompt: str
    language: str = "fr"
    tone: str = "professional"  # professional, friendly, energetic
    type: str = "email"  # email, subject, cta

class AIGenerateResponse(BaseModel):
    content: str
    language: str


# ========================
# HELPER FUNCTIONS
# ========================

async def get_settings():
    """Get admin settings from database"""
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings:
        # Create default settings
        default_settings = AdminSettings(
            openai_api_key=os.getenv('OPENAI_API_KEY', ''),
            resend_api_key=os.getenv('RESEND_API_KEY', '')
        )
        doc = default_settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.settings.insert_one(doc)
        return default_settings
    
    if isinstance(settings.get('updated_at'), str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    return AdminSettings(**settings)

def get_openai_client(api_key: str):
    """Create OpenAI client with API key"""
    if not api_key:
        raise HTTPException(status_code=400, detail="OpenAI API key not configured")
    return OpenAI(api_key=api_key)

def get_resend_client(api_key: str):
    """Configure Resend with API key"""
    if not api_key:
        raise HTTPException(status_code=400, detail="Resend API key not configured")
    resend.api_key = api_key

async def get_contacts_by_filters(groups: List[str] = None, tags: List[str] = None, active_only: bool = True):
    """Get contacts filtered by groups and tags"""
    query = {}
    if active_only:
        query['active'] = True
    if groups:
        query['group'] = {'$in': groups}
    if tags:
        query['tags'] = {'$in': tags}
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(10000)
    for contact in contacts:
        if isinstance(contact.get('created_at'), str):
            contact['created_at'] = datetime.fromisoformat(contact['created_at'])
    return [Contact(**c) for c in contacts]


# ========================
# ROUTES - SETTINGS
# ========================

@api_router.get("/settings", response_model=AdminSettings)
async def get_admin_settings():
    """Get admin settings"""
    return await get_settings()

@api_router.put("/settings", response_model=AdminSettings)
async def update_admin_settings(settings_update: AdminSettingsUpdate):
    """Update admin settings"""
    current_settings = await get_settings()
    update_data = settings_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(current_settings, key, value)
    
    current_settings.updated_at = datetime.now(timezone.utc)
    
    doc = current_settings.model_dump()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.settings.update_one({}, {"$set": doc}, upsert=True)
    return current_settings


# ========================
# ROUTES - CONTACTS
# ========================

@api_router.get("/contacts", response_model=List[Contact])
async def get_contacts(group: Optional[str] = None, active: Optional[bool] = None):
    """Get all contacts with optional filters"""
    query = {}
    if group:
        query['group'] = group
    if active is not None:
        query['active'] = active
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(10000)
    for contact in contacts:
        if isinstance(contact.get('created_at'), str):
            contact['created_at'] = datetime.fromisoformat(contact['created_at'])
    return contacts

@api_router.get("/contacts/{contact_id}", response_model=Contact)
async def get_contact(contact_id: str):
    """Get a specific contact"""
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if isinstance(contact.get('created_at'), str):
        contact['created_at'] = datetime.fromisoformat(contact['created_at'])
    return contact

@api_router.post("/contacts", response_model=Contact)
async def create_contact(contact_data: ContactCreate):
    """Create a new contact"""
    # Check if email already exists
    existing = await db.contacts.find_one({"email": contact_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Contact with this email already exists")
    
    contact = Contact(**contact_data.model_dump())
    doc = contact.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.contacts.insert_one(doc)
    return contact

@api_router.put("/contacts/{contact_id}", response_model=Contact)
async def update_contact(contact_id: str, contact_update: ContactUpdate):
    """Update a contact"""
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    if isinstance(contact.get('created_at'), str):
        contact['created_at'] = datetime.fromisoformat(contact['created_at'])
    
    contact_obj = Contact(**contact)
    update_data = contact_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(contact_obj, key, value)
    
    doc = contact_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.contacts.update_one({"id": contact_id}, {"$set": doc})
    return contact_obj

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str):
    """Delete a contact"""
    result = await db.contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted successfully"}

@api_router.post("/contacts/import")
async def import_contacts(file: UploadFile = File(...)):
    """Import contacts from CSV/Excel file"""
    try:
        contents = await file.read()
        
        # Try to read as Excel first
        try:
            df = pd.read_excel(io.BytesIO(contents))
        except:
            # Fall back to CSV
            df = pd.read_csv(io.BytesIO(contents))
        
        # Validate required columns
        required_cols = ['name', 'email']
        for col in required_cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Missing required column: {col}")
        
        imported = 0
        duplicates = 0
        errors = 0
        
        for _, row in df.iterrows():
            try:
                # Check if email exists
                existing = await db.contacts.find_one({"email": row['email']}, {"_id": 0})
                if existing:
                    duplicates += 1
                    continue
                
                contact = Contact(
                    name=str(row['name']),
                    email=str(row['email']),
                    tags=str(row.get('tags', '')).split(',') if pd.notna(row.get('tags')) else [],
                    group=str(row.get('group', 'general')),
                    active=bool(row.get('active', True))
                )
                
                doc = contact.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                
                await db.contacts.insert_one(doc)
                imported += 1
            except Exception as e:
                logger.error(f"Error importing contact: {e}")
                errors += 1
        
        return {
            "imported": imported,
            "duplicates": duplicates,
            "errors": errors,
            "total": len(df)
        }
    
    except Exception as e:
        logger.error(f"Error importing file: {e}")
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

@api_router.get("/contacts/export/csv")
async def export_contacts_csv():
    """Export contacts as CSV"""
    contacts = await db.contacts.find({}, {"_id": 0}).to_list(10000)
    
    if not contacts:
        raise HTTPException(status_code=404, detail="No contacts to export")
    
    df = pd.DataFrame(contacts)
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    
    return Response(
        content=csv_buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=contacts.csv"}
    )


# ========================
# ROUTES - CAMPAIGNS
# ========================

@api_router.get("/campaigns", response_model=List[Campaign])
async def get_campaigns():
    """Get all campaigns"""
    campaigns = await db.campaigns.find({}, {"_id": 0}).to_list(1000)
    for campaign in campaigns:
        for date_field in ['created_at', 'scheduled_at', 'sent_at']:
            if campaign.get(date_field) and isinstance(campaign[date_field], str):
                campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    return campaigns

@api_router.get("/campaigns/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str):
    """Get a specific campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    for date_field in ['created_at', 'scheduled_at', 'sent_at']:
        if campaign.get(date_field) and isinstance(campaign[date_field], str):
            campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    return campaign

@api_router.post("/campaigns", response_model=Campaign)
async def create_campaign(campaign_data: CampaignCreate):
    """Create a new campaign"""
    campaign = Campaign(**campaign_data.model_dump())
    if campaign_data.scheduled_at:
        campaign.status = "scheduled"
    
    doc = campaign.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('scheduled_at'):
        doc['scheduled_at'] = doc['scheduled_at'].isoformat()
    if doc.get('sent_at'):
        doc['sent_at'] = doc['sent_at'].isoformat()
    
    await db.campaigns.insert_one(doc)
    return campaign

@api_router.put("/campaigns/{campaign_id}", response_model=Campaign)
async def update_campaign(campaign_id: str, campaign_update: CampaignUpdate):
    """Update a campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    for date_field in ['created_at', 'scheduled_at', 'sent_at']:
        if campaign.get(date_field) and isinstance(campaign[date_field], str):
            campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    
    campaign_obj = Campaign(**campaign)
    update_data = campaign_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(campaign_obj, key, value)
    
    doc = campaign_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('scheduled_at'):
        doc['scheduled_at'] = doc['scheduled_at'].isoformat()
    if doc.get('sent_at'):
        doc['sent_at'] = doc['sent_at'].isoformat()
    
    await db.campaigns.update_one({"id": campaign_id}, {"$set": doc})
    return campaign_obj

@api_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str):
    """Delete a campaign"""
    result = await db.campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted successfully"}

@api_router.post("/campaigns/{campaign_id}/send")
async def send_campaign(campaign_id: str, background_tasks: BackgroundTasks):
    """Send a campaign immediately"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    for date_field in ['created_at', 'scheduled_at', 'sent_at']:
        if campaign.get(date_field) and isinstance(campaign[date_field], str):
            campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    
    campaign_obj = Campaign(**campaign)
    
    if campaign_obj.status == "sent":
        raise HTTPException(status_code=400, detail="Campaign already sent")
    
    # Update status to sending
    await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"status": "sending"}}
    )
    
    # Send emails in background
    background_tasks.add_task(send_campaign_emails, campaign_id)
    
    return {"message": "Campaign is being sent", "campaign_id": campaign_id}

async def send_campaign_emails(campaign_id: str):
    """Background task to send campaign emails"""
    try:
        campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
        if not campaign:
            return
        
        for date_field in ['created_at', 'scheduled_at', 'sent_at']:
            if campaign.get(date_field) and isinstance(campaign[date_field], str):
                campaign[date_field] = datetime.fromisoformat(campaign[date_field])
        
        campaign_obj = Campaign(**campaign)
        settings = await get_settings()
        
        # Get target contacts
        contacts = await get_contacts_by_filters(
            groups=campaign_obj.target_groups if campaign_obj.target_groups else None,
            tags=campaign_obj.target_tags if campaign_obj.target_tags else None
        )
        
        if not contacts:
            logger.warning(f"No contacts found for campaign {campaign_id}")
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$set": {"status": "failed"}}
            )
            return
        
        get_resend_client(settings.resend_api_key)
        
        sent_count = 0
        failed_count = 0
        
        for contact in contacts:
            try:
                # Create tracking pixel
                tracking_pixel = f'<img src="{os.getenv("REACT_APP_BACKEND_URL", "http://localhost:8001")}/api/track/open/{campaign_id}/{contact.id}" width="1" height="1" />'
                
                # Add tracking to links
                content_with_tracking = campaign_obj.content_html.replace(
                    'href="',
                    f'href="{os.getenv("REACT_APP_BACKEND_URL", "http://localhost:8001")}/api/track/click/{campaign_id}/{contact.id}?url='
                )
                
                # Add tracking pixel
                content_with_tracking += tracking_pixel
                
                # Send email
                params = {
                    "from": f"{settings.sender_name} <{settings.sender_email}>",
                    "to": [contact.email],
                    "subject": campaign_obj.subject,
                    "html": content_with_tracking,
                }
                
                resend.Emails.send(params)
                
                # Log email
                email_log = EmailLog(
                    campaign_id=campaign_id,
                    contact_id=contact.id,
                    contact_email=contact.email,
                    status="sent"
                )
                log_doc = email_log.model_dump()
                log_doc['sent_at'] = log_doc['sent_at'].isoformat()
                await db.email_logs.insert_one(log_doc)
                
                # Update contact stats
                await db.contacts.update_one(
                    {"id": contact.id},
                    {"$inc": {"stats.emails_received": 1}}
                )
                
                sent_count += 1
                
            except Exception as e:
                logger.error(f"Error sending email to {contact.email}: {e}")
                failed_count += 1
                
                # Log failed email
                email_log = EmailLog(
                    campaign_id=campaign_id,
                    contact_id=contact.id,
                    contact_email=contact.email,
                    status="failed",
                    error_message=str(e)
                )
                log_doc = email_log.model_dump()
                log_doc['sent_at'] = log_doc['sent_at'].isoformat()
                await db.email_logs.insert_one(log_doc)
        
        # Update campaign
        await db.campaigns.update_one(
            {"id": campaign_id},
            {
                "$set": {
                    "status": "sent",
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "stats.sent": sent_count,
                    "stats.failed": failed_count
                }
            }
        )
        
        logger.info(f"Campaign {campaign_id} sent: {sent_count} sent, {failed_count} failed")
        
    except Exception as e:
        logger.error(f"Error sending campaign {campaign_id}: {e}")
        await db.campaigns.update_one(
            {"id": campaign_id},
            {"$set": {"status": "failed"}}
        )


# ========================
# ROUTES - TRACKING
# ========================

@api_router.get("/track/open/{campaign_id}/{contact_id}")
async def track_email_open(campaign_id: str, contact_id: str):
    """Track email open via pixel"""
    try:
        # Update email log
        await db.email_logs.update_one(
            {"campaign_id": campaign_id, "contact_id": contact_id, "status": "sent"},
            {
                "$set": {
                    "status": "opened",
                    "opened_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Update campaign stats
        await db.campaigns.update_one(
            {"id": campaign_id},
            {"$inc": {"stats.opened": 1}}
        )
        
        # Update contact stats
        await db.contacts.update_one(
            {"id": contact_id},
            {"$inc": {"stats.emails_opened": 1}}
        )
        
    except Exception as e:
        logger.error(f"Error tracking open: {e}")
    
    # Return 1x1 transparent pixel
    pixel = base64.b64decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')
    return Response(content=pixel, media_type="image/gif")

@api_router.get("/track/click/{campaign_id}/{contact_id}")
async def track_email_click(campaign_id: str, contact_id: str, url: str):
    """Track email click via redirect"""
    try:
        # Update email log
        log = await db.email_logs.find_one(
            {"campaign_id": campaign_id, "contact_id": contact_id},
            {"_id": 0}
        )
        
        if log and log['status'] != 'clicked':
            await db.email_logs.update_one(
                {"campaign_id": campaign_id, "contact_id": contact_id},
                {
                    "$set": {
                        "status": "clicked",
                        "clicked_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # Update campaign stats
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$inc": {"stats.clicked": 1}}
            )
            
            # Update contact stats
            await db.contacts.update_one(
                {"id": contact_id},
                {"$inc": {"stats.emails_clicked": 1}}
            )
    
    except Exception as e:
        logger.error(f"Error tracking click: {e}")
    
    return RedirectResponse(url=url)


# ========================
# ROUTES - ANALYTICS
# ========================

@api_router.get("/analytics/overview")
async def get_analytics_overview():
    """Get overall analytics"""
    total_contacts = await db.contacts.count_documents({})
    active_contacts = await db.contacts.count_documents({"active": True})
    total_campaigns = await db.campaigns.count_documents({})
    sent_campaigns = await db.campaigns.count_documents({"status": "sent"})
    total_emails_sent = await db.email_logs.count_documents({"status": {"$in": ["sent", "opened", "clicked"]}})
    total_emails_opened = await db.email_logs.count_documents({"status": {"$in": ["opened", "clicked"]}})
    total_emails_clicked = await db.email_logs.count_documents({"status": "clicked"})
    
    open_rate = (total_emails_opened / total_emails_sent * 100) if total_emails_sent > 0 else 0
    click_rate = (total_emails_clicked / total_emails_sent * 100) if total_emails_sent > 0 else 0
    
    return {
        "total_contacts": total_contacts,
        "active_contacts": active_contacts,
        "total_campaigns": total_campaigns,
        "sent_campaigns": sent_campaigns,
        "total_emails_sent": total_emails_sent,
        "total_emails_opened": total_emails_opened,
        "total_emails_clicked": total_emails_clicked,
        "open_rate": round(open_rate, 2),
        "click_rate": round(click_rate, 2)
    }

@api_router.get("/analytics/campaigns")
async def get_campaign_analytics():
    """Get campaign performance analytics"""
    campaigns = await db.campaigns.find({"status": "sent"}, {"_id": 0}).to_list(1000)
    
    analytics = []
    for campaign in campaigns:
        sent = campaign['stats'].get('sent', 0)
        opened = campaign['stats'].get('opened', 0)
        clicked = campaign['stats'].get('clicked', 0)
        
        open_rate = (opened / sent * 100) if sent > 0 else 0
        click_rate = (clicked / sent * 100) if sent > 0 else 0
        
        analytics.append({
            "campaign_id": campaign['id'],
            "title": campaign['title'],
            "sent": sent,
            "opened": opened,
            "clicked": clicked,
            "open_rate": round(open_rate, 2),
            "click_rate": round(click_rate, 2),
            "sent_at": campaign.get('sent_at')
        })
    
    return analytics


# ========================
# ROUTES - AI
# ========================

@api_router.post("/ai/generate", response_model=AIGenerateResponse)
async def generate_ai_content(request: AIGenerateRequest):
    """Generate email content using AI"""
    settings = await get_settings()
    
    try:
        client = get_openai_client(settings.openai_api_key)
        
        # Build prompt based on type
        if request.type == "subject":
            system_prompt = f"You are an expert email marketer. Generate a compelling email subject line in {request.language}. Be concise and engaging."
            user_prompt = f"Create an email subject line for: {request.prompt}\nTone: {request.tone}\nLanguage: {request.language}"
        elif request.type == "cta":
            system_prompt = f"You are an expert copywriter. Generate a compelling call-to-action button text in {request.language}."
            user_prompt = f"Create a CTA for: {request.prompt}\nTone: {request.tone}\nLanguage: {request.language}"
        else:  # email
            system_prompt = f"You are an expert email marketer for Afroboost, a dance and fitness company. Generate professional HTML email content in {request.language}. Include proper formatting with paragraphs, bold text where appropriate, and a clear structure."
            user_prompt = f"Create an email about: {request.prompt}\nTone: {request.tone}\nLanguage: {request.language}\n\nFormat the response as clean HTML (use <p>, <strong>, <br> tags). Do not include <html>, <body> or <head> tags, just the content."
        
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        content = response.choices[0].message.content
        
        return AIGenerateResponse(
            content=content,
            language=request.language
        )
        
    except Exception as e:
        logger.error(f"Error generating AI content: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating content: {str(e)}")


# ========================
# BASE ROUTES
# ========================

@api_router.get("/")
async def root():
    return {"message": "Afroboost Mailer API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
