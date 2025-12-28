from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, BackgroundTasks, Request, Depends
from fastapi.responses import Response, RedirectResponse, JSONResponse, HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
import re
from datetime import datetime, timezone, timedelta
import io
import base64
from openai import OpenAI
import resend
import openpyxl
import pandas as pd
import stripe
import bcrypt
import jwt

# Configure logging early so it's available for imports
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from whatsapp_service import WhatsAppService
from ai_memory_service import AIMemoryService
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
    EMERGENT_AVAILABLE = True
except ImportError:
    EMERGENT_AVAILABLE = False
    try:
        logger.warning("emergentintegrations not available - some AI features may be disabled")
    except NameError:
        print("WARNING: emergentintegrations not available - some AI features may be disabled")


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
# Add SSL options for MongoDB Atlas connections if using mongodb+srv
# Note: LibreSSL on macOS may have SSL handshake issues - using relaxed settings as workaround
if mongo_url.startswith('mongodb+srv'):
    client = AsyncIOMotorClient(
        mongo_url,
        tlsAllowInvalidCertificates=True,  # Workaround for LibreSSL SSL handshake issues on macOS
        serverSelectionTimeoutMS=30000,  # 30 seconds (increased from default)
        connectTimeoutMS=30000,
        socketTimeoutMS=30000
    )
else:
    client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Initialize AI Memory Service
ai_memory = AIMemoryService(db)

# Initialize Chat AI Service
from chat_ai_service import ChatAIService
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
chat_ai = ChatAIService(db, OPENAI_API_KEY) if OPENAI_API_KEY else None

# Initialize Notifications Service
from notifications_service import NotificationsService
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
notifications_service = NotificationsService(db, RESEND_API_KEY) if RESEND_API_KEY else None

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Security
security = HTTPBearer()


# ========================
# MODELS
# ========================

# User Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str = "user"  # "admin" or "user"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: datetime
    last_login: Optional[datetime] = None

class AuthResponse(BaseModel):
    user: UserResponse
    token: str

class PasswordResetToken(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    used: bool = False

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# Catalog & Reservations Models
class CatalogItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Coach/seller ID
    title: str
    slug: str  # URL-friendly version of title (e.g., "cours-yoga-debutant")
    description: str
    category: str  # course, event, product
    price: float
    currency: str = "CHF"
    image_url: Optional[str] = None
    stock_quantity: Optional[int] = None  # None = unlimited
    max_attendees: Optional[int] = None  # For events/courses
    current_attendees: int = 0
    
    # Event/Course specific fields
    event_date: Optional[datetime] = None  # For one-time events
    event_duration: Optional[int] = None  # Duration in minutes
    location: Optional[str] = None
    
    # Recurring events (weekly courses)
    is_recurring: bool = False  # True for weekly/recurring courses
    recurrence_type: Optional[str] = None  # "weekly", "monthly", None
    recurrence_days: List[str] = []  # ["monday", "wednesday", "friday"]
    recurrence_time: Optional[str] = None  # "19:00" for display
    
    # Status
    is_active: bool = True
    is_published: bool = True
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CatalogItemCreate(BaseModel):
    title: str
    description: str
    category: str
    price: float
    currency: str = "CHF"
    image_url: Optional[str] = None
    stock_quantity: Optional[int] = None
    max_attendees: Optional[int] = None
    event_date: Optional[str] = None
    event_duration: Optional[int] = None
    location: Optional[str] = None
    is_recurring: bool = False
    recurrence_type: Optional[str] = None
    recurrence_days: List[str] = []
    recurrence_time: Optional[str] = None

class CatalogItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    image_url: Optional[str] = None
    stock_quantity: Optional[int] = None
    max_attendees: Optional[int] = None
    is_active: Optional[bool] = None
    is_published: Optional[bool] = None
    event_date: Optional[str] = None
    event_duration: Optional[int] = None
    location: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_type: Optional[str] = None
    recurrence_days: Optional[List[str]] = None
    recurrence_time: Optional[str] = None

class Reservation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    catalog_item_id: str
    user_id: str  # Coach/seller ID
    
    # Customer info
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    
    # Reservation details
    quantity: int = 1
    total_price: float
    currency: str = "CHF"
    
    # Payment info
    payment_method: Optional[str] = None  # stripe, twint, cash, bank_transfer
    payment_status: str = "pending"  # pending, completed, failed, refunded
    payment_intent_id: Optional[str] = None  # Stripe payment intent ID
    
    # Status
    status: str = "pending"  # pending, confirmed, cancelled, completed
    
    # Timestamps
    reservation_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    notes: Optional[str] = None

class ReservationCreate(BaseModel):
    catalog_item_id: str
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    quantity: int = 1
    payment_method: str = "stripe"
    notes: Optional[str] = None

class PaymentTransaction(BaseModel):
    """Model for tracking all payment transactions"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str  # Stripe session ID
    payment_id: Optional[str] = None  # Stripe payment intent ID
    user_id: str  # Coach/seller who receives payment
    customer_email: Optional[str] = None  # Buyer email
    
    # Payment details
    amount: float
    currency: str = "CHF"
    payment_status: str = "pending"  # pending, paid, failed, canceled, expired
    status: str = "initiated"  # initiated, completed, failed, refunded
    
    # Related entity
    entity_type: Optional[str] = None  # reservation, product, gift_card
    entity_id: Optional[str] = None  # ID of related entity
    
    # Metadata
    metadata: Dict[str, str] = {}
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Added: user_id to make settings per-user
    openai_api_key: Optional[str] = None
    resend_api_key: Optional[str] = None
    whatsapp_access_token: Optional[str] = None
    whatsapp_phone_number_id: Optional[str] = None
    whatsapp_verify_token: Optional[str] = None
    stripe_publishable_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    bank_iban: Optional[str] = None
    bank_name: Optional[str] = None
    bank_currency: str = "CHF"
    company_name: str = "Afroboost"
    sender_email: Optional[str] = None  # Made optional, user can configure
    sender_name: Optional[str] = None  # Made optional, user can configure
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminSettingsUpdate(BaseModel):
    openai_api_key: Optional[str] = None
    resend_api_key: Optional[str] = None
    whatsapp_access_token: Optional[str] = None
    whatsapp_phone_number_id: Optional[str] = None
    whatsapp_verify_token: Optional[str] = None
    stripe_publishable_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    bank_iban: Optional[str] = None
    bank_name: Optional[str] = None
    bank_currency: Optional[str] = None
    company_name: Optional[str] = None
    sender_email: Optional[str] = None
    sender_name: Optional[str] = None


# User Payment Settings Models
class PaymentSettings(BaseModel):
    """Model for user-specific payment configuration"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Owner of these payment settings
    
    # Stripe configuration
    stripe_publishable_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    
    # PayPal configuration
    paypal_client_id: Optional[str] = None
    paypal_secret: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentSettingsUpdate(BaseModel):
    """Model for updating payment settings"""
    stripe_publishable_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    paypal_client_id: Optional[str] = None
    paypal_secret: Optional[str] = None

# Contact Groups Models
class ContactGroup(BaseModel):
    """Model for user-defined contact groups"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Owner of this group
    name: str  # Group name (e.g., "VIP Clients", "Newsletter Subscribers")
    description: Optional[str] = None
    color: Optional[str] = "#8B5CF6"  # Default purple color
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactGroupCreate(BaseModel):
    """Model for creating a contact group"""
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#8B5CF6"

class ContactGroupUpdate(BaseModel):
    """Model for updating a contact group"""
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None

class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # CRITICAL: Owner of this contact
    name: str
    email: EmailStr
    phone: Optional[str] = None  # Nouveau : numéro de téléphone
    tags: List[str] = []
    group: str = "general"
    active: bool = True
    
    # Nouveaux champs pour la gestion des membres
    subscription_status: str = "non-subscriber"  # non-subscriber, active, expired, trial
    subscription_start: Optional[datetime] = None
    subscription_end: Optional[datetime] = None
    membership_type: Optional[str] = None  # standard, premium, vip, etc.
    
    # Historique simplifié
    total_courses_attended: int = 0
    total_payments: float = 0.0
    last_activity: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    stats: Dict = {"emails_received": 0, "emails_opened": 0, "emails_clicked": 0}
    notes: Optional[str] = None  # Notes du coach

class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    tags: List[str] = []
    group: str = "general"
    active: bool = True
    subscription_status: str = "non-subscriber"
    membership_type: Optional[str] = None
    notes: Optional[str] = None

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    tags: Optional[List[str]] = None
    group: Optional[str] = None
    active: Optional[bool] = None

class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # User who created the campaign
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
    user_id: str  # Added: user_id to track which user owns this email log
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

# WhatsApp Models
class WhatsAppConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    phone_id: str
    access_token: str
    business_account_id: str
    phone_number: str
    display_name: Optional[str] = None
    is_configured: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WhatsAppCampaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    message_content: str
    language: str = "fr"
    status: str = "draft"  # draft, scheduled, sending, sent, failed
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    target_groups: List[str] = []
    target_tags: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    stats: Dict = {"sent": 0, "delivered": 0, "read": 0, "replied": 0, "failed": 0}

class WhatsAppCampaignCreate(BaseModel):
    title: str
    message_content: str
    language: str = "fr"
    scheduled_at: Optional[datetime] = None
    target_groups: List[str] = []
    target_tags: List[str] = []

class WhatsAppCampaignUpdate(BaseModel):
    title: Optional[str] = None
    message_content: Optional[str] = None
    language: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    target_groups: Optional[List[str]] = None
    target_tags: Optional[List[str]] = None
    status: Optional[str] = None

class WhatsAppMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: Optional[str] = None
    contact_id: str
    contact_phone: str
    direction: str  # inbound, outbound
    content: str
    status: str  # sent, delivered, read, failed
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    error_message: Optional[str] = None

class WhatsAppIncomingMessage(BaseModel):
    from_phone: str
    message_content: str
    message_id: str
    timestamp: datetime

class AIConversationRequest(BaseModel):
    contact_id: str
    contact_name: str
    contact_phone: str
    message: str
    campaign_context: Optional[str] = None
    language: str = "fr"

class AIConversationResponse(BaseModel):
    response: str
    context_used: str



# ========================
# AI ASSISTANT MODELS
# ========================

class AIAssistantMessage(BaseModel):
    """Message for AI Assistant chat"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_id: str
    role: str  # user, assistant, system
    content: str
    context: Optional[Dict[str, Any]] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIAssistantRequest(BaseModel):
    """Request for AI Assistant"""
    message: str
    session_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = {}
    task_type: Optional[str] = "general"  # general, campaign, analysis, strategy

class AIAssistantResponse(BaseModel):
    """Response from AI Assistant"""
    response: str
    session_id: str
    suggestions: Optional[List[str]] = []
    context: Optional[Dict[str, Any]] = {}



# ========================
# ADVANCED WHATSAPP MODELS
# ========================

class InteractiveButton(BaseModel):
    """Button for WhatsApp interactive messages"""
    type: str  # reply, url, call
    text: str
    id: Optional[str] = None  # For reply buttons
    url: Optional[str] = None  # For URL buttons
    phone_number: Optional[str] = None  # For call buttons

class InteractiveList(BaseModel):
    """List item for WhatsApp interactive messages"""
    id: str
    title: str
    description: Optional[str] = None

class InteractiveSection(BaseModel):
    """Section containing list items"""
    title: str
    rows: List[InteractiveList]

class MessageTemplate(BaseModel):
    """Pre-defined message templates"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    category: str  # marketing, utility, transactional
    content: str
    variables: List[str] = []  # List of variables like {{nom}}, {{prenom}}
    language: str = "fr"
    buttons: List[InteractiveButton] = []
    has_media: bool = False
    media_url: Optional[str] = None
    media_type: Optional[str] = None  # image, document, video
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageTemplateCreate(BaseModel):
    name: str
    category: str
    content: str
    variables: List[str] = []
    language: str = "fr"
    buttons: List[InteractiveButton] = []
    media_url: Optional[str] = None
    media_type: Optional[str] = None

class MessageTemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    variables: Optional[List[str]] = None
    buttons: Optional[List[InteractiveButton]] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None

class AdvancedWhatsAppCampaign(BaseModel):
    """Enhanced WhatsApp campaign with interactive elements"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    template_id: Optional[str] = None
    message_content: str
    language: str = "fr"
    
    # Interactive elements
    buttons: List[InteractiveButton] = []
    list_sections: List[InteractiveSection] = []
    
    # Media
    has_media: bool = False
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    
    # Targeting
    target_contacts: List[str] = []  # Specific contact IDs
    target_tags: List[str] = []  # Filter by tags
    target_status: Optional[str] = None  # Filter by member status
    
    # Personalization
    use_personalization: bool = False
    variables: Dict[str, str] = {}  # Variable mappings
    
    # Scheduling
    status: str = "draft"  # draft, scheduled, sending, sent, failed
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    
    # Payment links
    payment_links: List[Dict[str, str]] = []  # [{type: 'stripe', url: '...'}]
    
    # Analytics
    stats: Dict = {
        "sent": 0,
        "delivered": 0,
        "read": 0,
        "replied": 0,
        "failed": 0,
        "clicked": 0,
        "payments_completed": 0
    }
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdvancedWhatsAppCampaignCreate(BaseModel):
    title: str
    template_id: Optional[str] = None
    message_content: str
    language: str = "fr"
    buttons: List[InteractiveButton] = []
    list_sections: List[InteractiveSection] = []
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    target_contacts: List[str] = []
    target_tags: List[str] = []
    target_status: Optional[str] = None
    use_personalization: bool = False
    scheduled_at: Optional[str] = None
    payment_links: List[Dict[str, str]] = []

class CampaignAnalytics(BaseModel):
    """Detailed analytics for campaigns"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    contact_id: str
    contact_phone: str
    
    # Status tracking
    sent: bool = False
    delivered: bool = False
    read: bool = False
    replied: bool = False
    clicked: bool = False
    
    # Timestamps
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    
    # Response data
    reply_content: Optional[str] = None
    button_clicked: Optional[str] = None
    
    # Payment tracking
    payment_link_clicked: bool = False
    payment_completed: bool = False
    payment_amount: Optional[float] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentLinkCreate(BaseModel):
    """Create payment link for WhatsApp"""
    campaign_id: str
    amount: float
    currency: str = "CHF"
    description: str
    payment_method: str  # stripe, twint
    contact_email: Optional[str] = None



# ========================
# REMINDERS & AUTOMATION MODELS
# ========================

class Reminder(BaseModel):
    """Reminder/notification model"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    reminder_type: str  # event, payment, renewal, followup, custom
    
    # Target
    target_id: Optional[str] = None  # ID of related item (event, booking, contact)
    target_contacts: List[str] = []  # Specific contacts to notify
    
    # Timing
    scheduled_at: datetime
    timezone: str = "Europe/Zurich"
    
    # Channels
    channels: List[str] = ["email"]  # email, whatsapp, in-app
    
    # Content
    message_template: Optional[str] = None
    message_variables: Dict[str, Any] = {}
    
    # Status
    status: str = "pending"  # pending, sent, failed, cancelled
    sent_at: Optional[datetime] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    reminder_type: str
    target_id: Optional[str] = None
    target_contacts: List[str] = []
    scheduled_at: str  # ISO format
    channels: List[str] = ["email"]
    message_template: Optional[str] = None
    message_variables: Dict[str, Any] = {}

class AutomationRule(BaseModel):
    """Automation rule for triggered actions"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = None
    
    # Trigger
    trigger_event: str  # new_contact, booking_created, payment_received, inactive_contact, etc.
    trigger_conditions: Dict[str, Any] = {}  # Additional conditions
    
    # Action
    action_type: str  # send_email, send_whatsapp, create_reminder, update_contact
    action_config: Dict[str, Any] = {}
    
    # Timing
    delay_minutes: int = 0  # Delay before executing action
    
    # Status
    is_active: bool = True
    execution_count: int = 0
    last_executed: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AutomationRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_event: str
    trigger_conditions: Dict[str, Any] = {}
    action_type: str
    action_config: Dict[str, Any] = {}
    delay_minutes: int = 0
    is_active: bool = True

class ReminderTemplate(BaseModel):
    """Template for common reminder messages"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    reminder_type: str
    message_content: str
    variables: List[str] = []  # List of available variables
    default_channels: List[str] = ["email"]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReminderTemplateCreate(BaseModel):
    name: str
    reminder_type: str
    message_content: str
    variables: List[str] = []
    default_channels: List[str] = ["email"]


# Stripe/Payment Models
class PricingPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_en: str
    name_de: str
    price: float
    currency: str = "CHF"
    interval: str = "month"  # month, year
    features_fr: List[str] = []
    features_en: List[str] = []
    features_de: List[str] = []
    limits: Dict = {
        "emails_per_month": 0,
        "whatsapp_per_month": 0,
        "contacts_max": 0,
        "ai_enabled": False,
        "whatsapp_enabled": False,
        "multi_user": False
    }
    active: bool = True
    highlighted: bool = False
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PricingPlanCreate(BaseModel):
    name: str
    name_en: str
    name_de: str
    price: float
    currency: str = "CHF"
    interval: str = "month"
    features_fr: List[str] = []
    features_en: List[str] = []
    features_de: List[str] = []
    limits: Dict = {}
    active: bool = True
    highlighted: bool = False
    order: int = 0

class PricingPlanUpdate(BaseModel):
    name: Optional[str] = None
    name_en: Optional[str] = None
    name_de: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    interval: Optional[str] = None
    features_fr: Optional[List[str]] = None
    features_en: Optional[List[str]] = None
    features_de: Optional[List[str]] = None
    limits: Optional[Dict] = None
    active: Optional[bool] = None
    highlighted: Optional[bool] = None
    order: Optional[int] = None

class SubscriptionPlan(BaseModel):
    name: str
    price: float
    currency: str = "CHF"
    interval: str = "month"  # month, year
    features: List[str] = []

class PaymentIntent(BaseModel):
    amount: int  # Amount in cents
    currency: str = "chf"
    customer_email: str
    description: str

class SubscriptionCreate(BaseModel):
    customer_email: str
    customer_name: str
    plan_id: str
    payment_method_id: str




# ========================
# GIFT CARDS MODELS
# ========================

class GiftCard(BaseModel):
    """Gift card model for offering services/products"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    
    # Value
    amount: float
    currency: str = "CHF"
    
    # Recipient
    recipient_name: str
    recipient_email: EmailStr
    personal_message: Optional[str] = None
    
    # Sender
    sender_name: str
    sender_email: EmailStr
    sender_id: str  # User ID who created the card
    
    # Validity
    expires_at: datetime
    is_active: bool = True
    
    # Usage
    status: str = "active"  # active, used, expired, cancelled
    used_at: Optional[datetime] = None
    used_by: Optional[str] = None  # Contact or user who redeemed
    remaining_balance: Optional[float] = None  # For partial redemptions
    
    # Design
    design_template: str = "default"  # default, birthday, christmas, custom
    design_color: str = "#8B5CF6"
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    sent_at: Optional[datetime] = None
    
class GiftCardCreate(BaseModel):
    amount: float
    currency: str = "CHF"
    recipient_name: str
    recipient_email: EmailStr
    personal_message: Optional[str] = None
    sender_name: str
    sender_email: EmailStr
    expires_at: datetime
    design_template: str = "default"
    design_color: str = "#8B5CF6"

class GiftCardRedeem(BaseModel):
    redeemed_by_name: str
    redeemed_by_email: EmailStr
    amount_to_use: Optional[float] = None  # For partial redemption


# ========================
# CLIENT DISCOUNTS MODELS
# ========================

class Discount(BaseModel):
    """Discount/promo code model"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str  # Unique promo code (e.g., SUMMER2024)
    
    # Discount details
    discount_type: str  # percentage, fixed_amount
    discount_value: float  # Percentage (e.g., 20) or fixed amount (e.g., 50)
    currency: str = "CHF"
    
    # Description
    name: str
    description: Optional[str] = None
    
    # Validity
    start_date: datetime
    end_date: datetime
    is_active: bool = True
    
    # Usage limits
    usage_limit: Optional[int] = None  # Total times it can be used
    usage_count: int = 0  # Times it has been used
    per_user_limit: int = 1  # Times per user
    
    # Applicability
    applicable_to: List[str] = []  # empty = all, or specific catalog_item IDs
    minimum_purchase: Optional[float] = None
    
    # Target audience
    target_contacts: List[str] = []  # empty = all contacts
    target_tags: List[str] = []  # empty = all, or specific tags
    
    # Metadata
    created_by: str  # Admin user ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DiscountCreate(BaseModel):
    code: str
    discount_type: str
    discount_value: float
    currency: str = "CHF"
    name: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    usage_limit: Optional[int] = None
    per_user_limit: int = 1
    applicable_to: List[str] = []
    minimum_purchase: Optional[float] = None
    target_contacts: List[str] = []
    target_tags: List[str] = []

class DiscountUpdate(BaseModel):
    code: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    usage_limit: Optional[int] = None
    applicable_to: Optional[List[str]] = None
    minimum_purchase: Optional[float] = None

class DiscountValidation(BaseModel):
    """Validate discount code for a purchase"""
    code: str
    contact_email: EmailStr
    items: List[str]  # Catalog item IDs
    subtotal: float


# ========================
# REFERRAL SYSTEM MODELS
# ========================

class Referral(BaseModel):
    """Referral/parrainage model"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Referrer (person who refers)
    referrer_id: str  # User ID
    referrer_name: str
    referrer_email: EmailStr
    referral_code: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    
    # Referred (person being referred)
    referred_email: EmailStr
    referred_name: Optional[str] = None
    referred_id: Optional[str] = None  # Set when they sign up
    
    # Status
    status: str = "pending"  # pending, signed_up, completed, expired
    
    # Rewards
    referrer_reward_type: str = "discount"  # discount, credit, free_month
    referrer_reward_value: float = 10.0  # 10% or 10 CHF
    referrer_reward_applied: bool = False
    
    referred_reward_type: str = "discount"
    referred_reward_value: float = 10.0
    referred_reward_applied: bool = False
    
    # Completion criteria
    completion_criteria: str = "first_purchase"  # signup, first_purchase, subscription
    completed_at: Optional[datetime] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=90))
    
class ReferralCreate(BaseModel):
    referred_email: EmailStr
    referred_name: Optional[str] = None
    referrer_reward_type: str = "discount"
    referrer_reward_value: float = 10.0
    referred_reward_type: str = "discount"
    referred_reward_value: float = 10.0
    completion_criteria: str = "first_purchase"

class ReferralStats(BaseModel):
    """Statistics for user's referral program"""
    total_referrals: int
    pending_referrals: int
    completed_referrals: int
    total_rewards_earned: float
    referral_code: str


# ========================
# DIRECT CHAT FROM ADS MODELS
# ========================

class AdChatMessage(BaseModel):
    """Individual message in ad chat"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender: str  # visitor, agent
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read: bool = False

class AdChat(BaseModel):
    """Chat conversation from advertisement"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Ad source
    ad_id: str  # ID of the ad that generated this chat
    ad_platform: str  # facebook, instagram, google, linkedin
    ad_campaign_name: Optional[str] = None
    
    # Visitor info
    visitor_name: Optional[str] = None
    visitor_email: Optional[EmailStr] = None
    visitor_phone: Optional[str] = None
    visitor_whatsapp: Optional[str] = None
    
    # Session
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    messages: List[AdChatMessage] = []
    
    # Status
    status: str = "active"  # active, resolved, archived, converted
    assigned_to: Optional[str] = None  # User ID of assigned agent
    priority: str = "normal"  # low, normal, high, urgent
    
    # Lead quality
    lead_score: Optional[int] = None  # 0-100
    tags: List[str] = []
    
    # Conversion
    converted_to_contact: bool = False
    converted_contact_id: Optional[str] = None
    conversion_value: Optional[float] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_message_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    closed_at: Optional[datetime] = None

class AdChatStart(BaseModel):
    ad_id: str
    ad_platform: str
    ad_campaign_name: Optional[str] = None
    visitor_name: Optional[str] = None
    visitor_email: Optional[EmailStr] = None
    visitor_phone: Optional[str] = None
    initial_message: str

class AdChatMessageCreate(BaseModel):
    sender: str  # visitor or agent
    content: str

class AdChatUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Optional[str] = None
    tags: Optional[List[str]] = None
    lead_score: Optional[int] = None
    visitor_name: Optional[str] = None
    visitor_email: Optional[EmailStr] = None
    visitor_phone: Optional[str] = None



# ========================
# PUBLIC COACH CHAT MODELS
# ========================

class CoachChatConfig(BaseModel):
    """Configuration du chat publicitaire d'un coach"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Coach ID
    
    # URL configuration
    chat_slug: str  # URL: /chat/{chat_slug}
    
    # Branding
    display_name: str  # Nom affiché (ex: "Coach Bassi")
    welcome_message: str = "Bienvenue ! Comment puis-je t'aider aujourd'hui ? 🎧"
    avatar_url: Optional[str] = None
    primary_color: str = "#8B5CF6"
    
    # Features enabled
    enable_catalog: bool = True
    enable_gift_cards: bool = True
    enable_discounts: bool = True
    enable_referrals: bool = True
    enable_reservations: bool = True
    enable_ai: bool = True
    
    # Social sharing
    share_text: str = "💬 Rejoins mon chat BoostTribe et réserve ton cours directement !"
    
    # Status
    is_active: bool = True
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HeadsetReservation(BaseModel):
    """Réservation de casque pour un cours"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Course/Event
    catalog_item_id: str  # Cours concerné
    catalog_item_title: str
    event_date: datetime
    
    # Coach
    coach_id: str
    coach_name: str
    
    # Customer
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    
    # Reservation
    headset_number: Optional[int] = None  # Numéro du casque attribué
    status: str = "confirmed"  # confirmed, present, absent, cancelled
    
    # From chat
    chat_id: Optional[str] = None  # ID du chat d'origine
    reserved_via: str = "public_chat"  # public_chat, admin, direct
    
    # Notifications
    reminder_sent: bool = False
    confirmation_sent: bool = False
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AttendanceRecord(BaseModel):
    """Enregistrement de présence à un cours"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Link to reservation
    reservation_id: str
    catalog_item_id: str
    
    # Coach
    coach_id: str
    
    # Attendance
    status: str  # present, absent, late, excused
    checked_in_at: Optional[datetime] = None
    notes: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CoachChatConfigCreate(BaseModel):
    chat_slug: str
    display_name: str
    welcome_message: Optional[str] = "Bienvenue ! Comment puis-je t'aider aujourd'hui ? 🎧"
    avatar_url: Optional[str] = None
    primary_color: Optional[str] = "#8B5CF6"

class HeadsetReservationCreate(BaseModel):
    catalog_item_id: str
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    chat_id: Optional[str] = None

class AttendanceUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


# ========================
# HELPER FUNCTIONS

def generate_slug(title: str) -> str:
    """Generate URL-friendly slug from title"""
    import unicodedata
    # Normalize unicode characters
    slug = unicodedata.normalize('NFKD', title).encode('ascii', 'ignore').decode('ascii')
    # Convert to lowercase and replace spaces/special chars with hyphens
    slug = re.sub(r'[^a-z0-9]+', '-', slug.lower())
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    # Add timestamp to ensure uniqueness
    slug = f"{slug}-{str(uuid.uuid4())[:8]}"
    return slug


# ========================

async def get_settings(user_id: str = None):
    """Get admin settings from database - per user"""
    if not user_id:
        raise ValueError("user_id is required to fetch settings")
    
    settings = await db.settings.find_one({"user_id": user_id}, {"_id": 0})
    if not settings:
        # Create default settings for this user
        default_settings = AdminSettings(
            user_id=user_id,
            openai_api_key='',
            resend_api_key='',
            sender_email=None,
            sender_name=None
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

async def get_contacts_by_filters(groups: List[str] = None, tags: List[str] = None, active_only: bool = True, user_id: str = None):
    """Get contacts filtered by groups, tags and user_id"""
    query = {}
    
    # CRITICAL: Filter by user_id if provided
    if user_id:
        query['user_id'] = user_id
    
    # Don't filter by active if we want all contacts
    if active_only:
        query['active'] = True
    # Only filter by groups if provided
    if groups and len(groups) > 0:
        query['group'] = {'$in': groups}
    # Only filter by tags if provided
    if tags and len(tags) > 0:
        query['tags'] = {'$in': tags}
    
    logger.info(f"Fetching contacts with query: {query}")
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(10000)
    for contact in contacts:
        if isinstance(contact.get('created_at'), str):
            contact['created_at'] = datetime.fromisoformat(contact['created_at'])
    
    logger.info(f"Found {len(contacts)} contacts")
    return [Contact(**c) for c in contacts]


# ========================
# AUTH UTILITIES
# ========================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    """Create a JWT token"""
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Dict:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = decode_token(token)
    
    # Fetch user from database
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

async def require_admin(current_user: Dict = Depends(get_current_user)) -> Dict:
    """Require admin role"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ========================
# ROUTES - AUTHENTICATION
# ========================

@api_router.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserCreate):
    """Register a new user. First user becomes admin."""
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if this is the first user
    user_count = await db.users.count_documents({})
    role = "admin" if user_count == 0 else "user"
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=role
    )
    
    # Hash password and store separately
    user_dict = user.model_dump()
    user_dict["password"] = hash_password(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create token
    token = create_token(user.id, user.email, user.role)
    
    # Return response
    user_response = UserResponse(**user.model_dump())
    return AuthResponse(user=user_response, token=token)

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    """Login user"""
    try:
        # Find user
        user = await db.users.find_one({"email": credentials.email})
        if not user:
            logger.warning(f"Login attempt with non-existent email: {credentials.email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        logger.info(f"Login attempt for user: {credentials.email}, role: {user.get('role', 'N/A')}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finding user during login: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during login")
    
    # Verify password
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Ensure role exists, default to 'user' if missing
    user_role = user.get("role", "user")
    if not user_role:
        user_role = "user"
        # Update user in database if role is missing
        await db.users.update_one(
            {"email": credentials.email},
            {"$set": {"role": "user"}}
        )
    
    # Update last login
    await db.users.update_one(
        {"email": credentials.email},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create token
    token = create_token(user["id"], user["email"], user_role)
    
    # Parse dates
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    if isinstance(user.get('last_login'), str):
        user['last_login'] = datetime.fromisoformat(user['last_login'])
    
    # Remove password from response
    user.pop("password", None)
    
    # Ensure role is included and properly formatted
    user['role'] = user_role
    
    try:
        user_response = UserResponse(**user)
        logger.info(f"Login successful for user: {credentials.email}, role: {user_role}")
    except Exception as e:
        logger.error(f"Error creating UserResponse: {e}, user data: {user}")
        raise HTTPException(status_code=500, detail=f"Error processing user data: {str(e)}")
    
    return AuthResponse(user=user_response, token=token)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: Dict = Depends(get_current_user)):
    """Get current user info"""
    # Parse dates
    if isinstance(current_user.get('created_at'), str):
        current_user['created_at'] = datetime.fromisoformat(current_user['created_at'])
    if isinstance(current_user.get('last_login'), str):
        current_user['last_login'] = datetime.fromisoformat(current_user['last_login'])
    
    return UserResponse(**current_user)


# ========================
# ROUTES - SETTINGS
# ========================

@api_router.get("/settings", response_model=AdminSettings)
async def get_admin_settings(current_user: Dict = Depends(get_current_user)):
    """Get admin settings for the current user"""
    return await get_settings(user_id=current_user["id"])

@api_router.put("/settings", response_model=AdminSettings)
async def update_admin_settings(settings_update: AdminSettingsUpdate, current_user: Dict = Depends(get_current_user)):
    """Update admin settings for the current user"""
    current_settings = await get_settings(user_id=current_user["id"])
    update_data = settings_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(current_settings, key, value)
    
    current_settings.updated_at = datetime.now(timezone.utc)
    
    doc = current_settings.model_dump()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    # Update settings for this specific user
    await db.settings.update_one({"user_id": current_user["id"]}, {"$set": doc}, upsert=True)
    return current_settings


# ========================
# ROUTES - PASSWORD RESET
# ========================

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset email"""
    # Check if user exists
    user = await db.users.find_one({"email": request.email})
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If your email is registered, you will receive a password reset link"}
    
    # Generate reset token
    reset_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Save token to database
    token_data = PasswordResetToken(
        email=request.email,
        token=reset_token,
        expires_at=expires_at
    )
    token_dict = token_data.model_dump()
    token_dict['expires_at'] = token_dict['expires_at'].isoformat()
    token_dict['created_at'] = token_dict['created_at'].isoformat()
    
    await db.password_reset_tokens.insert_one(token_dict)
    
    # Get frontend URL from environment or use default
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    # Send email using Resend
    resend_api_key = os.environ.get('RESEND_API_KEY')
    if resend_api_key:
        resend.api_key = resend_api_key
        
        try:
            email_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #D91CD2 0%, #8B5CF6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .content {{ background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }}
                    .button {{ display: inline-block; padding: 15px 30px; background: #D91CD2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                    .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Réinitialisation de ton mot de passe BoostTribe</h1>
                    </div>
                    <div class="content">
                        <p>Bonjour,</p>
                        <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte <strong>BoostTribe</strong>.</p>
                        <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
                        <p style="text-align: center;">
                            <a href="{reset_link}" class="button">🔒 Réinitialiser mon mot de passe</a>
                        </p>
                        <p><strong>Ce lien est valide pendant 1 heure.</strong></p>
                        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.</p>
                        <p>Merci et à très vite sur BoostTribe 🌍</p>
                        <p><strong>L'équipe BoostTribe</strong></p>
                    </div>
                    <div class="footer">
                        <p>© 2025 BoostTribe</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            resend.Emails.send({
                "from": "BoostTribe <onboarding@resend.dev>",
                "to": request.email,
                "subject": "Réinitialisation de ton mot de passe BoostTribe",
                "html": email_html
            })
            
            logger.info(f"Password reset email sent to {request.email}")
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            # Don't fail the request if email fails
    else:
        logger.warning(f"RESEND_API_KEY not set. Reset link: {reset_link}")
    
    return {"message": "If your email is registered, you will receive a password reset link"}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password with token"""
    # Find valid token
    token = await db.password_reset_tokens.find_one({
        "token": request.token,
        "used": False
    })
    
    if not token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check if token expired
    expires_at = datetime.fromisoformat(token['expires_at']) if isinstance(token['expires_at'], str) else token['expires_at']
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Update user password
    new_password_hash = hash_password(request.new_password)
    await db.users.update_one(
        {"email": token['email']},
        {"$set": {"password": new_password_hash}}
    )
    
    # Mark token as used
    await db.password_reset_tokens.update_one(
        {"token": request.token},
        {"$set": {"used": True}}
    )
    
    logger.info(f"Password reset successful for {token['email']}")
    
    return {"message": "Password reset successful"}



# ========================
# ROUTES - USER PAYMENT SETTINGS
# ========================

@api_router.get("/user/payment-config")
async def get_user_payment_config(current_user: Dict = Depends(get_current_user)):
    """Get current user's payment configuration"""
    try:
        config = await db.payment_settings.find_one(
            {"user_id": current_user["id"]},
            {"_id": 0}
        )
        
        if not config:
            # Return empty config if none exists
            return {
                "stripe_secret_key": "",
                "stripe_publishable_key": "",
                "paypal_client_id": "",
                "paypal_secret": ""
            }
        
        # Return only the keys (without sensitive internal fields)
        return {
            "stripe_secret_key": config.get("stripe_secret_key", ""),
            "stripe_publishable_key": config.get("stripe_publishable_key", ""),
            "paypal_client_id": config.get("paypal_client_id", ""),
            "paypal_secret": config.get("paypal_secret", "")
        }
        
    except Exception as e:
        logger.error(f"Error fetching payment config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/user/payment-config")
async def save_user_payment_config(
    settings: PaymentSettingsUpdate,
    current_user: Dict = Depends(get_current_user)
):
    """Save or update user's payment configuration"""
    try:
        # Check if config already exists
        existing_config = await db.payment_settings.find_one(
            {"user_id": current_user["id"]}
        )
        
        if existing_config:
            # Update existing config
            update_data = settings.model_dump(exclude_unset=True)
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            await db.payment_settings.update_one(
                {"user_id": current_user["id"]},
                {"$set": update_data}
            )
            logger.info(f"Updated payment config for user {current_user['id']}")
        else:
            # Create new config
            new_config = PaymentSettings(
                user_id=current_user["id"],
                stripe_secret_key=settings.stripe_secret_key,
                stripe_publishable_key=settings.stripe_publishable_key,
                paypal_client_id=settings.paypal_client_id,
                paypal_secret=settings.paypal_secret
            )
            
            config_dict = new_config.model_dump()
            config_dict["created_at"] = config_dict["created_at"].isoformat()
            config_dict["updated_at"] = config_dict["updated_at"].isoformat()
            
            await db.payment_settings.insert_one(config_dict)
            logger.info(f"Created payment config for user {current_user['id']}")
        
        return {
            "message": "Configuration de paiement enregistrée avec succès",
            "success": True
        }
        
    except Exception as e:
        logger.error(f"Error saving payment config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# ROUTES - CONTACT GROUPS
# ========================

@api_router.get("/contact-groups")
async def get_contact_groups(current_user: Dict = Depends(get_current_user)):
    """Get all contact groups for current user"""
    try:
        groups = await db.contact_groups.find(
            {"user_id": current_user["id"]},
            {"_id": 0}
        ).to_list(length=None)
        
        logger.info(f"Retrieved {len(groups)} contact groups for user {current_user['id']}")
        return groups
        
    except Exception as e:
        logger.error(f"Error fetching contact groups: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/contact-groups")
async def create_contact_group(
    group: ContactGroupCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new contact group"""
    try:
        # Check if group name already exists for this user
        existing = await db.contact_groups.find_one({
            "user_id": current_user["id"],
            "name": group.name
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="Un groupe avec ce nom existe déjà")
        
        new_group = ContactGroup(
            user_id=current_user["id"],
            name=group.name,
            description=group.description,
            color=group.color
        )
        
        group_dict = new_group.model_dump()
        group_dict["created_at"] = group_dict["created_at"].isoformat()
        group_dict["updated_at"] = group_dict["updated_at"].isoformat()
        
        await db.contact_groups.insert_one(group_dict)
        logger.info(f"Created contact group '{group.name}' for user {current_user['id']}")
        
        return {"message": "Groupe créé avec succès", "id": new_group.id, "group": group_dict}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating contact group: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/contact-groups/{group_id}")
async def update_contact_group(
    group_id: str,
    update: ContactGroupUpdate,
    current_user: Dict = Depends(get_current_user)
):
    """Update a contact group"""
    try:
        # Check if group exists and belongs to user
        existing = await db.contact_groups.find_one({
            "id": group_id,
            "user_id": current_user["id"]
        })
        
        if not existing:
            raise HTTPException(status_code=404, detail="Groupe non trouvé")
        
        update_data = update.model_dump(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            await db.contact_groups.update_one(
                {"id": group_id, "user_id": current_user["id"]},
                {"$set": update_data}
            )
            logger.info(f"Updated contact group {group_id} for user {current_user['id']}")
        
        return {"message": "Groupe mis à jour avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating contact group: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/contact-groups/{group_id}")
async def delete_contact_group(
    group_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Delete a contact group"""
    try:
        result = await db.contact_groups.delete_one({
            "id": group_id,
            "user_id": current_user["id"]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Groupe non trouvé")
        
        logger.info(f"Deleted contact group {group_id} for user {current_user['id']}")
        return {"message": "Groupe supprimé avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting contact group: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# ROUTES - WHATSAPP
# ========================

@api_router.post("/whatsapp/config")
async def configure_whatsapp(
    phone_id: str,
    access_token: str,
    business_account_id: str,
    phone_number: str,
    display_name: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Configure WhatsApp credentials for user"""
    try:
        # Test credentials by creating client
        from whatsapp_client import WhatsAppClient
        client = WhatsAppClient(phone_id=phone_id, access_token=access_token)
        await client.close()
        
        # Save or update config
        existing_config = await db.whatsapp_configs.find_one({"user_id": current_user["id"]})
        
        config_data = {
            "user_id": current_user["id"],
            "phone_id": phone_id,
            "access_token": access_token,
            "business_account_id": business_account_id,
            "phone_number": phone_number,
            "display_name": display_name,
            "is_configured": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if existing_config:
            await db.whatsapp_configs.update_one(
                {"user_id": current_user["id"]},
                {"$set": config_data}
            )
        else:
            config_data["id"] = str(uuid.uuid4())
            config_data["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.whatsapp_configs.insert_one(config_data)
        
        return {"message": "WhatsApp configured successfully", "configured": True}
    except Exception as e:
        logger.error(f"Failed to configure WhatsApp: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid WhatsApp credentials: {str(e)}")

@api_router.get("/whatsapp/config")
async def get_whatsapp_config(current_user: Dict = Depends(get_current_user)):
    """Get WhatsApp configuration for user"""
    config = await db.whatsapp_configs.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0, "access_token": 0}  # Don't return access token
    )
    
    if not config:
        return {"configured": False}
    
    return {"configured": True, "config": config}


# ========================
# ROUTES - CONTACTS
# ========================

@api_router.get("/contacts", response_model=List[Contact])
async def get_contacts(
    group: Optional[str] = None,
    active: Optional[bool] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Get all contacts for current user ONLY"""
    # CRITICAL: Each user sees only their own contacts
    query = {"user_id": current_user["id"]}
    
    if group:
        query['group'] = group
    if active is not None:
        query['active'] = active
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(10000)
    for contact in contacts:
        if isinstance(contact.get('created_at'), str):
            contact['created_at'] = datetime.fromisoformat(contact['created_at'])
    
    logger.info(f"User {current_user['email']} retrieved {len(contacts)} contacts")
    return contacts

@api_router.get("/contacts/{contact_id}", response_model=Contact)
async def get_contact(contact_id: str, current_user: Dict = Depends(get_current_user)):
    """Get a specific contact (user's own contact only)"""
    contact = await db.contacts.find_one({"id": contact_id, "user_id": current_user["id"]}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if isinstance(contact.get('created_at'), str):
        contact['created_at'] = datetime.fromisoformat(contact['created_at'])
    return contact

@api_router.post("/contacts", response_model=Contact)
async def create_contact(contact_data: ContactCreate, current_user: Dict = Depends(get_current_user)):
    """Create a new contact"""
    # Check if email already exists FOR THIS USER
    existing = await db.contacts.find_one({"email": contact_data.email, "user_id": current_user["id"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Contact with this email already exists")
    
    contact = Contact(user_id=current_user["id"], **contact_data.model_dump())
    doc = contact.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.contacts.insert_one(doc)
    logger.info(f"User {current_user['email']} created contact: {contact.email}")
    
    # Send welcome email automatically
    try:
        await send_welcome_email(contact, current_user)
    except Exception as e:
        logger.error(f"Failed to send welcome email to {contact.email}: {e}")
        # Don't fail the contact creation if email fails
    
    return contact

@api_router.put("/contacts/{contact_id}", response_model=Contact)
async def update_contact(contact_id: str, contact_update: ContactUpdate, current_user: Dict = Depends(get_current_user)):
    """Update a contact (user's own contact only)"""
    contact = await db.contacts.find_one({"id": contact_id, "user_id": current_user["id"]}, {"_id": 0})
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
    
    await db.contacts.update_one({"id": contact_id, "user_id": current_user["id"]}, {"$set": doc})
    logger.info(f"User {current_user['email']} updated contact: {contact_id}")
    return contact_obj

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, current_user: Dict = Depends(get_current_user)):
    """Delete a contact (user's own contact only)"""
    result = await db.contacts.delete_one({"id": contact_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    logger.info(f"User {current_user['email']} deleted contact: {contact_id}")
    return {"message": "Contact deleted successfully"}

@api_router.post("/contacts/import")
async def import_contacts(
    file: UploadFile = File(...),
    current_user: Dict = Depends(get_current_user)
):
    """Import contacts from CSV/Excel file"""
    try:
        contents = await file.read()
        
        # Try to read as Excel first
        try:
            df = pd.read_excel(io.BytesIO(contents))
        except:
            # Fall back to CSV with UTF-8 encoding
            try:
                df = pd.read_csv(io.BytesIO(contents), encoding='utf-8')
            except:
                df = pd.read_csv(io.BytesIO(contents), encoding='latin-1')
        
        # Normalize column names (handle French/English, case-insensitive)
        df.columns = df.columns.str.strip().str.lower()
        
        # Map French columns to English
        column_mapping = {
            'nom': 'name',
            'prénom': 'firstname',
            'email': 'email',
            'téléphone': 'phone',
            'telephone': 'phone',
            'phone': 'phone',
            'tags': 'tags',
            'groupe': 'group',
            'group': 'group'
        }
        
        df.rename(columns=column_mapping, inplace=True)
        
        # Combine firstname and name if both exist
        if 'firstname' in df.columns and 'name' in df.columns:
            df['name'] = df['firstname'].fillna('') + ' ' + df['name'].fillna('')
            df['name'] = df['name'].str.strip()
        elif 'firstname' in df.columns:
            df['name'] = df['firstname']
        
        # Validate required columns
        if 'name' not in df.columns:
            raise HTTPException(status_code=400, detail="Colonne 'Nom' ou 'Name' manquante")
        
        # Email is optional, phone can be primary identifier
        
        imported = 0
        duplicates = 0
        errors = 0
        error_details = []
        
        for idx, row in df.iterrows():
            try:
                # Skip empty rows
                if pd.isna(row.get('name')) or str(row.get('name')).strip() == '':
                    continue
                
                name = str(row['name']).strip()
                email = str(row.get('email', '')).strip() if pd.notna(row.get('email')) else None
                phone = str(row.get('phone', '')).strip() if pd.notna(row.get('phone')) else None
                
                # Skip if both email and phone are empty
                if not email and not phone:
                    errors += 1
                    error_details.append(f"Ligne {idx+2}: Nom={name}, email et téléphone manquants")
                    continue
                
                # Use email as primary, phone as fallback
                if not email and phone:
                    # Generate a placeholder email from phone
                    email = f"{phone.replace('+', '').replace(' ', '')}@imported.contact"
                
                # Check if contact exists FOR THIS USER
                existing = await db.contacts.find_one({
                    "email": email,
                    "user_id": current_user["id"]
                }, {"_id": 0})
                
                if existing:
                    duplicates += 1
                    continue
                
                contact = Contact(
                    user_id=current_user["id"],
                    name=name,
                    email=email,
                    phone=phone,
                    tags=str(row.get('tags', '')).split(',') if pd.notna(row.get('tags')) else [],
                    group=str(row.get('group', 'imported')),
                    active=True
                )
                
                doc = contact.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                
                await db.contacts.insert_one(doc)
                imported += 1
            except Exception as e:
                logger.error(f"Error importing contact at row {idx+2}: {e}")
                errors += 1
                error_details.append(f"Ligne {idx+2}: {str(e)}")
        
        logger.info(f"User {current_user['email']} imported {imported} contacts, {duplicates} duplicates, {errors} errors")
        
        return {
            "imported": imported,
            "duplicates": duplicates,
            "errors": errors,
            "total": len(df),
            "error_details": error_details[:10]  # Return first 10 errors only
        }
    
    except Exception as e:
        logger.error(f"Error importing file: {e}")
        raise HTTPException(status_code=400, detail=f"Erreur lors du traitement du fichier: {str(e)}")


@api_router.delete("/contacts/bulk-delete")
async def bulk_delete_contacts(current_user: Dict = Depends(get_current_user)):
    """Delete ALL contacts for current user (requires confirmation)"""
    result = await db.contacts.delete_many({"user_id": current_user["id"]})
    logger.warning(f"User {current_user['email']} deleted ALL {result.deleted_count} contacts")
    return {
        "message": f"{result.deleted_count} contact(s) supprimé(s)",
        "deleted_count": result.deleted_count
    }

@api_router.get("/contacts/export/csv")
async def export_contacts_csv(current_user: Dict = Depends(get_current_user)):
    """Export contacts as CSV (user's own contacts only)"""
    contacts = await db.contacts.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(10000)
    
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


# Routes pour gestion avancée des membres
@api_router.patch("/contacts/{contact_id}/subscription")
async def update_contact_subscription(
    contact_id: str,
    subscription_status: str,
    subscription_start: Optional[str] = None,
    subscription_end: Optional[str] = None,
    membership_type: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Update contact subscription status"""
    update_data = {
        "subscription_status": subscription_status,
        "membership_type": membership_type
    }
    
    if subscription_start:
        update_data["subscription_start"] = datetime.fromisoformat(subscription_start).isoformat()
    if subscription_end:
        update_data["subscription_end"] = datetime.fromisoformat(subscription_end).isoformat()
    
    result = await db.contacts.update_one(
        {"id": contact_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    return {"message": "Subscription updated successfully"}

@api_router.get("/contacts/stats/summary")
async def get_contacts_summary(current_user: Dict = Depends(get_current_user)):
    """Get summary statistics of contacts (user's own contacts only)"""
    # CRITICAL: Only count user's own contacts
    user_filter = {"user_id": current_user["id"]}
    total_contacts = await db.contacts.count_documents(user_filter)
    
    subscribers = await db.contacts.count_documents({**user_filter, "subscription_status": "active"})
    non_subscribers = await db.contacts.count_documents({**user_filter, "subscription_status": "non-subscriber"})
    trial_members = await db.contacts.count_documents({**user_filter, "subscription_status": "trial"})
    expired = await db.contacts.count_documents({**user_filter, "subscription_status": "expired"})
    
    return {
        "total": total_contacts,
        "subscribers": subscribers,
        "non_subscribers": non_subscribers,
        "trial": trial_members,
        "expired": expired
    }

@api_router.post("/contacts/bulk-message")
async def send_bulk_message(
    contact_ids: List[str],
    message: str,
    channel: str = "email",  # email or whatsapp
    current_user: Dict = Depends(get_current_user)
):
    """Send message to multiple contacts"""
    contacts = await db.contacts.find(
        {"id": {"$in": contact_ids}},
        {"_id": 0}
    ).to_list(length=None)
    
    if not contacts:
        raise HTTPException(status_code=404, detail="No contacts found")
    
    sent_count = 0
    failed_count = 0
    
    if channel == "email":
        # Send emails
        for contact in contacts:
            try:
                # TODO: Implement email sending logic
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send email to {contact['email']}: {e}")
                failed_count += 1
    
    elif channel == "whatsapp":
        # Send WhatsApp messages
        config = await db.whatsapp_configs.find_one({"user_id": current_user["id"]})
        if not config:
            raise HTTPException(status_code=400, detail="WhatsApp not configured")
        
        from whatsapp_client import WhatsAppClient
        client = WhatsAppClient(
            phone_id=config["phone_id"],
            access_token=config["access_token"]
        )
        
        for contact in contacts:
            phone = contact.get("phone") or contact.get("email")  # Fallback to email if no phone
            try:
                await client.send_text_message(
                    recipient_phone=phone,
                    message_text=message
                )
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send WhatsApp to {phone}: {e}")
                failed_count += 1
        
        await client.close()
    
    return {
        "message": "Messages sent",
        "sent_count": sent_count,
        "failed_count": failed_count
    }


# ========================
# ROUTES - CAMPAIGNS
# ========================

@api_router.get("/campaigns", response_model=List[Campaign])
async def get_campaigns(current_user: Dict = Depends(get_current_user)):
    """Get all campaigns for the current user"""
    campaigns = await db.campaigns.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    for campaign in campaigns:
        for date_field in ['created_at', 'scheduled_at', 'sent_at']:
            if campaign.get(date_field) and isinstance(campaign[date_field], str):
                campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    return campaigns

@api_router.get("/campaigns/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str, current_user: Dict = Depends(get_current_user)):
    """Get a specific campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id, "user_id": current_user["id"]}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    for date_field in ['created_at', 'scheduled_at', 'sent_at']:
        if campaign.get(date_field) and isinstance(campaign[date_field], str):
            campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    return campaign

@api_router.post("/campaigns", response_model=Campaign)
async def create_campaign(campaign_data: CampaignCreate, current_user: Dict = Depends(get_current_user)):
    """Create a new campaign"""
    try:
        logger.info(f"Creating campaign for user {current_user['id']}: {campaign_data.title}")
        campaign = Campaign(**campaign_data.model_dump(), user_id=current_user["id"])
        if campaign_data.scheduled_at:
            campaign.status = "scheduled"
        
        doc = campaign.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        if doc.get('scheduled_at'):
            doc['scheduled_at'] = doc['scheduled_at'].isoformat()
        if doc.get('sent_at'):
            doc['sent_at'] = doc['sent_at'].isoformat()
        
        logger.info(f"Inserting campaign document: {doc.get('id')}")
        result = await db.campaigns.insert_one(doc)
        logger.info(f"Campaign inserted successfully with MongoDB _id: {result.inserted_id}")
        return campaign
    except Exception as e:
        logger.error(f"Error creating campaign: {str(e)}")
        logger.exception(e)  # Log full traceback
        raise HTTPException(status_code=500, detail=f"Failed to create campaign: {str(e)}")

@api_router.put("/campaigns/{campaign_id}", response_model=Campaign)
async def update_campaign(campaign_id: str, campaign_update: CampaignUpdate, current_user: Dict = Depends(get_current_user)):
    """Update a campaign"""
    try:
        logger.info(f"Updating campaign {campaign_id} for user {current_user['id']}")
        campaign = await db.campaigns.find_one({"id": campaign_id, "user_id": current_user["id"]}, {"_id": 0})
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
        
        result = await db.campaigns.update_one({"id": campaign_id}, {"$set": doc})
        logger.info(f"Campaign updated: {result.modified_count} document(s) modified")
        return campaign_obj
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating campaign {campaign_id}: {str(e)}")
        logger.exception(e)  # Log full traceback
        raise HTTPException(status_code=500, detail=f"Failed to update campaign: {str(e)}")

@api_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, current_user: Dict = Depends(get_current_user)):
    """Delete a campaign"""
    result = await db.campaigns.delete_one({"id": campaign_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted successfully"}

@api_router.post("/campaigns/{campaign_id}/send")
async def send_campaign(campaign_id: str, background_tasks: BackgroundTasks, current_user: Dict = Depends(get_current_user)):
    """Send a campaign immediately"""
    campaign = await db.campaigns.find_one({"id": campaign_id, "user_id": current_user["id"]}, {"_id": 0})
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
    logger.info(f"=== STARTING EMAIL SEND PROCESS FOR CAMPAIGN {campaign_id} ===")
    try:
        logger.info(f"[STEP 1] Fetching campaign {campaign_id} from database...")
        campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
        if not campaign:
            logger.error(f"[STEP 1 FAILED] Campaign {campaign_id} not found in database")
            return
        logger.info(f"[STEP 1 SUCCESS] Campaign found: {campaign.get('title', 'Unknown')}")
        
        logger.info(f"[STEP 2] Parsing campaign date fields...")
        for date_field in ['created_at', 'scheduled_at', 'sent_at']:
            if campaign.get(date_field) and isinstance(campaign[date_field], str):
                campaign[date_field] = datetime.fromisoformat(campaign[date_field])
        logger.info(f"[STEP 2 SUCCESS] Date fields parsed")
        
        logger.info(f"[STEP 3] Creating Campaign object from database data...")
        campaign_obj = Campaign(**campaign)
        logger.info(f"[STEP 3 SUCCESS] Campaign object created. Title: {campaign_obj.title}, User ID: {campaign_obj.user_id}")
        
        logger.info(f"[STEP 4] Fetching admin settings for user {campaign_obj.user_id}...")
        settings = await get_settings(user_id=campaign_obj.user_id)
        logger.info(f"[STEP 4 SUCCESS] Settings retrieved. Resend API key present: {bool(settings.resend_api_key)}, Sender email: {settings.sender_email}, Sender name: {settings.sender_name}")
        
        # Validate settings
        logger.info(f"[STEP 5] Validating settings...")
        if not settings.resend_api_key:
            error_msg = f"Resend API key not configured for campaign {campaign_id}"
            logger.error(f"[STEP 5 FAILED] {error_msg}")
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$set": {"status": "failed"}}
            )
            logger.error(f"[FAILURE] Campaign {campaign_id} status set to 'failed' - Resend API key missing")
            return
        
        if not settings.sender_email:
            error_msg = f"Sender email not configured for campaign {campaign_id}"
            logger.error(f"[STEP 5 FAILED] {error_msg}")
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$set": {"status": "failed"}}
            )
            logger.error(f"[FAILURE] Campaign {campaign_id} status set to 'failed' - Sender email missing")
            return
        logger.info(f"[STEP 5 SUCCESS] Settings validated")
        
        # Get target contacts - FILTERED BY USER_ID
        logger.info(f"[STEP 6] Preparing contact filters...")
        target_groups = campaign_obj.target_groups if campaign_obj.target_groups and len(campaign_obj.target_groups) > 0 else None
        target_tags = campaign_obj.target_tags if campaign_obj.target_tags and len(campaign_obj.target_tags) > 0 else None
        logger.info(f"[STEP 6] Target groups: {target_groups}, Target tags: {target_tags}, User ID: {campaign_obj.user_id}")
        
        logger.info(f"[STEP 7] Fetching contacts from database...")
        contacts = await get_contacts_by_filters(
            groups=target_groups,
            tags=target_tags,
            active_only=False,  # Include all contacts, not just active ones
            user_id=campaign_obj.user_id  # CRITICAL: Only send to user's own contacts
        )
        logger.info(f"[STEP 7 SUCCESS] Found {len(contacts)} contacts for campaign {campaign_id}")
        
        if not contacts:
            error_msg = f"No contacts found for campaign {campaign_id}, user {campaign_obj.user_id}"
            logger.warning(f"[STEP 7 FAILED] {error_msg}")
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$set": {"status": "failed"}}
            )
            logger.error(f"[FAILURE] Campaign {campaign_id} status set to 'failed' - No contacts found")
            return
        
        # Configure Resend client
        logger.info(f"[STEP 8] Configuring Resend API client...")
        if not settings.resend_api_key:
            raise Exception("Resend API key not configured")
        resend.api_key = settings.resend_api_key
        logger.info(f"[STEP 8 SUCCESS] Resend API client configured")
        
        # Validate sender email and name
        logger.info(f"[STEP 9] Validating sender information...")
        # Get user info for fallback
        user_data = await db.users.find_one({"id": campaign_obj.user_id}, {"_id": 0})
        sender_name = settings.sender_name or (user_data.get('name', 'BoostTribe') if user_data else "BoostTribe")
        sender_email = settings.sender_email
        
        # If no sender email configured, try to use user's email or Resend's default domain
        if not sender_email:
            if user_data and user_data.get('email'):
                sender_email = user_data['email']
                logger.warning(f"[STEP 9] No sender email configured, using user email: {sender_email}")
            else:
                logger.warning(f"[STEP 9] No sender email configured, using Resend default domain for testing")
                sender_email = "onboarding@resend.dev"
        # Check if the email domain might need verification - if custom domain fails, fallback to default
        elif "@resend.dev" not in sender_email:
            logger.info(f"[STEP 9] Using custom domain email: {sender_email}")
            logger.info(f"[STEP 9] Note: Custom domain must be verified in Resend. If sending fails, consider using onboarding@resend.dev for testing")
        
        logger.info(f"[STEP 9 SUCCESS] Sender: {sender_name} <{sender_email}>")
        
        logger.info(f"[STEP 10] Starting to send {len(contacts)} emails for campaign {campaign_id}...")
        
        sent_count = 0
        failed_count = 0
        
        for idx, contact in enumerate(contacts, 1):
            contact_email = getattr(contact, 'email', 'NO_EMAIL')
            contact_id = getattr(contact, 'id', 'NO_ID')
            logger.info(f"[EMAIL {idx}/{len(contacts)}] Processing contact {contact_id} ({contact_email})...")
            
            try:
                # Validate contact email
                logger.info(f"[EMAIL {idx}] Validating contact email...")
                if not contact.email or not contact.email.strip():
                    logger.warning(f"[EMAIL {idx} SKIPPED] Contact {contact_id} has no email address")
                    failed_count += 1
                    continue
                logger.info(f"[EMAIL {idx}] Email validated: {contact.email}")
                
                # Create tracking pixel
                logger.info(f"[EMAIL {idx}] Creating tracking pixel and modifying content...")
                backend_url = os.getenv("REACT_APP_BACKEND_URL", "http://localhost:8001")
                logger.info(f"[EMAIL {idx}] Backend URL: {backend_url}")
                tracking_pixel = f'<img src="{backend_url}/api/track/open/{campaign_id}/{contact.id}" width="1" height="1" />'
                
                # Add tracking to links
                content_with_tracking = campaign_obj.content_html.replace(
                    'href="',
                    f'href="{backend_url}/api/track/click/{campaign_id}/{contact.id}?url='
                )
                
                # Add tracking pixel
                content_with_tracking += tracking_pixel
                logger.info(f"[EMAIL {idx}] Content prepared with tracking")
                
                # Send email
                params = {
                    "from": f"{sender_name} <{sender_email}>",
                    "to": [contact.email.strip()],
                    "subject": campaign_obj.subject,
                    "html": content_with_tracking,
                }
                logger.info(f"[EMAIL {idx}] Email params prepared. From: {sender_name} <{sender_email}>, To: {contact.email.strip()}, Subject: {campaign_obj.subject[:50]}...")
                
                # Send email via Resend API
                logger.info(f"[EMAIL {idx}] Calling Resend.Emails.send()...")
                try:
                    response = resend.Emails.send(params)
                    logger.info(f"[EMAIL {idx}] Resend API call completed. Response type: {type(response)}, Response: {response}")
                    
                    # Check response - Resend returns a dict with 'id' on success or 'error' on failure
                    if isinstance(response, dict):
                        if 'error' in response:
                            error_msg = f"Resend API error: {response.get('error', 'Unknown error')}"
                            logger.error(f"[EMAIL {idx} FAILED] {error_msg}")
                            logger.error(f"[EMAIL {idx}] Full response: {response}")
                            raise Exception(error_msg)
                        elif 'id' in response:
                            logger.info(f"[EMAIL {idx} SUCCESS] Email sent successfully. Resend ID: {response.get('id')}")
                        else:
                            logger.warning(f"[EMAIL {idx} WARNING] Unexpected Resend response format: {response}")
                    elif hasattr(response, '__dict__'):
                        logger.info(f"[EMAIL {idx}] Response object attributes: {dir(response)}")
                        logger.info(f"[EMAIL {idx}] Response __dict__: {response.__dict__ if hasattr(response, '__dict__') else 'N/A'}")
                    else:
                        logger.info(f"[EMAIL {idx}] Response type: {type(response)}, Value: {response}")
                    
                except Exception as resend_error:
                    logger.error(f"[EMAIL {idx} RESEND ERROR] Exception during Resend API call: {str(resend_error)}")
                    logger.exception(resend_error)
                    raise  # Re-raise to be caught by outer exception handler
                
                # Log email
                logger.info(f"[EMAIL {idx}] Creating email log entry...")
                email_log = EmailLog(
                    campaign_id=campaign_id,
                    contact_id=contact.id,
                    contact_email=contact.email,
                    user_id=campaign_obj.user_id,  # Add user_id
                    status="sent"
                )
                log_doc = email_log.model_dump()
                log_doc['sent_at'] = log_doc['sent_at'].isoformat()
                logger.info(f"[EMAIL {idx}] Email log document prepared: {log_doc}")
                await db.email_logs.insert_one(log_doc)
                logger.info(f"[EMAIL {idx}] Email log inserted into database")
                
                # Update contact stats
                logger.info(f"[EMAIL {idx}] Updating contact stats...")
                await db.contacts.update_one(
                    {"id": contact.id},
                    {"$inc": {"stats.emails_received": 1}}
                )
                logger.info(f"[EMAIL {idx}] Contact stats updated")
                
                sent_count += 1
                logger.info(f"[EMAIL {idx} COMPLETED] Successfully sent. Total sent: {sent_count}, Total failed: {failed_count}")
                
            except Exception as e:
                error_message = str(e)
                logger.error(f"[EMAIL {idx} EXCEPTION] Error sending email to {contact_email}: {error_message}")
                logger.exception(e)  # Log full traceback
                
                # Check for Resend testing limitations
                if "can only send testing emails to your own email address" in error_message.lower():
                    logger.error(f"[EMAIL {idx}] ⚠️ RESEND TESTING LIMITATION DETECTED!")
                    logger.error(f"[EMAIL {idx}] Resend's free/testing tier only allows sending to your own email address.")
                    logger.error(f"[EMAIL {idx}] To send to other recipients, you must:")
                    logger.error(f"[EMAIL {idx}]   1. Verify a domain in Resend: https://resend.com/domains")
                    logger.error(f"[EMAIL {idx}]   2. Use an email from that verified domain as sender")
                    logger.error(f"[EMAIL {idx}]   OR upgrade to a paid Resend plan")
                    logger.error(f"[EMAIL {idx}] Current sender: {sender_email}")
                    logger.error(f"[EMAIL {idx}] Attempting to send to: {contact_email}")
                    logger.error(f"[EMAIL {idx}] Account owner email: abdul.wasay308@gmail.com")
                
                failed_count += 1
                
                # Log failed email
                logger.info(f"[EMAIL {idx}] Creating failed email log entry...")
                try:
                    email_log = EmailLog(
                        campaign_id=campaign_id,
                        contact_id=contact.id if hasattr(contact, 'id') else 'unknown',
                        contact_email=contact_email,
                        user_id=campaign_obj.user_id,
                        status="failed",
                        error_message=str(e)
                    )
                    log_doc = email_log.model_dump()
                    log_doc['sent_at'] = log_doc['sent_at'].isoformat()
                    await db.email_logs.insert_one(log_doc)
                    logger.info(f"[EMAIL {idx}] Failed email log inserted into database")
                except Exception as log_error:
                    logger.error(f"[EMAIL {idx}] Failed to create email log: {str(log_error)}")
                    logger.exception(log_error)
        
        # Update campaign status based on results
        logger.info(f"[STEP 11] Updating campaign status. Sent: {sent_count}, Failed: {failed_count}")
        if sent_count > 0:
            # At least some emails were sent successfully
            logger.info(f"[STEP 11] Updating campaign to 'sent' status...")
            update_result = await db.campaigns.update_one(
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
            logger.info(f"[STEP 11 SUCCESS] Campaign status updated. Modified count: {update_result.modified_count}")
            logger.info(f"=== CAMPAIGN {campaign_id} COMPLETED SUCCESSFULLY: {sent_count} sent, {failed_count} failed ===")
        else:
            # No emails were sent successfully
            logger.error(f"[STEP 11] No emails sent successfully. Updating campaign to 'failed' status...")
            update_result = await db.campaigns.update_one(
                {"id": campaign_id},
                {
                    "$set": {
                        "status": "failed",
                        "stats.sent": 0,
                        "stats.failed": failed_count
                    }
                }
            )
            logger.error(f"[STEP 11 FAILED] Campaign status set to 'failed'. Modified count: {update_result.modified_count}")
            logger.error(f"=== CAMPAIGN {campaign_id} FAILED: No emails sent, {failed_count} failed ===")
        
    except Exception as e:
        logger.error(f"=== CRITICAL ERROR IN CAMPAIGN {campaign_id} ===")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception message: {str(e)}")
        logger.exception(e)  # Log full traceback
        logger.error(f"Setting campaign {campaign_id} status to 'failed'...")
        try:
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$set": {"status": "failed"}}
            )
            logger.error(f"Campaign status updated to 'failed'")
        except Exception as update_error:
            logger.error(f"CRITICAL: Failed to update campaign status: {str(update_error)}")
            logger.exception(update_error)
        logger.error(f"=== END OF CRITICAL ERROR FOR CAMPAIGN {campaign_id} ===")


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
async def get_analytics_overview(current_user: Dict = Depends(get_current_user)):
    """Get overall analytics for the current user"""
    user_id = current_user["id"]
    
    # Get user's campaigns
    user_campaigns = await db.campaigns.find({"user_id": user_id}, {"_id": 0, "id": 1}).to_list(1000)
    campaign_ids = [c["id"] for c in user_campaigns]
    
    # Get user's WhatsApp campaigns
    user_whatsapp_campaigns = await db.whatsapp_campaigns.find({"user_id": user_id}, {"_id": 0, "id": 1}).to_list(1000)
    whatsapp_campaign_ids = [c["id"] for c in user_whatsapp_campaigns]
    
    # Get user's contacts
    total_contacts = await db.contacts.count_documents({"user_id": user_id})
    active_contacts = await db.contacts.count_documents({"user_id": user_id, "active": True})
    
    # Get campaign counts
    total_campaigns = len(campaign_ids)
    sent_campaigns = await db.campaigns.count_documents({"user_id": user_id, "status": "sent"})
    
    # Get email stats (filtered by user_id and campaign_ids for better accuracy)
    # Use both user_id and campaign_ids for filtering
    if campaign_ids:
        total_emails_sent = await db.email_logs.count_documents({"user_id": user_id, "campaign_id": {"$in": campaign_ids}, "status": {"$in": ["sent", "opened", "clicked"]}})
        total_emails_opened = await db.email_logs.count_documents({"user_id": user_id, "campaign_id": {"$in": campaign_ids}, "status": {"$in": ["opened", "clicked"]}})
        total_emails_clicked = await db.email_logs.count_documents({"user_id": user_id, "campaign_id": {"$in": campaign_ids}, "status": "clicked"})
    else:
        # Fallback to user_id only if no campaigns
        total_emails_sent = await db.email_logs.count_documents({"user_id": user_id, "status": {"$in": ["sent", "opened", "clicked"]}})
        total_emails_opened = await db.email_logs.count_documents({"user_id": user_id, "status": {"$in": ["opened", "clicked"]}})
        total_emails_clicked = await db.email_logs.count_documents({"user_id": user_id, "status": "clicked"})
    
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
async def get_campaign_analytics(current_user: Dict = Depends(get_current_user)):
    """Get campaign performance analytics for the current user"""
    user_id = current_user["id"]
    campaigns = await db.campaigns.find({"user_id": user_id, "status": "sent"}, {"_id": 0}).to_list(1000)
    
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
async def generate_ai_content(request: AIGenerateRequest, current_user: Dict = Depends(get_current_user)):
    """Generate email content using AI"""
    settings = await get_settings(user_id=current_user["id"])
    
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
# ROUTES - WHATSAPP CAMPAIGNS
# ========================

@api_router.get("/whatsapp/campaigns", response_model=List[WhatsAppCampaign])
async def get_whatsapp_campaigns():
    """Get all WhatsApp campaigns"""
    campaigns = await db.whatsapp_campaigns.find({}, {"_id": 0}).to_list(1000)
    for campaign in campaigns:
        for date_field in ['created_at', 'scheduled_at', 'sent_at']:
            if campaign.get(date_field) and isinstance(campaign[date_field], str):
                campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    return campaigns

@api_router.post("/whatsapp/campaigns", response_model=WhatsAppCampaign)
async def create_whatsapp_campaign(campaign_data: WhatsAppCampaignCreate):
    """Create a new WhatsApp campaign"""
    campaign = WhatsAppCampaign(**campaign_data.model_dump())
    if campaign_data.scheduled_at:
        campaign.status = "scheduled"
    
    doc = campaign.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('scheduled_at'):
        doc['scheduled_at'] = doc['scheduled_at'].isoformat()
    if doc.get('sent_at'):
        doc['sent_at'] = doc['sent_at'].isoformat()
    
    await db.whatsapp_campaigns.insert_one(doc)
    return campaign

@api_router.put("/whatsapp/campaigns/{campaign_id}", response_model=WhatsAppCampaign)
async def update_whatsapp_campaign(campaign_id: str, campaign_update: WhatsAppCampaignUpdate):
    """Update a WhatsApp campaign"""
    campaign = await db.whatsapp_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    for date_field in ['created_at', 'scheduled_at', 'sent_at']:
        if campaign.get(date_field) and isinstance(campaign[date_field], str):
            campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    
    campaign_obj = WhatsAppCampaign(**campaign)
    update_data = campaign_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(campaign_obj, key, value)
    
    doc = campaign_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('scheduled_at'):
        doc['scheduled_at'] = doc['scheduled_at'].isoformat()
    if doc.get('sent_at'):
        doc['sent_at'] = doc['sent_at'].isoformat()
    
    await db.whatsapp_campaigns.update_one({"id": campaign_id}, {"$set": doc})
    return campaign_obj

@api_router.post("/whatsapp/campaigns/{campaign_id}/send")
async def send_whatsapp_campaign(campaign_id: str, background_tasks: BackgroundTasks):
    """Send a WhatsApp campaign immediately"""
    campaign = await db.whatsapp_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    for date_field in ['created_at', 'scheduled_at', 'sent_at']:
        if campaign.get(date_field) and isinstance(campaign[date_field], str):
            campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    
    campaign_obj = WhatsAppCampaign(**campaign)
    
    if campaign_obj.status == "sent":
        raise HTTPException(status_code=400, detail="Campaign already sent")
    
    # Update status to sending
    await db.whatsapp_campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"status": "sending"}}
    )
    
    # Send messages in background
    background_tasks.add_task(send_whatsapp_campaign_messages, campaign_id)
    
    return {"message": "WhatsApp campaign is being sent", "campaign_id": campaign_id}

async def send_whatsapp_campaign_messages(campaign_id: str):
    """Background task to send WhatsApp campaign messages"""
    try:
        campaign = await db.whatsapp_campaigns.find_one({"id": campaign_id}, {"_id": 0})
        if not campaign:
            return
        
        for date_field in ['created_at', 'scheduled_at', 'sent_at']:
            if campaign.get(date_field) and isinstance(campaign[date_field], str):
                campaign[date_field] = datetime.fromisoformat(campaign[date_field])
        
        campaign_obj = WhatsAppCampaign(**campaign)
        settings = await get_settings()
        
        # Check WhatsApp credentials
        if not settings.whatsapp_access_token or not settings.whatsapp_phone_number_id:
            logger.error("WhatsApp credentials not configured")
            await db.whatsapp_campaigns.update_one(
                {"id": campaign_id},
                {"$set": {"status": "failed"}}
            )
            return
        
        # Initialize WhatsApp service
        whatsapp = WhatsAppService(
            access_token=settings.whatsapp_access_token,
            phone_number_id=settings.whatsapp_phone_number_id
        )
        
        # Get target contacts
        contacts = await get_contacts_by_filters(
            groups=campaign_obj.target_groups if campaign_obj.target_groups else None,
            tags=campaign_obj.target_tags if campaign_obj.target_tags else None
        )
        
        if not contacts:
            logger.warning(f"No contacts found for WhatsApp campaign {campaign_id}")
            await db.whatsapp_campaigns.update_one(
                {"id": campaign_id},
                {"$set": {"status": "failed"}}
            )
            return
        
        sent_count = 0
        failed_count = 0
        
        for contact in contacts:
            try:
                # Assume phone stored in tags or add phone field to Contact model
                phone = getattr(contact, 'phone', None)
                if not phone:
                    # Try to extract from tags
                    phone_tags = [t for t in contact.tags if t.startswith('phone:')]
                    if phone_tags:
                        phone = phone_tags[0].replace('phone:', '')
                
                if not phone:
                    logger.warning(f"No phone number for contact {contact.id}")
                    failed_count += 1
                    continue
                
                # Send WhatsApp message
                result = whatsapp.send_text_message(
                    to=phone,
                    message=campaign_obj.message_content
                )
                
                # Log message
                whatsapp_msg = WhatsAppMessage(
                    campaign_id=campaign_id,
                    contact_id=contact.id,
                    contact_phone=phone,
                    direction="outbound",
                    content=campaign_obj.message_content,
                    status="sent"
                )
                msg_doc = whatsapp_msg.model_dump()
                msg_doc['timestamp'] = msg_doc['timestamp'].isoformat()
                await db.whatsapp_messages.insert_one(msg_doc)
                
                sent_count += 1
                
            except Exception as e:
                logger.error(f"Error sending WhatsApp to contact {contact.id}: {e}")
                failed_count += 1
                
                # Log failed message
                whatsapp_msg = WhatsAppMessage(
                    campaign_id=campaign_id,
                    contact_id=contact.id,
                    contact_phone=phone if phone else "unknown",
                    direction="outbound",
                    content=campaign_obj.message_content,
                    status="failed",
                    error_message=str(e)
                )
                msg_doc = whatsapp_msg.model_dump()
                msg_doc['timestamp'] = msg_doc['timestamp'].isoformat()
                await db.whatsapp_messages.insert_one(msg_doc)
        
        # Update campaign
        await db.whatsapp_campaigns.update_one(
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
        
        logger.info(f"WhatsApp campaign {campaign_id} sent: {sent_count} sent, {failed_count} failed")
        
    except Exception as e:
        logger.error(f"Error sending WhatsApp campaign {campaign_id}: {e}")
        await db.whatsapp_campaigns.update_one(
            {"id": campaign_id},
            {"$set": {"status": "failed"}}
        )


# ========================
# ROUTES - WHATSAPP WEBHOOK & MESSAGING
# ========================

@api_router.get("/whatsapp/webhook")
async def verify_whatsapp_webhook(request: Request):
    """Verify WhatsApp webhook"""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.token")
    challenge = request.query_params.get("hub.challenge")
    
    settings = await get_settings()
    verify_token = settings.whatsapp_verify_token or "afroboost_verify_token"
    
    result = WhatsAppService.verify_webhook(mode, token, challenge, verify_token)
    
    if result:
        return JSONResponse(content=int(result))
    else:
        raise HTTPException(status_code=403, detail="Verification failed")

@api_router.post("/whatsapp/webhook")
async def handle_whatsapp_webhook(request: Request, background_tasks: BackgroundTasks):
    """Handle incoming WhatsApp messages"""
    try:
        body = await request.json()
        
        # Process webhook
        if body.get("object") == "whatsapp_business_account":
            for entry in body.get("entry", []):
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    
                    # Handle incoming messages
                    if "messages" in value:
                        for message in value["messages"]:
                            background_tasks.add_task(
                                handle_incoming_whatsapp_message,
                                message,
                                value.get("contacts", [{}])[0]
                            )
                    
                    # Handle message status updates
                    if "statuses" in value:
                        for status in value["statuses"]:
                            background_tasks.add_task(
                                update_whatsapp_message_status,
                                status
                            )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error processing WhatsApp webhook: {e}")
        return {"status": "error"}

async def handle_incoming_whatsapp_message(message: Dict, contact_info: Dict):
    """Handle incoming WhatsApp message with AI response"""
    try:
        from_phone = message.get("from")
        message_content = message.get("text", {}).get("body", "")
        message_id = message.get("id")
        
        if not message_content:
            return
        
        # Find or create contact
        contact = await db.contacts.find_one({"tags": f"phone:{from_phone}"}, {"_id": 0})
        
        if not contact:
            # Create new contact
            contact_name = contact_info.get("profile", {}).get("name", "Unknown")
            new_contact = Contact(
                name=contact_name,
                email=f"{from_phone}@whatsapp.temp",
                tags=[f"phone:{from_phone}", "whatsapp"],
                group="whatsapp",
                active=True
            )
            contact_doc = new_contact.model_dump()
            contact_doc['created_at'] = contact_doc['created_at'].isoformat()
            await db.contacts.insert_one(contact_doc)
            contact = contact_doc
        
        contact_obj = Contact(**contact) if isinstance(contact, dict) else contact
        
        # Log incoming message
        incoming_msg = WhatsAppMessage(
            contact_id=contact_obj.id,
            contact_phone=from_phone,
            direction="inbound",
            content=message_content,
            status="received"
        )
        msg_doc = incoming_msg.model_dump()
        msg_doc['timestamp'] = msg_doc['timestamp'].isoformat()
        await db.whatsapp_messages.insert_one(msg_doc)
        
        # Add to AI memory
        await ai_memory.add_message(
            contact_id=contact_obj.id,
            role="user",
            content=message_content,
            channel="whatsapp"
        )
        
        # Generate AI response
        settings = await get_settings()
        client = get_openai_client(settings.openai_api_key)
        
        # Get conversation context
        context = await ai_memory.get_context_for_ai(
            contact_id=contact_obj.id,
            contact_name=contact_obj.name,
            campaign_context="Message WhatsApp Afroboost"
        )
        
        system_prompt = f"""Tu es l'assistant IA d'Afroboost, une entreprise de danse et fitness.
Tu réponds aux messages WhatsApp de manière professionnelle, amicale et énergique.
Tu peux répondre aux questions sur les cours, les tarifs et l'inscription.

Plans Afroboost:
- Starter: Gratuit, jusqu'à 100 emails/mois
- Pro Coach: 49 CHF/mois, jusqu'à 5000 emails/mois, IA intégrée
- Business: 149 CHF/mois, illimité

{context}"""
        
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message_content}
            ],
            temperature=0.7,
            max_tokens=300
        )
        
        ai_response = response.choices[0].message.content
        
        # Add AI response to memory
        await ai_memory.add_message(
            contact_id=contact_obj.id,
            role="assistant",
            content=ai_response,
            channel="whatsapp"
        )
        
        # Send AI response via WhatsApp
        whatsapp = WhatsAppService(
            access_token=settings.whatsapp_access_token,
            phone_number_id=settings.whatsapp_phone_number_id
        )
        
        whatsapp.send_text_message(to=from_phone, message=ai_response)
        
        # Log outgoing response
        outgoing_msg = WhatsAppMessage(
            contact_id=contact_obj.id,
            contact_phone=from_phone,
            direction="outbound",
            content=ai_response,
            status="sent"
        )
        out_doc = outgoing_msg.model_dump()
        out_doc['timestamp'] = out_doc['timestamp'].isoformat()
        await db.whatsapp_messages.insert_one(out_doc)
        
        # Mark original message as read
        whatsapp.mark_message_read(message_id)
        
        logger.info(f"AI responded to WhatsApp message from {from_phone}")
        
    except Exception as e:
        logger.error(f"Error handling incoming WhatsApp message: {e}")

async def update_whatsapp_message_status(status: Dict):
    """Update WhatsApp message status (delivered, read, etc.)"""
    try:
        message_id = status.get("id")
        new_status = status.get("status")
        
        # Update in database
        await db.whatsapp_messages.update_one(
            {"id": message_id},
            {"$set": {"status": new_status}}
        )
        
        # Update campaign stats if applicable
        message = await db.whatsapp_messages.find_one({"id": message_id}, {"_id": 0})
        if message and message.get("campaign_id"):
            stat_field = f"stats.{new_status}"
            await db.whatsapp_campaigns.update_one(
                {"id": message["campaign_id"]},
                {"$inc": {stat_field: 1}}
            )
        
    except Exception as e:
        logger.error(f"Error updating WhatsApp message status: {e}")


# ========================
# ROUTES - AI CONVERSATION
# ========================

@api_router.post("/ai/conversation", response_model=AIConversationResponse)
async def ai_conversation(request: AIConversationRequest):
    """AI conversational response with memory"""
    try:
        settings = await get_settings()
        client = get_openai_client(settings.openai_api_key)
        
        # Add user message to memory
        await ai_memory.add_message(
            contact_id=request.contact_id,
            role="user",
            content=request.message
        )
        
        # Get conversation context
        context = await ai_memory.get_context_for_ai(
            contact_id=request.contact_id,
            contact_name=request.contact_name,
            campaign_context=request.campaign_context
        )
        
        system_prompt = f"""Tu es l'assistant IA d'Afroboost, une entreprise de danse et fitness.
Tu réponds aux messages de manière professionnelle, amicale et énergique en {request.language}.

Contexte de la conversation:
{context}

Réponds de manière naturelle et personnalisée."""

        # Generate AI response
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ]
        )
        
        ai_response = response.choices[0].message.content
        
        # Add AI response to memory
        await ai_memory.add_message(
            contact_id=request.contact_id,
            role="assistant",
            content=ai_response
        )
        
        return AIConversationResponse(
            response=ai_response,
            context_used=context
        )
        
    except Exception as e:
        logger.error(f"Error in AI conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# ROUTES - ADVANCED WHATSAPP (TEMPLATES & CAMPAIGNS)
# ========================

@api_router.get("/whatsapp/templates", response_model=List[MessageTemplate])
async def get_message_templates(current_user: Dict = Depends(get_current_user)):
    """Get all message templates for the user"""
    templates = await db.message_templates.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(length=None)
    
    # Parse dates
    for template in templates:
        if isinstance(template.get('created_at'), str):
            template['created_at'] = datetime.fromisoformat(template['created_at'])
        if isinstance(template.get('updated_at'), str):
            template['updated_at'] = datetime.fromisoformat(template['updated_at'])
    
    return templates

@api_router.post("/whatsapp/templates", response_model=MessageTemplate)
async def create_message_template(
    template_data: MessageTemplateCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new message template"""
    template = MessageTemplate(
        user_id=current_user["id"],
        **template_data.model_dump(),
        has_media=bool(template_data.media_url)
    )
    
    template_dict = template.model_dump()
    template_dict["created_at"] = template_dict["created_at"].isoformat()
    template_dict["updated_at"] = template_dict["updated_at"].isoformat()
    
    await db.message_templates.insert_one(template_dict)
    
    return template

@api_router.put("/whatsapp/templates/{template_id}", response_model=MessageTemplate)
async def update_message_template(
    template_id: str,
    template_data: MessageTemplateUpdate,
    current_user: Dict = Depends(get_current_user)
):
    """Update a message template"""
    update_data = {k: v for k, v in template_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if "media_url" in update_data:
        update_data["has_media"] = bool(update_data["media_url"])
    
    result = await db.message_templates.update_one(
        {"id": template_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template = await db.message_templates.find_one(
        {"id": template_id},
        {"_id": 0}
    )
    
    # Parse dates
    if isinstance(template.get('created_at'), str):
        template['created_at'] = datetime.fromisoformat(template['created_at'])
    if isinstance(template.get('updated_at'), str):
        template['updated_at'] = datetime.fromisoformat(template['updated_at'])
    
    return MessageTemplate(**template)

@api_router.delete("/whatsapp/templates/{template_id}")
async def delete_message_template(
    template_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Delete a message template"""
    result = await db.message_templates.delete_one(
        {"id": template_id, "user_id": current_user["id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted successfully"}

@api_router.get("/whatsapp/advanced-campaigns", response_model=List[AdvancedWhatsAppCampaign])
async def get_advanced_campaigns(current_user: Dict = Depends(get_current_user)):
    """Get all advanced WhatsApp campaigns for the user"""
    campaigns = await db.advanced_whatsapp_campaigns.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(length=None)
    
    # Parse dates
    for campaign in campaigns:
        for date_field in ['created_at', 'updated_at', 'scheduled_at', 'sent_at']:
            if isinstance(campaign.get(date_field), str):
                campaign[date_field] = datetime.fromisoformat(campaign[date_field])
    
    return campaigns

@api_router.post("/whatsapp/advanced-campaigns", response_model=AdvancedWhatsAppCampaign)
async def create_advanced_campaign(
    campaign_data: AdvancedWhatsAppCampaignCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new advanced WhatsApp campaign"""
    # Parse scheduled_at if provided
    scheduled_at = None
    if campaign_data.scheduled_at:
        try:
            scheduled_at = datetime.fromisoformat(campaign_data.scheduled_at)
        except:
            pass
    
    campaign = AdvancedWhatsAppCampaign(
        user_id=current_user["id"],
        title=campaign_data.title,
        template_id=campaign_data.template_id,
        message_content=campaign_data.message_content,
        language=campaign_data.language,
        buttons=campaign_data.buttons,
        list_sections=campaign_data.list_sections,
        has_media=bool(campaign_data.media_url),
        media_url=campaign_data.media_url,
        media_type=campaign_data.media_type,
        target_contacts=campaign_data.target_contacts,
        target_tags=campaign_data.target_tags,
        target_status=campaign_data.target_status,
        use_personalization=campaign_data.use_personalization,
        scheduled_at=scheduled_at,
        payment_links=campaign_data.payment_links
    )
    
    campaign_dict = campaign.model_dump()
    campaign_dict["created_at"] = campaign_dict["created_at"].isoformat()
    campaign_dict["updated_at"] = campaign_dict["updated_at"].isoformat()
    if campaign_dict.get("scheduled_at"):
        campaign_dict["scheduled_at"] = campaign_dict["scheduled_at"].isoformat()
    
    await db.advanced_whatsapp_campaigns.insert_one(campaign_dict)
    
    return campaign

@api_router.post("/whatsapp/advanced-campaigns/{campaign_id}/send")
async def send_advanced_campaign(
    campaign_id: str,
    background_tasks: BackgroundTasks,
    current_user: Dict = Depends(get_current_user)
):
    """Send an advanced WhatsApp campaign (SIMULATION MODE)"""
    campaign = await db.advanced_whatsapp_campaigns.find_one(
        {"id": campaign_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get target contacts - FILTERED BY USER_ID
    query = {"user_id": current_user["id"]}  # CRITICAL: Only user's own contacts
    
    if campaign.get("target_contacts"):
        query["id"] = {"$in": campaign["target_contacts"]}
    if campaign.get("target_tags"):
        query["tags"] = {"$in": campaign["target_tags"]}
    if campaign.get("target_status"):
        query["status"] = campaign["target_status"]
    
    logger.info(f"WhatsApp campaign query: {query}")
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(length=None)
    
    logger.info(f"Found {len(contacts)} contacts for WhatsApp campaign")
    
    if not contacts:
        raise HTTPException(status_code=400, detail="No contacts match the targeting criteria")
    
    # SIMULATION MODE - Just log and update stats
    logger.info(f"[SIMULATION] Sending campaign {campaign_id} to {len(contacts)} contacts")
    
    # Update campaign status
    await db.advanced_whatsapp_campaigns.update_one(
        {"id": campaign_id},
        {
            "$set": {
                "status": "sent",
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "stats.sent": len(contacts),
                "stats.delivered": len(contacts),  # Simulate all delivered
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Create analytics records (simulation)
    for contact in contacts:
        analytics = CampaignAnalytics(
            campaign_id=campaign_id,
            contact_id=contact["id"],
            contact_phone=contact.get("phone_number", "Unknown"),
            sent=True,
            delivered=True,  # Simulate delivery
            sent_at=datetime.now(timezone.utc),
            delivered_at=datetime.now(timezone.utc)
        )
        
        analytics_dict = analytics.model_dump()
        analytics_dict["created_at"] = analytics_dict["created_at"].isoformat()
        if analytics_dict.get("sent_at"):
            analytics_dict["sent_at"] = analytics_dict["sent_at"].isoformat()
        if analytics_dict.get("delivered_at"):
            analytics_dict["delivered_at"] = analytics_dict["delivered_at"].isoformat()
        
        await db.campaign_analytics.insert_one(analytics_dict)
    
    return {
        "message": "Campaign sent successfully (SIMULATION MODE)",
        "contacts_targeted": len(contacts),
        "status": "sent"
    }

@api_router.get("/whatsapp/campaigns/{campaign_id}/analytics")
async def get_campaign_analytics(
    campaign_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get detailed analytics for a campaign"""
    # Verify campaign belongs to user
    campaign = await db.advanced_whatsapp_campaigns.find_one(
        {"id": campaign_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get analytics
    analytics = await db.campaign_analytics.find(
        {"campaign_id": campaign_id},
        {"_id": 0}
    ).to_list(length=None)
    
    # Calculate summary
    summary = {
        "total": len(analytics),
        "sent": sum(1 for a in analytics if a.get("sent")),
        "delivered": sum(1 for a in analytics if a.get("delivered")),
        "read": sum(1 for a in analytics if a.get("read")),
        "replied": sum(1 for a in analytics if a.get("replied")),
        "clicked": sum(1 for a in analytics if a.get("clicked")),
        "payment_completed": sum(1 for a in analytics if a.get("payment_completed"))
    }
    
    return {
        "campaign": campaign,
        "summary": summary,
        "details": analytics
    }

@api_router.post("/whatsapp/payment-link")
async def create_payment_link(
    payment_data: PaymentLinkCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create a payment link for WhatsApp (SIMULATION MODE)"""
    # SIMULATION - Generate a dummy link
    payment_id = str(uuid.uuid4())[:8]
    
    if payment_data.payment_method == "stripe":
        # In real implementation, create Stripe payment link here
        link = f"https://pay.stripe.com/simulation/{payment_id}"
    elif payment_data.payment_method == "twint":
        # In real implementation, create Twint payment link here
        link = f"https://pay.twint.ch/simulation/{payment_id}"
    else:
        raise HTTPException(status_code=400, detail="Invalid payment method")
    
    logger.info(f"[SIMULATION] Created payment link: {link}")
    
    return {
        "payment_link": link,
        "payment_id": payment_id,
        "amount": payment_data.amount,
        "currency": payment_data.currency,
        "description": payment_data.description,
        "method": payment_data.payment_method,
        "note": "SIMULATION MODE - This is a test link"
    }


@api_router.get("/ai/conversation/{contact_id}/history")
async def get_conversation_history(contact_id: str):
    """Get conversation history for a contact"""
    try:
        history = await ai_memory.get_conversation_history(contact_id)
        summary = await ai_memory.get_conversation_summary(contact_id)
        
        return {
            "contact_id": contact_id,
            "history": history,
            "summary": summary
        }
    except Exception as e:
        logger.error(f"Error getting conversation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/ai/conversation/{contact_id}")
async def clear_conversation_history(contact_id: str):
    """Clear conversation history for a contact"""
    try:
        await ai_memory.clear_conversation(contact_id)
        return {"message": "Conversation history cleared"}
    except Exception as e:
        logger.error(f"Error clearing conversation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# ========================
# ROUTES - AI ASSISTANT (GLOBAL)
# ========================

@api_router.post("/ai/assistant/chat", response_model=AIAssistantResponse)
async def ai_assistant_chat(
    request: AIAssistantRequest,
    current_user: Dict = Depends(get_current_user)
):
    """AI Assistant chat - omnipresent helper for users"""
    try:
        # Generate or use provided session_id
        session_id = request.session_id or str(uuid.uuid4())
        user_id = current_user["id"]
        
        # Get EMERGENT_LLM_KEY
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        if not EMERGENT_AVAILABLE:
            raise HTTPException(status_code=500, detail="AI service library not available. Please install emergentintegrations.")
        
        # Build system message based on task type
        system_messages = {
            "general": """Tu es l'Assistant IA d'Afroboost, une plateforme de marketing intelligente.
Tu aides les utilisateurs à gérer leurs campagnes, contacts, et stratégies marketing.
Sois professionnel, amical et concis. Réponds en français.""",
            
            "campaign": """Tu es un expert en création de campagnes marketing.
Aide l'utilisateur à créer du contenu engageant pour emails et WhatsApp.
Propose des structures, des accroches, et des appels à l'action efficaces.
Adapte le ton selon le public cible.""",
            
            "analysis": """Tu es un analyste de données marketing.
Aide l'utilisateur à comprendre ses statistiques et à en tirer des insights actionnables.
Propose des recommandations concrètes basées sur les données.""",
            
            "strategy": """Tu es un stratège marketing.
Aide l'utilisateur à planifier ses campagnes, définir ses objectifs, et optimiser son approche.
Pose des questions pertinentes et guide vers les meilleures pratiques."""
        }
        
        system_message = system_messages.get(request.task_type, system_messages["general"])
        
        # Add context to system message if provided
        if request.context:
            context_str = "\n\nContexte actuel:\n"
            for key, value in request.context.items():
                context_str += f"- {key}: {value}\n"
            system_message += context_str
        
        # Initialize LlmChat with emergentintegrations
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-4o-mini")  # Using gpt-4o-mini as default (cost-effective)
        
        # Get conversation history from database
        history = await db.ai_assistant_messages.find(
            {"user_id": user_id, "session_id": session_id},
            {"_id": 0}
        ).sort("created_at", 1).limit(20).to_list(length=20)
        
        # Create user message
        user_message = UserMessage(text=request.message)
        
        # Send message and get response
        response_text = await chat.send_message(user_message)
        
        # Save user message to database
        user_msg = AIAssistantMessage(
            user_id=user_id,
            session_id=session_id,
            role="user",
            content=request.message,
            context=request.context or {}
        )
        user_msg_dict = user_msg.model_dump()
        user_msg_dict["created_at"] = user_msg_dict["created_at"].isoformat()
        await db.ai_assistant_messages.insert_one(user_msg_dict)
        
        # Save assistant response to database
        assistant_msg = AIAssistantMessage(
            user_id=user_id,
            session_id=session_id,
            role="assistant",
            content=response_text,
            context=request.context or {}
        )
        assistant_msg_dict = assistant_msg.model_dump()
        assistant_msg_dict["created_at"] = assistant_msg_dict["created_at"].isoformat()
        await db.ai_assistant_messages.insert_one(assistant_msg_dict)
        
        # Generate suggestions based on task type
        suggestions = []
        if request.task_type == "campaign":
            suggestions = [
                "Créer une campagne email",
                "Générer du contenu WhatsApp",
                "Optimiser mon message"
            ]
        elif request.task_type == "analysis":
            suggestions = [
                "Analyser mes statistiques",
                "Comparer mes campagnes",
                "Identifier les opportunités"
            ]
        elif request.task_type == "strategy":
            suggestions = [
                "Planifier ma prochaine campagne",
                "Définir mes objectifs",
                "Améliorer mon ROI"
            ]
        else:
            suggestions = [
                "Comment créer une campagne ?",
                "Analyser mes résultats",
                "Conseils marketing"
            ]
        
        return AIAssistantResponse(
            response=response_text,
            session_id=session_id,
            suggestions=suggestions,
            context=request.context or {}
        )
        
    except Exception as e:
        logger.error(f"Error in AI Assistant: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI Assistant error: {str(e)}")

@api_router.get("/ai/assistant/sessions")
async def get_ai_assistant_sessions(current_user: Dict = Depends(get_current_user)):
    """Get all AI Assistant sessions for current user"""
    try:
        # Get unique session IDs with latest message
        pipeline = [
            {"$match": {"user_id": current_user["id"]}},
            {"$sort": {"created_at": -1}},
            {"$group": {
                "_id": "$session_id",
                "latest_message": {"$first": "$content"},
                "latest_time": {"$first": "$created_at"},
                "message_count": {"$sum": 1}
            }},
            {"$sort": {"latest_time": -1}},
            {"$limit": 10}
        ]
        
        sessions = await db.ai_assistant_messages.aggregate(pipeline).to_list(length=10)
        
        return {
            "sessions": [
                {
                    "session_id": s["_id"],
                    "preview": s["latest_message"][:100] + "..." if len(s["latest_message"]) > 100 else s["latest_message"],
                    "message_count": s["message_count"],
                    "updated_at": s["latest_time"]
                }
                for s in sessions
            ]
        }
    except Exception as e:
        logger.error(f"Error getting sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/ai/assistant/history/{session_id}")
async def get_ai_assistant_history(
    session_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get chat history for a specific session"""
    try:
        messages = await db.ai_assistant_messages.find(
            {"user_id": current_user["id"], "session_id": session_id},
            {"_id": 0}
        ).sort("created_at", 1).to_list(length=None)
        
        # Parse dates
        for msg in messages:
            if isinstance(msg.get('created_at'), str):
                msg['created_at'] = datetime.fromisoformat(msg['created_at'])
        
        return {
            "session_id": session_id,
            "messages": messages
        }
    except Exception as e:
        logger.error(f"Error getting history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/ai/assistant/session/{session_id}")
async def delete_ai_assistant_session(
    session_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Delete an AI Assistant session"""
    try:
        result = await db.ai_assistant_messages.delete_many({
            "user_id": current_user["id"],
            "session_id": session_id
        })
        
        return {
            "message": "Session deleted",
            "deleted_count": result.deleted_count
        }
    except Exception as e:
        logger.error(f"Error deleting session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# ROUTES - STRIPE PAYMENTS
# ========================

@api_router.post("/stripe/create-payment-intent")
async def create_payment_intent(payment_data: PaymentIntent):
    """Create a Stripe payment intent"""
    try:
        settings = await get_settings()
        if not settings.stripe_secret_key:
            raise HTTPException(status_code=400, detail="Stripe not configured")
        
        stripe.api_key = settings.stripe_secret_key
        
        intent = stripe.PaymentIntent.create(
            amount=payment_data.amount,
            currency=payment_data.currency,
            receipt_email=payment_data.customer_email,
            description=payment_data.description,
            automatic_payment_methods={"enabled": True}
        )
        
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id
        }
    except Exception as e:
        logger.error(f"Error creating payment intent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/stripe/create-subscription")
async def create_subscription(subscription_data: SubscriptionCreate):
    """Create a Stripe subscription"""
    try:
        settings = await get_settings()
        if not settings.stripe_secret_key:
            raise HTTPException(status_code=400, detail="Stripe not configured")
        
        stripe.api_key = settings.stripe_secret_key
        
        # Create customer
        customer = stripe.Customer.create(
            email=subscription_data.customer_email,
            name=subscription_data.customer_name,
            payment_method=subscription_data.payment_method_id,
            invoice_settings={"default_payment_method": subscription_data.payment_method_id}
        )
        
        # Create subscription
        subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{"price": subscription_data.plan_id}],
            expand=["latest_invoice.payment_intent"]
        )
        
        return {
            "subscription_id": subscription.id,
            "customer_id": customer.id,
            "status": subscription.status,
            "client_secret": subscription.latest_invoice.payment_intent.client_secret
        }
    except Exception as e:
        logger.error(f"Error creating subscription: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/stripe/webhook")
async def handle_stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        settings = await get_settings()
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        # Verify webhook signature (configure webhook secret in settings)
        # event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        
        # For now, just parse the payload
        event = await request.json()
        
        event_type = event.get("type")
        
        if event_type == "payment_intent.succeeded":
            payment_intent = event["data"]["object"]
            logger.info(f"Payment succeeded: {payment_intent['id']}")
            # Handle successful payment (create user account, send email, etc.)
        
        elif event_type == "invoice.payment_succeeded":
            invoice = event["data"]["object"]
            subscription_id = invoice.get("subscription")
            logger.info(f"Subscription payment succeeded: {subscription_id}")
            # Update subscription status
        
        elif event_type == "customer.subscription.deleted":
            subscription = event["data"]["object"]
            logger.info(f"Subscription cancelled: {subscription['id']}")
            # Handle subscription cancellation
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error processing Stripe webhook: {e}")
        return {"status": "error"}

@api_router.get("/stripe/config")
async def get_stripe_config():
    """Get Stripe publishable key"""
    settings = await get_settings()
    if not settings.stripe_publishable_key:
        raise HTTPException(status_code=400, detail="Stripe not configured")
    
    return {"publishable_key": settings.stripe_publishable_key}



# ========================
# RESERVATION EMAIL HELPER
# ========================

async def send_welcome_email(contact: Contact, coach_user: Dict):
    """Send welcome email to new contact"""
    resend_api_key = os.environ.get('RESEND_API_KEY')
    
    if not resend_api_key:
        logger.warning("RESEND_API_KEY not configured, skipping welcome email")
        return
    
    resend.api_key = resend_api_key
    
    # Get coach name
    coach_name = coach_user.get('name', 'Votre coach BoostTribe')
    
    text_content = f"""
Bonjour {contact.name},

Bienvenue dans la communauté de {coach_name} ! 🎉

Nous sommes ravis de vous compter parmi nous. Vous recevrez désormais nos actualités, cours, événements et offres exclusives.

Ce que vous pouvez attendre de nous :
✅ Informations sur nos cours et événements
✅ Offres spéciales et promotions
✅ Conseils et astuces
✅ Actualités de la communauté

Vous pouvez vous désabonner à tout moment en nous contactant.

À très bientôt !
{coach_name}

---
Propulsé par BoostTribe
"""
    
    try:
        resend.Emails.send({
            "from": "BoostTribe <onboarding@resend.dev>",
            "to": [contact.email],
            "subject": f"Bienvenue dans la communauté de {coach_name} ! 🎉",
            "text": text_content
        })
        logger.info(f"Welcome email sent to {contact.email}")
    except Exception as e:
        logger.error(f"Error sending welcome email: {str(e)}")
        raise


async def send_thank_you_email(
    customer_name: str,
    customer_email: str,
    item_title: str,
    coach_name: str = "Votre coach"
):
    """Send thank you email after course completion"""
    resend_api_key = os.environ.get('RESEND_API_KEY')
    
    if not resend_api_key:
        logger.warning("RESEND_API_KEY not configured, skipping thank you email")
        return
    
    resend.api_key = resend_api_key
    
    text_content = f"""
Bonjour {customer_name},

Merci d'avoir participé à {item_title} ! 🙏

Nous espérons que vous avez apprécié cette expérience et que vous avez atteint vos objectifs.

Votre avis compte :
Nous serions ravis de connaître votre expérience. N'hésitez pas à nous contacter pour partager vos commentaires.

Restez connecté :
- Découvrez nos prochains cours et événements
- Rejoignez notre communauté
- Profitez d'offres exclusives pour nos membres fidèles

À très bientôt pour de nouvelles aventures !

{coach_name}
L'équipe BoostTribe

---
Propulsé par BoostTribe
"""
    
    try:
        resend.Emails.send({
            "from": "BoostTribe <onboarding@resend.dev>",
            "to": [customer_email],
            "subject": f"Merci d'avoir participé à {item_title} ! 🙏",
            "text": text_content
        })
        logger.info(f"Thank you email sent to {customer_email}")
    except Exception as e:
        logger.error(f"Error sending thank you email: {str(e)}")
        raise


async def send_reservation_confirmation_email(
    customer_name: str,
    customer_email: str,
    item_title: str,
    item_category: str,
    quantity: int,
    total_price: float,
    currency: str,
    event_date: Optional[str] = None,
    location: Optional[str] = None,
    reservation_id: str = ""
):
    """Send reservation confirmation email via Resend"""
    resend_api_key = os.environ.get('RESEND_API_KEY')
    
    if not resend_api_key:
        logger.warning("RESEND_API_KEY not configured, skipping email")
        return
    
    resend.api_key = resend_api_key
    
    # Format event date
    event_date_formatted = ""
    if event_date:
        try:
            dt = datetime.fromisoformat(event_date) if isinstance(event_date, str) else event_date
            event_date_formatted = dt.strftime("%d %B %Y à %H:%M")
        except:
            event_date_formatted = str(event_date)
    
    # Build email content
    category_label = {
        'course': 'Cours',
        'event': 'Événement',
        'product': 'Produit'
    }.get(item_category, 'Article')
    
    # Simple text email (avoiding HTML complexity issues)
    price_formatted = f"{total_price:.2f} {currency}"
    res_id_short = reservation_id[:8]
    
    text_content = f"""
Bonjour {customer_name},

Nous avons le plaisir de confirmer votre reservation pour: {item_title}

Details:
- Type: {category_label}
- Quantite: {quantity}
- Prix total: {price_formatted}
"""
    
    if event_date_formatted:
        text_content += f"- Date: {event_date_formatted}\n"
    if location:
        text_content += f"- Lieu: {location}\n"
    
    text_content += f"""
Numero de reservation: {res_id_short}

Si vous avez des questions ou souhaitez modifier votre reservation, contactez-nous.

Merci de votre confiance!
Lequipe Afroboost
"""
    
    try:
        resend.Emails.send({
            "from": "Afroboost <onboarding@resend.dev>",
            "to": [customer_email],
            "subject": f"Confirmation de reservation - {item_title}",
            "text": text_content
        })
        logger.info(f"Confirmation email sent to {customer_email}")
    except Exception as e:
        logger.error(f"Error sending confirmation email: {str(e)}")
        raise


# ========================
# ROUTES - CATALOG & RESERVATIONS
# ========================

@api_router.post("/catalog")
async def create_catalog_item(
    item_data: CatalogItemCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new catalog item (product/course/event)"""
    # Generate slug from title
    slug = generate_slug(item_data.title)
    
    item = CatalogItem(
        user_id=current_user["id"],
        slug=slug,
        **item_data.model_dump(exclude={'event_date'})
    )
    
    # Parse event date if provided
    if item_data.event_date:
        item.event_date = datetime.fromisoformat(item_data.event_date)
    
    item_dict = item.model_dump()
    item_dict["created_at"] = item_dict["created_at"].isoformat()
    item_dict["updated_at"] = item_dict["updated_at"].isoformat()
    if item_dict.get("event_date"):
        item_dict["event_date"] = item_dict["event_date"].isoformat()
    
    await db.catalog_items.insert_one(item_dict)
    
    return {"message": "Catalog item created", "id": item.id, "slug": slug}


@api_router.get("/catalog")
async def get_catalog_items(
    category: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Get catalog items for current user ONLY"""
    # CRITICAL: Each user sees only their own items
    query = {"user_id": current_user["id"]}
    
    if category:
        query["category"] = category
    
    items = await db.catalog_items.find(query, {"_id": 0}).to_list(length=None)
    
    # Parse dates
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
        if isinstance(item.get('updated_at'), str):
            item['updated_at'] = datetime.fromisoformat(item['updated_at'])
        if isinstance(item.get('event_date'), str) and item.get('event_date'):
            item['event_date'] = datetime.fromisoformat(item['event_date'])
    
    logger.info(f"User {current_user['email']} retrieved {len(items)} catalog items")
    return items

@api_router.get("/catalog/{item_id}")
async def get_catalog_item(item_id: str):
    """Get a single catalog item (public)"""
    item = await db.catalog_items.find_one({"id": item_id}, {"_id": 0})
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Parse dates
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    if isinstance(item.get('updated_at'), str):
        item['updated_at'] = datetime.fromisoformat(item['updated_at'])
    if isinstance(item.get('event_date'), str):
        item['event_date'] = datetime.fromisoformat(item['event_date'])
    
    return item

@api_router.put("/catalog/{item_id}")
async def update_catalog_item(
    item_id: str,
    update_data: CatalogItemUpdate,
    current_user: Dict = Depends(get_current_user)
):
    """Update a catalog item"""
    # Check ownership
    item = await db.catalog_items.find_one({"id": item_id, "user_id": current_user["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or unauthorized")
    
    # Update - include all fields that are not None (empty strings are included)
    update_dict = {k: v for k, v in update_data.model_dump(exclude_none=True).items()}
    # Explicitly handle image_url to allow empty strings (to clear the image)
    if hasattr(update_data, 'image_url') and update_data.image_url is not None:
        update_dict["image_url"] = update_data.image_url
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.catalog_items.update_one(
        {"id": item_id},
        {"$set": update_dict}
    )
    
    return {"message": "Item updated successfully"}

@api_router.delete("/catalog/{item_id}")
async def delete_catalog_item(
    item_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Delete a catalog item"""
    # Admin can delete any item, regular users can only delete their own items
    if current_user["role"] == "admin":
        result = await db.catalog_items.delete_one({"id": item_id})
    else:
        result = await db.catalog_items.delete_one({"id": item_id, "user_id": current_user["id"]})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found or unauthorized")
    
    logger.info(f"Catalog item deleted: {item_id} by user {current_user['email']}")
    return {"message": "Item deleted successfully"}



# ========================
# PUBLIC CATALOG ROUTES
# ========================

@api_router.get("/catalog-public/all")
async def get_public_catalog(
    category: Optional[str] = None,
    limit: int = 50
):
    """Get public catalog list (no auth required) - for sharing"""
    query = {"is_published": True, "is_active": True}
    if category:
        query["category"] = category
    
    items = await db.catalog_items.find(query, {"_id": 0}).limit(limit).to_list(length=limit)
    
    # Parse dates
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
        if isinstance(item.get('updated_at'), str):
            item['updated_at'] = datetime.fromisoformat(item['updated_at'])
        if isinstance(item.get('event_date'), str) and item.get('event_date'):
            item['event_date'] = datetime.fromisoformat(item['event_date'])
    
    logger.info(f"Public catalog query returned {len(items)} items")
    return items

@api_router.get("/catalog/public/{slug}")
async def get_public_catalog_item(slug: str):
    """Get single catalog item by slug (public, no auth) - for product pages"""
    item = await db.catalog_items.find_one({"slug": slug, "is_published": True}, {"_id": 0})
    
    if not item:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Parse dates
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    if isinstance(item.get('updated_at'), str):
        item['updated_at'] = datetime.fromisoformat(item['updated_at'])
    if isinstance(item.get('event_date'), str) and item.get('event_date'):
        item['event_date'] = datetime.fromisoformat(item['event_date'])
    
    return item


# ========================
# CHECKOUT ROUTES (SIMULATION MODE)
# ========================

class CheckoutCreate(BaseModel):
    product_id: str
    quantity: int = 1
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None

class CheckoutSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_title: str
    product_price: float
    currency: str
    quantity: int
    total_amount: float
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    payment_method: str = "simulation"  # stripe, twint, simulation
    status: str = "pending"  # pending, completed, cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

@api_router.post("/checkout/create")
async def create_checkout_session(checkout_data: CheckoutCreate):
    """Create checkout session (simulation mode for now)"""
    # Get product
    product = await db.catalog_items.find_one({"id": checkout_data.product_id}, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if not product.get("is_active") or not product.get("is_published"):
        raise HTTPException(status_code=400, detail="Product not available")
    
    # Check stock
    if product.get("stock_quantity") is not None:
        if product["stock_quantity"] < checkout_data.quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock")
    
    # Create checkout session
    total_amount = product["price"] * checkout_data.quantity
    
    session = CheckoutSession(
        product_id=checkout_data.product_id,
        product_title=product["title"],
        product_price=product["price"],
        currency=product.get("currency", "CHF"),
        quantity=checkout_data.quantity,
        total_amount=total_amount,
        customer_name=checkout_data.customer_name,
        customer_email=checkout_data.customer_email,
        customer_phone=checkout_data.customer_phone
    )
    
    session_dict = session.model_dump()
    session_dict["created_at"] = session_dict["created_at"].isoformat()
    
    await db.checkout_sessions.insert_one(session_dict)
    
    return {
        "session_id": session.id,
        "total_amount": total_amount,
        "currency": session.currency,
        "status": "simulation",
        "message": "Mode simulation - Paiement Stripe/Twint à configurer"
    }

@api_router.get("/checkout/{session_id}")
async def get_checkout_session(session_id: str):
    """Get checkout session details"""
    session = await db.checkout_sessions.find_one({"id": session_id}, {"_id": 0})
    
    if not session:
        raise HTTPException(status_code=404, detail="Checkout session not found")
    
    if isinstance(session.get('created_at'), str):
        session['created_at'] = datetime.fromisoformat(session['created_at'])
    
    return session


@api_router.post("/reservations")
async def create_reservation(reservation_data: ReservationCreate):
    """Create a new reservation (public endpoint)"""
    # Get catalog item
    item = await db.catalog_items.find_one({"id": reservation_data.catalog_item_id})
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if not item.get("is_active") or not item.get("is_published"):
        raise HTTPException(status_code=400, detail="Item is not available")
    
    # Check availability
    if item.get("max_attendees"):
        if item.get("current_attendees", 0) + reservation_data.quantity > item["max_attendees"]:
            raise HTTPException(status_code=400, detail="Not enough places available")
    
    if item.get("stock_quantity") is not None:
        if item.get("stock_quantity", 0) < reservation_data.quantity:
            raise HTTPException(status_code=400, detail="Not enough stock available")
    
    # Calculate total
    total_price = item["price"] * reservation_data.quantity
    
    # Create reservation
    reservation = Reservation(
        catalog_item_id=reservation_data.catalog_item_id,
        user_id=item["user_id"],
        customer_name=reservation_data.customer_name,
        customer_email=reservation_data.customer_email,
        customer_phone=reservation_data.customer_phone,
        quantity=reservation_data.quantity,
        total_price=total_price,
        currency=item.get("currency", "CHF"),
        payment_method=reservation_data.payment_method,
        notes=reservation_data.notes
    )
    
    res_dict = reservation.model_dump()
    res_dict["reservation_date"] = res_dict["reservation_date"].isoformat()
    res_dict["created_at"] = res_dict["created_at"].isoformat()
    res_dict["updated_at"] = res_dict["updated_at"].isoformat()
    
    await db.reservations.insert_one(res_dict)
    
    # Update item availability
    if item.get("max_attendees"):
        await db.catalog_items.update_one(
            {"id": reservation_data.catalog_item_id},
            {"$inc": {"current_attendees": reservation_data.quantity}}
        )
    
    if item.get("stock_quantity") is not None:
        await db.catalog_items.update_one(
            {"id": reservation_data.catalog_item_id},
            {"$inc": {"stock_quantity": -reservation_data.quantity}}
        )
    
    # Send confirmation email
    try:
        await send_reservation_confirmation_email(
            customer_name=reservation.customer_name,
            customer_email=reservation.customer_email,
            item_title=item["title"],
            item_category=item["category"],
            quantity=reservation.quantity,
            total_price=total_price,
            currency=reservation.currency,
            event_date=item.get("event_date"),
            location=item.get("location"),
            reservation_id=reservation.id
        )
    except Exception as e:
        logger.error(f"Failed to send confirmation email: {str(e)}")
        # Continue even if email fails
    
    # TODO: Create payment intent if payment_method is stripe
    
    return {
        "message": "Reservation created successfully",
        "reservation_id": reservation.id,
        "total_price": total_price,
        "currency": reservation.currency
    }

@api_router.get("/reservations")
async def get_reservations(current_user: Dict = Depends(get_current_user)):
    """Get all reservations for the coach"""
    reservations = await db.reservations.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(length=None)
    
    # Parse dates
    for res in reservations:
        if isinstance(res.get('reservation_date'), str):
            res['reservation_date'] = datetime.fromisoformat(res['reservation_date'])
        if isinstance(res.get('created_at'), str):
            res['created_at'] = datetime.fromisoformat(res['created_at'])
        if isinstance(res.get('updated_at'), str):
            res['updated_at'] = datetime.fromisoformat(res['updated_at'])
    
    return reservations

@api_router.patch("/reservations/{reservation_id}/status")
async def update_reservation_status(
    reservation_id: str,
    status: str,
    payment_status: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Update reservation status"""
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if payment_status:
        update_data["payment_status"] = payment_status
    
    result = await db.reservations.update_one(
        {"id": reservation_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # If status is "completed", send thank you email
    if status == "completed":
        try:
            reservation = await db.reservations.find_one({"id": reservation_id}, {"_id": 0})
            if reservation:
                item = await db.catalog_items.find_one({"id": reservation["catalog_item_id"]}, {"_id": 0})
                if item:
                    await send_thank_you_email(
                        customer_name=reservation["customer_name"],
                        customer_email=reservation["customer_email"],
                        item_title=item["title"],
                        coach_name=current_user.get("name", "Votre coach")
                    )
        except Exception as e:
            logger.error(f"Failed to send thank you email: {e}")
            # Don't fail the status update if email fails
    
    return {"message": "Reservation status updated"}


@api_router.post("/reservations/{reservation_id}/send-thank-you")
async def send_thank_you_manual(
    reservation_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Manually send thank you email for a reservation"""
    reservation = await db.reservations.find_one(
        {"id": reservation_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    item = await db.catalog_items.find_one({"id": reservation["catalog_item_id"]}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    try:
        await send_thank_you_email(
            customer_name=reservation["customer_name"],
            customer_email=reservation["customer_email"],
            item_title=item["title"],
            coach_name=current_user.get("name", "Votre coach")
        )
        return {"message": "Thank you email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


# ========================
# ROUTES - PRICING PLANS (ADMIN)
# ========================

@api_router.get("/pricing-plans", response_model=List[PricingPlan])
async def get_pricing_plans(active_only: bool = False):
    """Get all pricing plans"""
    query = {"active": True} if active_only else {}
    plans = await db.pricing_plans.find(query, {"_id": 0}).to_list(100)
    
    for plan in plans:
        if isinstance(plan.get('created_at'), str):
            plan['created_at'] = datetime.fromisoformat(plan['created_at'])
    
    # Sort by order
    plans.sort(key=lambda x: x.get('order', 0))
    return plans

@api_router.get("/pricing-plans/{plan_id}", response_model=PricingPlan)
async def get_pricing_plan(plan_id: str):
    """Get a specific pricing plan"""
    plan = await db.pricing_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Pricing plan not found")
    
    if isinstance(plan.get('created_at'), str):
        plan['created_at'] = datetime.fromisoformat(plan['created_at'])
    
    return plan

@api_router.post("/pricing-plans", response_model=PricingPlan)
async def create_pricing_plan(plan_data: PricingPlanCreate):
    """Create a new pricing plan"""
    plan = PricingPlan(**plan_data.model_dump())
    
    doc = plan.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.pricing_plans.insert_one(doc)
    return plan

@api_router.put("/pricing-plans/{plan_id}", response_model=PricingPlan)
async def update_pricing_plan(plan_id: str, plan_update: PricingPlanUpdate):
    """Update a pricing plan"""
    plan = await db.pricing_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Pricing plan not found")
    
    if isinstance(plan.get('created_at'), str):
        plan['created_at'] = datetime.fromisoformat(plan['created_at'])
    
    plan_obj = PricingPlan(**plan)
    update_data = plan_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(plan_obj, key, value)
    
    doc = plan_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.pricing_plans.update_one({"id": plan_id}, {"$set": doc})
    return plan_obj

@api_router.delete("/pricing-plans/{plan_id}")
async def delete_pricing_plan(plan_id: str):
    """Delete a pricing plan"""
    result = await db.pricing_plans.delete_one({"id": plan_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pricing plan not found")
    return {"message": "Pricing plan deleted successfully"}

@api_router.post("/pricing-plans/initialize")
async def initialize_default_plans():
    """Initialize default pricing plans (run once)"""
    # Check if plans already exist
    existing = await db.pricing_plans.count_documents({})
    if existing > 0:
        raise HTTPException(status_code=400, detail="Pricing plans already initialized")
    
    default_plans = [
        PricingPlan(
            name="Starter",
            name_en="Starter",
            name_de="Starter",
            price=0,
            currency="CHF",
            interval="month",
            features_fr=[
                "Jusqu'à 100 emails/mois",
                "1 utilisateur",
                "Templates simples",
                "Support par email"
            ],
            features_en=[
                "Up to 100 emails/month",
                "1 user",
                "Basic templates",
                "Email support"
            ],
            features_de=[
                "Bis zu 100 E-Mails/Monat",
                "1 Benutzer",
                "Einfache Vorlagen",
                "E-Mail-Support"
            ],
            limits={
                "emails_per_month": 100,
                "whatsapp_per_month": 0,
                "contacts_max": 500,
                "ai_enabled": False,
                "whatsapp_enabled": False,
                "multi_user": False
            },
            active=True,
            highlighted=False,
            order=1
        ),
        PricingPlan(
            name="Pro Coach",
            name_en="Pro Coach",
            name_de="Pro Coach",
            price=49,
            currency="CHF",
            interval="month",
            features_fr=[
                "Jusqu'à 5000 emails/mois",
                "IA Afroboost intégrée",
                "Relances automatiques",
                "Tableau de bord complet",
                "Support prioritaire"
            ],
            features_en=[
                "Up to 5000 emails/month",
                "Afroboost AI integrated",
                "Automatic follow-ups",
                "Complete dashboard",
                "Priority support"
            ],
            features_de=[
                "Bis zu 5000 E-Mails/Monat",
                "Afroboost KI integriert",
                "Automatische Nachverfolgung",
                "Vollständiges Dashboard",
                "Prioritätssupport"
            ],
            limits={
                "emails_per_month": 5000,
                "whatsapp_per_month": 1000,
                "contacts_max": 10000,
                "ai_enabled": True,
                "whatsapp_enabled": True,
                "multi_user": False
            },
            active=True,
            highlighted=True,
            order=2
        ),
        PricingPlan(
            name="Business",
            name_en="Business",
            name_de="Business",
            price=149,
            currency="CHF",
            interval="month",
            features_fr=[
                "Emails illimités",
                "Multi-utilisateurs",
                "IA avancée",
                "Intégration WhatsApp",
                "Branding personnalisé",
                "Support dédié 24/7"
            ],
            features_en=[
                "Unlimited emails",
                "Multi-user access",
                "Advanced AI",
                "WhatsApp integration",
                "Custom branding",
                "24/7 dedicated support"
            ],
            features_de=[
                "Unbegrenzte E-Mails",
                "Multi-Benutzer-Zugriff",
                "Erweiterte KI",
                "WhatsApp-Integration",
                "Individuelles Branding",
                "24/7 dedizierter Support"
            ],
            limits={
                "emails_per_month": -1,  # -1 = unlimited
                "whatsapp_per_month": -1,
                "contacts_max": -1,
                "ai_enabled": True,
                "whatsapp_enabled": True,
                "multi_user": True
            },
            active=True,
            highlighted=False,
            order=3
        )
    ]
    
    for plan in default_plans:
        doc = plan.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.pricing_plans.insert_one(doc)
    
    return {"message": "Default pricing plans initialized successfully", "count": len(default_plans)}


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


# ========================
# ROUTES - REMINDERS & AUTOMATION
# ========================

@api_router.get("/reminders", response_model=List[Reminder])
async def get_reminders(
    status: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Get all reminders for current user"""
    query = {"user_id": current_user["id"]}
    if status:
        query["status"] = status
    
    reminders = await db.reminders.find(query, {"_id": 0}).sort("scheduled_at", 1).to_list(length=None)
    
    # Parse dates
    for reminder in reminders:
        for field in ['scheduled_at', 'sent_at', 'created_at', 'updated_at']:
            if isinstance(reminder.get(field), str):
                reminder[field] = datetime.fromisoformat(reminder[field])
    
    return reminders

@api_router.post("/reminders", response_model=Reminder)
async def create_reminder(
    reminder_data: ReminderCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new reminder"""
    scheduled_at = datetime.fromisoformat(reminder_data.scheduled_at)
    
    reminder = Reminder(
        user_id=current_user["id"],
        **reminder_data.model_dump(exclude={'scheduled_at'}),
        scheduled_at=scheduled_at
    )
    
    reminder_dict = reminder.model_dump()
    reminder_dict["scheduled_at"] = reminder_dict["scheduled_at"].isoformat()
    if reminder_dict.get("sent_at"):
        reminder_dict["sent_at"] = reminder_dict["sent_at"].isoformat()
    reminder_dict["created_at"] = reminder_dict["created_at"].isoformat()
    reminder_dict["updated_at"] = reminder_dict["updated_at"].isoformat()
    
    await db.reminders.insert_one(reminder_dict)
    
    return reminder

@api_router.patch("/reminders/{reminder_id}/status")
async def update_reminder_status(
    reminder_id: str,
    status: str,
    current_user: Dict = Depends(get_current_user)
):
    """Update reminder status"""
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if status == "sent":
        update_data["sent_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.reminders.update_one(
        {"id": reminder_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    return {"message": "Reminder status updated"}

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(
    reminder_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Delete a reminder"""
    result = await db.reminders.delete_one({
        "id": reminder_id,
        "user_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    return {"message": "Reminder deleted"}

@api_router.get("/automation/rules", response_model=List[AutomationRule])
async def get_automation_rules(current_user: Dict = Depends(get_current_user)):
    """Get all automation rules"""
    rules = await db.automation_rules.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(length=None)
    
    # Parse dates
    for rule in rules:
        for field in ['last_executed', 'created_at', 'updated_at']:
            if isinstance(rule.get(field), str):
                rule[field] = datetime.fromisoformat(rule[field])
    
    return rules

@api_router.post("/automation/rules", response_model=AutomationRule)
async def create_automation_rule(
    rule_data: AutomationRuleCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new automation rule"""
    rule = AutomationRule(
        user_id=current_user["id"],
        **rule_data.model_dump()
    )
    
    rule_dict = rule.model_dump()
    if rule_dict.get("last_executed"):
        rule_dict["last_executed"] = rule_dict["last_executed"].isoformat()
    rule_dict["created_at"] = rule_dict["created_at"].isoformat()
    rule_dict["updated_at"] = rule_dict["updated_at"].isoformat()
    
    await db.automation_rules.insert_one(rule_dict)
    
    return rule

@api_router.patch("/automation/rules/{rule_id}")
async def update_automation_rule(
    rule_id: str,
    is_active: bool,
    current_user: Dict = Depends(get_current_user)
):
    """Activate/deactivate automation rule"""
    result = await db.automation_rules.update_one(
        {"id": rule_id, "user_id": current_user["id"]},
        {"$set": {
            "is_active": is_active,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    return {"message": "Rule updated"}

@api_router.delete("/automation/rules/{rule_id}")
async def delete_automation_rule(
    rule_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Delete automation rule"""
    result = await db.automation_rules.delete_one({
        "id": rule_id,
        "user_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    return {"message": "Rule deleted"}

@api_router.get("/reminders/templates", response_model=List[ReminderTemplate])
async def get_reminder_templates(current_user: Dict = Depends(get_current_user)):
    """Get reminder templates"""
    templates = await db.reminder_templates.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(length=None)
    
    # Parse dates
    for template in templates:
        if isinstance(template.get('created_at'), str):
            template['created_at'] = datetime.fromisoformat(template['created_at'])
    
    return templates

@api_router.post("/reminders/templates", response_model=ReminderTemplate)
async def create_reminder_template(
    template_data: ReminderTemplateCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create reminder template"""
    template = ReminderTemplate(
        user_id=current_user["id"],
        **template_data.model_dump()
    )
    
    template_dict = template.model_dump()
    template_dict["created_at"] = template_dict["created_at"].isoformat()
    
    await db.reminder_templates.insert_one(template_dict)
    
    return template

@api_router.post("/reminders/process")
async def process_due_reminders(current_user: Dict = Depends(get_current_user)):
    """Process all due reminders (for testing - in production would be a cron job)"""
    now = datetime.now(timezone.utc)
    
    due_reminders = await db.reminders.find({
        "user_id": current_user["id"],
        "status": "pending",
        "scheduled_at": {"$lte": now.isoformat()}
    }, {"_id": 0}).to_list(length=None)
    
    processed = 0
    failed = 0
    
    for reminder_dict in due_reminders:
        try:
            # Get target contacts
            contacts = []
            if reminder_dict.get("target_contacts"):
                contacts = await db.contacts.find({
                    "id": {"$in": reminder_dict["target_contacts"]}
                }, {"_id": 0}).to_list(length=None)
            
            # Send via selected channels
            for channel in reminder_dict.get("channels", ["email"]):
                if channel == "email":
                    # Send emails (simulation)
                    for contact in contacts:
                        logger.info(f"[SIMULATION] Sending email reminder to {contact['email']}")
                
                elif channel == "whatsapp":
                    # Send WhatsApp (simulation)
                    for contact in contacts:
                        logger.info(f"[SIMULATION] Sending WhatsApp reminder to {contact.get('phone', 'N/A')}")
            
            # Update reminder status
            await db.reminders.update_one(
                {"id": reminder_dict["id"]},
                {"$set": {
                    "status": "sent",
                    "sent_at": now.isoformat(),
                    "updated_at": now.isoformat()
                }}
            )
            
            processed += 1
            
        except Exception as e:
            logger.error(f"Error processing reminder {reminder_dict['id']}: {e}")
            await db.reminders.update_one(
                {"id": reminder_dict["id"]},
                {"$set": {
                    "status": "failed",
                    "updated_at": now.isoformat()
                }}
            )
            failed += 1
    
    return {
        "processed": processed,
        "failed": failed,
        "total_due": len(due_reminders)
    }


@api_router.post("/notifications/send-course-reminders")
async def send_course_reminders(current_user: Dict = Depends(require_admin)):
    """Send automated reminders for courses/events happening in 24-48 hours (Admin only)"""
    if not notifications_service:
        return {
            "success": False,
            "error": "Notifications service not configured (RESEND_API_KEY missing)"
        }
    
    result = await notifications_service.send_course_reminders()
    return result


@api_router.get("/notifications/stats")
async def get_notifications_stats(current_user: Dict = Depends(require_admin)):
    """Get notifications statistics (Admin only)"""
    try:
        total_sent = await db.notifications_sent.count_documents({})
        
        # Count by type
        course_reminders = await db.notifications_sent.count_documents({"type": "course_reminder"})
        
        # Get recent notifications
        recent = await db.notifications_sent.find({}, {"_id": 0}).sort("sent_at", -1).limit(10).to_list(length=10)
        
        return {
            "total_sent": total_sent,
            "by_type": {
                "course_reminders": course_reminders
            },
            "recent": recent
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




# ========================
# GIFT CARDS ROUTES
# ========================

@api_router.post("/gift-cards", response_model=GiftCard)
async def create_gift_card(
    gift_card: GiftCardCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new gift card"""
    try:
        # Create gift card document
        new_gift_card = GiftCard(
            **gift_card.dict(),
            sender_id=current_user["id"]
        )
        
        gift_card_dict = new_gift_card.dict()
        gift_card_dict['created_at'] = gift_card_dict['created_at'].isoformat()
        gift_card_dict['expires_at'] = gift_card_dict['expires_at'].isoformat()
        
        await db.gift_cards.insert_one(gift_card_dict)
        
        # TODO: Send gift card email to recipient
        logger.info(f"Gift card created: {new_gift_card.code} for {gift_card.recipient_email}")
        
        return new_gift_card
    except Exception as e:
        logger.error(f"Error creating gift card: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/gift-cards", response_model=List[GiftCard])
async def get_gift_cards(current_user: User = Depends(get_current_user)):
    """Get all gift cards created by current user"""
    try:
        gift_cards = await db.gift_cards.find(
            {"sender_id": current_user["id"]},
            {"_id": 0}
        ).to_list(length=None)
        return gift_cards
    except Exception as e:
        logger.error(f"Error fetching gift cards: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/gift-cards/{code}", response_model=GiftCard)
async def get_gift_card_by_code(code: str):
    """Get gift card details by code (public endpoint for validation)"""
    try:
        gift_card = await db.gift_cards.find_one({"code": code.upper()}, {"_id": 0})
        if not gift_card:
            raise HTTPException(status_code=404, detail="Gift card not found")
        
        # Check if expired
        expires_at = datetime.fromisoformat(gift_card['expires_at'])
        if expires_at < datetime.now(timezone.utc):
            gift_card['status'] = 'expired'
            await db.gift_cards.update_one(
                {"code": code.upper()},
                {"$set": {"status": "expired"}}
            )
        
        return gift_card
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching gift card: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.patch("/gift-cards/{code}/redeem", response_model=GiftCard)
async def redeem_gift_card(
    code: str,
    redemption: GiftCardRedeem
):
    """Redeem a gift card"""
    try:
        # Find gift card
        gift_card = await db.gift_cards.find_one({"code": code.upper()}, {"_id": 0})
        if not gift_card:
            raise HTTPException(status_code=404, detail="Gift card not found")
        
        # Validate status
        if gift_card['status'] != 'active':
            raise HTTPException(status_code=400, detail=f"Gift card is {gift_card['status']}")
        
        # Check expiration
        expires_at = datetime.fromisoformat(gift_card['expires_at'])
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Gift card has expired")
        
        # Handle partial or full redemption
        amount_to_use = redemption.amount_to_use or gift_card['amount']
        current_balance = gift_card.get('remaining_balance') or gift_card['amount']
        remaining = current_balance - amount_to_use
        
        if remaining < 0:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        # Update gift card
        update_data = {
            "used_at": datetime.now(timezone.utc).isoformat(),
            "used_by": redemption.redeemed_by_email,
            "remaining_balance": remaining,
            "status": "used" if remaining == 0 else "active"
        }
        
        await db.gift_cards.update_one(
            {"code": code.upper()},
            {"$set": update_data}
        )
        
        # Fetch and return updated gift card
        updated_gift_card = await db.gift_cards.find_one({"code": code.upper()}, {"_id": 0})
        logger.info(f"Gift card redeemed: {code} by {redemption.redeemed_by_email}")
        
        return updated_gift_card
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error redeeming gift card: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# DISCOUNTS ROUTES
# ========================

@api_router.post("/discounts", response_model=Discount)
async def create_discount(
    discount: DiscountCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new discount code"""
    try:
        # Check if code already exists
        existing = await db.discounts.find_one({"code": discount.code.upper()})
        if existing:
            raise HTTPException(status_code=400, detail="Discount code already exists")
        
        # Create discount
        discount_data = discount.dict()
        discount_data['code'] = discount.code.upper()
        discount_data['created_by'] = current_user["id"]
        
        new_discount = Discount(**discount_data)
        
        discount_dict = new_discount.dict()
        discount_dict['created_at'] = discount_dict['created_at'].isoformat()
        discount_dict['updated_at'] = discount_dict['updated_at'].isoformat()
        discount_dict['start_date'] = discount_dict['start_date'].isoformat()
        discount_dict['end_date'] = discount_dict['end_date'].isoformat()
        
        await db.discounts.insert_one(discount_dict)
        
        logger.info(f"Discount created: {new_discount.code}")
        return new_discount
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating discount: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/discounts", response_model=List[Discount])
async def get_discounts(current_user: User = Depends(get_current_user)):
    """Get all discounts"""
    try:
        discounts = await db.discounts.find({}, {"_id": 0}).to_list(length=None)
        return discounts
    except Exception as e:
        logger.error(f"Error fetching discounts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/discounts/{discount_id}", response_model=Discount)
async def get_discount(
    discount_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get discount by ID"""
    try:
        discount = await db.discounts.find_one({"id": discount_id}, {"_id": 0})
        if not discount:
            raise HTTPException(status_code=404, detail="Discount not found")
        return discount
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching discount: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.patch("/discounts/{discount_id}", response_model=Discount)
async def update_discount(
    discount_id: str,
    discount_update: DiscountUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a discount"""
    try:
        # Build update dict
        update_data = {k: v for k, v in discount_update.dict(exclude_unset=True).items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Convert datetime fields
        for field in ['start_date', 'end_date']:
            if field in update_data and isinstance(update_data[field], datetime):
                update_data[field] = update_data[field].isoformat()
        
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        result = await db.discounts.update_one(
            {"id": discount_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Discount not found")
        
        # Return updated discount
        updated_discount = await db.discounts.find_one({"id": discount_id}, {"_id": 0})
        return updated_discount
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating discount: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/discounts/{discount_id}")
async def delete_discount(
    discount_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a discount"""
    try:
        result = await db.discounts.delete_one({"id": discount_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Discount not found")
        return {"message": "Discount deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting discount: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/discounts/validate")
async def validate_discount(validation: DiscountValidation):
    """Validate a discount code for a purchase"""
    try:
        # Find discount by code
        discount = await db.discounts.find_one({"code": validation.code.upper()}, {"_id": 0})
        if not discount:
            raise HTTPException(status_code=404, detail="Invalid discount code")
        
        # Check if active
        if not discount['is_active']:
            raise HTTPException(status_code=400, detail="Discount is not active")
        
        # Check dates
        now = datetime.now(timezone.utc)
        start_date = datetime.fromisoformat(discount['start_date'])
        end_date = datetime.fromisoformat(discount['end_date'])
        
        if now < start_date:
            raise HTTPException(status_code=400, detail="Discount not yet valid")
        if now > end_date:
            raise HTTPException(status_code=400, detail="Discount has expired")
        
        # Check usage limit
        if discount.get('usage_limit') and discount['usage_count'] >= discount['usage_limit']:
            raise HTTPException(status_code=400, detail="Discount usage limit reached")
        
        # Check minimum purchase
        if discount.get('minimum_purchase') and validation.subtotal < discount['minimum_purchase']:
            raise HTTPException(
                status_code=400,
                detail=f"Minimum purchase of {discount['minimum_purchase']} {discount['currency']} required"
            )
        
        # Calculate discount amount
        if discount['discount_type'] == 'percentage':
            discount_amount = validation.subtotal * (discount['discount_value'] / 100)
        else:  # fixed_amount
            discount_amount = discount['discount_value']
        
        # Cap discount at subtotal
        discount_amount = min(discount_amount, validation.subtotal)
        
        return {
            "valid": True,
            "discount": discount,
            "discount_amount": discount_amount,
            "final_amount": validation.subtotal - discount_amount
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating discount: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# REFERRAL SYSTEM ROUTES
# ========================

@api_router.post("/referrals", response_model=Referral)
async def create_referral(
    referral: ReferralCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new referral invitation"""
    try:
        # Check if referral already exists for this email
        existing = await db.referrals.find_one({
            "referrer_id": current_user["id"],
            "referred_email": referral.referred_email
        })
        if existing:
            raise HTTPException(status_code=400, detail="Referral already exists for this email")
        
        # Get user's existing referral code or generate new one
        user_referrals = await db.referrals.find_one({"referrer_id": current_user["id"]})
        referral_code = user_referrals.get('referral_code') if user_referrals else str(uuid.uuid4())[:8].upper()
        
        # Create referral
        new_referral = Referral(
            **referral.dict(),
            referrer_id=current_user["id"],
            referrer_name=current_user["name"],
            referrer_email=current_user["email"],
            referral_code=referral_code
        )
        
        referral_dict = new_referral.dict()
        referral_dict['created_at'] = referral_dict['created_at'].isoformat()
        referral_dict['expires_at'] = referral_dict['expires_at'].isoformat()
        
        await db.referrals.insert_one(referral_dict)
        
        # TODO: Send referral invitation email
        logger.info(f"Referral created: {current_user['email']} -> {referral.referred_email}")
        
        return new_referral
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating referral: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/referrals/my-referrals", response_model=List[Referral])
async def get_my_referrals(current_user: User = Depends(get_current_user)):
    """Get current user's referrals"""
    try:
        referrals = await db.referrals.find(
            {"referrer_id": current_user["id"]},
            {"_id": 0}
        ).to_list(length=None)
        return referrals
    except Exception as e:
        logger.error(f"Error fetching referrals: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/referrals/stats", response_model=ReferralStats)
async def get_referral_stats(current_user: User = Depends(get_current_user)):
    """Get referral statistics for current user"""
    try:
        referrals = await db.referrals.find(
            {"referrer_id": current_user["id"]},
            {"_id": 0}
        ).to_list(length=None)
        
        # Get or generate referral code
        referral_code = ""
        if referrals:
            referral_code = referrals[0].get('referral_code', '')
        else:
            referral_code = str(uuid.uuid4())[:8].upper()
        
        total = len(referrals)
        pending = len([r for r in referrals if r['status'] == 'pending'])
        completed = len([r for r in referrals if r['status'] == 'completed'])
        
        # Calculate total rewards (only from completed referrals where reward was applied)
        total_rewards = sum(
            r.get('referrer_reward_value', 0) 
            for r in referrals 
            if r.get('status') == 'completed' and r.get('referrer_reward_applied')
        )
        
        return ReferralStats(
            total_referrals=total,
            pending_referrals=pending,
            completed_referrals=completed,
            total_rewards_earned=total_rewards,
            referral_code=referral_code
        )
    except Exception as e:
        logger.error(f"Error fetching referral stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.patch("/referrals/{referral_id}/complete")
async def complete_referral(
    referral_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark a referral as completed (admin only or automated)"""
    try:
        # Update referral status
        result = await db.referrals.update_one(
            {"id": referral_id},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "referrer_reward_applied": True,
                    "referred_reward_applied": True
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Referral not found")
        
        # TODO: Apply rewards (create discount codes or credits)
        
        updated_referral = await db.referrals.find_one({"id": referral_id}, {"_id": 0})
        return updated_referral
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing referral: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# AD CHAT ROUTES
# ========================

@api_router.post("/ad-chat/start", response_model=AdChat)
async def start_ad_chat(chat_start: AdChatStart):
    """Start a new chat conversation from an advertisement (public endpoint with AI)"""
    try:
        # Create initial message from visitor
        initial_message = AdChatMessage(
            sender="visitor",
            content=chat_start.initial_message
        )
        
        messages = [initial_message]
        
        # Generate AI response if service available
        if chat_ai:
            try:
                ai_result = await chat_ai.generate_response(
                    message=chat_start.initial_message,
                    visitor_email=chat_start.visitor_email,
                    chat_id=None
                )
                
                # Add AI response
                ai_message = AdChatMessage(
                    sender="agent",
                    content=ai_result["response"]
                )
                messages.append(ai_message)
                
                # Check if needs human escalation
                needs_escalation = ai_result.get("needs_human_escalation", False)
            except Exception as e:
                logger.error(f"AI response error: {e}")
                needs_escalation = False
        else:
            needs_escalation = False
        
        # Create chat session
        new_chat = AdChat(
            ad_id=chat_start.ad_id,
            ad_platform=chat_start.ad_platform,
            ad_campaign_name=chat_start.ad_campaign_name,
            visitor_name=chat_start.visitor_name,
            visitor_email=chat_start.visitor_email,
            visitor_phone=chat_start.visitor_phone,
            messages=messages,
            priority="high" if needs_escalation else "normal"
        )
        
        chat_dict = new_chat.dict()
        chat_dict['created_at'] = chat_dict['created_at'].isoformat()
        chat_dict['last_message_at'] = chat_dict['last_message_at'].isoformat()
        
        # Convert messages
        for msg in chat_dict['messages']:
            msg['timestamp'] = msg['timestamp'].isoformat()
        
        await db.ad_chats.insert_one(chat_dict)
        
        logger.info(f"Ad chat started with AI: {new_chat.id} from {chat_start.ad_platform}")
        return new_chat
    except Exception as e:
        logger.error(f"Error starting ad chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ad-chat/{chat_id}/message", response_model=AdChat)
async def send_ad_chat_message(
    chat_id: str,
    message: AdChatMessageCreate
):
    """Send a message in an ad chat (public/agent endpoint with AI auto-response)"""
    try:
        # Find chat
        chat = await db.ad_chats.find_one({"id": chat_id}, {"_id": 0})
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Create new message
        new_message = AdChatMessage(
            sender=message.sender,
            content=message.content
        )
        
        message_dict = new_message.dict()
        message_dict['timestamp'] = message_dict['timestamp'].isoformat()
        
        messages_to_add = [message_dict]
        
        # If visitor message and AI available, generate automatic response
        if message.sender == "visitor" and chat_ai and chat.get('status') != 'archived':
            try:
                ai_result = await chat_ai.generate_response(
                    message=message.content,
                    visitor_email=chat.get('visitor_email'),
                    chat_id=chat_id
                )
                
                # Add AI response
                ai_message = AdChatMessage(
                    sender="agent",
                    content=ai_result["response"]
                )
                ai_message_dict = ai_message.dict()
                ai_message_dict['timestamp'] = ai_message_dict['timestamp'].isoformat()
                messages_to_add.append(ai_message_dict)
                
                # Update priority if needs human
                if ai_result.get("needs_human_escalation"):
                    await db.ad_chats.update_one(
                        {"id": chat_id},
                        {"$set": {"priority": "urgent"}}
                    )
            except Exception as e:
                logger.error(f"AI auto-response error: {e}")
        
        # Update chat with all messages
        await db.ad_chats.update_one(
            {"id": chat_id},
            {
                "$push": {"messages": {"$each": messages_to_add}},
                "$set": {"last_message_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        # Return updated chat
        updated_chat = await db.ad_chats.find_one({"id": chat_id}, {"_id": 0})
        return updated_chat
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/ad-chat", response_model=List[AdChat])
async def get_ad_chats(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all ad chats (admin/agent only)"""
    try:
        query = {}
        if status:
            query['status'] = status
        
        chats = await db.ad_chats.find(query, {"_id": 0}).sort("last_message_at", -1).to_list(length=100)
        return chats
    except Exception as e:
        logger.error(f"Error fetching ad chats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/ad-chat/{chat_id}", response_model=AdChat)
async def get_ad_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get specific ad chat by ID"""
    try:
        chat = await db.ad_chats.find_one({"id": chat_id}, {"_id": 0})
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        return chat
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching ad chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.patch("/ad-chat/{chat_id}", response_model=AdChat)
async def update_ad_chat(
    chat_id: str,
    chat_update: AdChatUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update ad chat details (admin/agent only)"""
    try:
        update_data = {k: v for k, v in chat_update.dict(exclude_unset=True).items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        result = await db.ad_chats.update_one(
            {"id": chat_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        updated_chat = await db.ad_chats.find_one({"id": chat_id}, {"_id": 0})
        return updated_chat
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating ad chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ad-chat/{chat_id}/convert")
async def convert_ad_chat_to_contact(
    chat_id: str,
    current_user: User = Depends(get_current_user)
):
    """Convert ad chat visitor to contact"""
    try:
        # Find chat
        chat = await db.ad_chats.find_one({"id": chat_id}, {"_id": 0})
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        if not chat.get('visitor_email'):
            raise HTTPException(status_code=400, detail="Visitor email required for conversion")
        
        # Check if contact already exists
        existing_contact = await db.contacts.find_one({"email": chat['visitor_email']})
        if existing_contact:
            contact_id = existing_contact['id']
        else:
            # Create new contact
            new_contact = Contact(
                name=chat.get('visitor_name', 'Ad Lead'),
                email=chat['visitor_email'],
                phone=chat.get('visitor_phone'),
                tags=["ad-lead", chat['ad_platform']],
                notes=f"Converted from ad chat on {chat['ad_platform']}"
            )
            
            contact_dict = new_contact.dict()
            contact_dict['created_at'] = contact_dict['created_at'].isoformat()
            
            await db.contacts.insert_one(contact_dict)
            contact_id = new_contact.id
        
        # Update chat
        await db.ad_chats.update_one(
            {"id": chat_id},
            {
                "$set": {
                    "converted_to_contact": True,
                    "converted_contact_id": contact_id,
                    "status": "converted"
                }
            }
        )
        
        return {
            "message": "Chat converted to contact successfully",
            "contact_id": contact_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error converting chat to contact: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



# ========================
# PUBLIC COACH CHAT ROUTES
# ========================

@api_router.post("/coach-chat/config", response_model=CoachChatConfig)
async def create_coach_chat_config(
    config_data: CoachChatConfigCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create or update coach chat configuration"""
    try:
        # Check if config already exists for this user
        existing = await db.coach_chat_configs.find_one({"user_id": current_user["id"]})
        
        if existing:
            # Update existing
            await db.coach_chat_configs.update_one(
                {"user_id": current_user["id"]},
                {
                    "$set": {
                        **config_data.dict(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            config = await db.coach_chat_configs.find_one({"user_id": current_user["id"]}, {"_id": 0})
        else:
            # Create new
            new_config = CoachChatConfig(
                user_id=current_user["id"],
                **config_data.dict()
            )
            
            config_dict = new_config.dict()
            config_dict['created_at'] = config_dict['created_at'].isoformat()
            config_dict['updated_at'] = config_dict['updated_at'].isoformat()
            
            await db.coach_chat_configs.insert_one(config_dict)
            config = config_dict
        
        return config
    except Exception as e:
        logger.error(f"Error creating coach chat config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/coach-chat/config", response_model=CoachChatConfig)
async def get_coach_chat_config(current_user: Dict = Depends(get_current_user)):
    """Get current user's coach chat configuration"""
    try:
        config = await db.coach_chat_configs.find_one({"user_id": current_user["id"]}, {"_id": 0})
        
        if not config:
            # Create default config
            default_config = CoachChatConfig(
                user_id=current_user["id"],
                chat_slug=current_user["id"][:8],  # Use first 8 chars of user ID
                display_name=current_user["name"]
            )
            
            config_dict = default_config.dict()
            config_dict['created_at'] = config_dict['created_at'].isoformat()
            config_dict['updated_at'] = config_dict['updated_at'].isoformat()
            
            await db.coach_chat_configs.insert_one(config_dict)
            config = config_dict
        
        return config
    except Exception as e:
        logger.error(f"Error fetching coach chat config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/coach-chat/public/{chat_slug}")
async def get_public_coach_chat_config(chat_slug: str):
    """Get coach chat config by slug (public, no auth)"""
    try:
        config = await db.coach_chat_configs.find_one(
            {"chat_slug": chat_slug, "is_active": True},
            {"_id": 0}
        )
        
        if not config:
            raise HTTPException(status_code=404, detail="Coach chat not found")
        
        return config
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching public coach chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# STRIPE PAYMENT ROUTES
# ========================

# Initialize Stripe Checkout
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

@api_router.post("/reservations/checkout")
async def create_reservation_checkout(
    catalog_item_id: str,
    quantity: int,
    customer_name: str,
    customer_email: EmailStr,
    customer_phone: Optional[str] = None,
    origin_url: str = None,
    notes: Optional[str] = None,
    request: Request = None
):
    """Create Stripe checkout session for reservation"""
    # Get catalog item
    item = await db.catalog_items.find_one({"id": catalog_item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if not item.get("is_active") or not item.get("is_published"):
        raise HTTPException(status_code=400, detail="Item is not available")
    
    # Check availability
    if item.get("max_attendees"):
        if item.get("current_attendees", 0) + quantity > item["max_attendees"]:
            raise HTTPException(status_code=400, detail="Not enough places available")
    
    # Get owner's Stripe keys (user who created the product)
    owner_payment_config = await db.payment_settings.find_one(
        {"user_id": item["user_id"]},
        {"_id": 0}
    )
    
    if not owner_payment_config or not owner_payment_config.get("stripe_secret_key"):
        raise HTTPException(
            status_code=400, 
            detail="Le propriétaire de cet article n'a pas configuré ses clés de paiement Stripe"
        )
    
    stripe_key = owner_payment_config["stripe_secret_key"]
    
    # Calculate amount (BACKEND DEFINED - SECURITY)
    amount = float(item["price"] * quantity)
    currency = item.get("currency", "CHF").lower()
    
    # Get origin URL from request if not provided
    if not origin_url:
        origin_url = str(request.base_url).rstrip('/')
    
    # Initialize Stripe DIRECTLY with OWNER's key
    stripe.api_key = stripe_key
    
    # Create URLs
    success_url = f"{origin_url}/reservation-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/catalog"
    
    # Metadata for tracking
    metadata = {
        "entity_type": "reservation",
        "catalog_item_id": catalog_item_id,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "customer_phone": customer_phone or "",
        "quantity": str(quantity),
        "user_id": item["user_id"],
        "notes": notes or ""
    }
    
    # Create checkout session with Stripe SDK directly
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': currency,
                    'unit_amount': int(amount * 100),  # Stripe expects cents
                    'product_data': {
                        'name': item['title'],
                        'description': item.get('description', '')[:500]
                    }
                },
                'quantity': quantity
            }],
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
            customer_email=customer_email
        )
    except Exception as stripe_error:
        logger.error(f"Stripe error: {str(stripe_error)}")
        raise HTTPException(status_code=500, detail=f"Erreur Stripe: {str(stripe_error)}")
    
    # MANDATORY: Create payment transaction record
    payment_transaction = PaymentTransaction(
        session_id=session.id,
        user_id=item["user_id"],
        customer_email=customer_email,
        amount=amount,
        currency=currency.upper(),
        payment_status="pending",
        status="initiated",
        entity_type="reservation",
        entity_id=catalog_item_id,
        metadata=metadata
    )
    
    trans_dict = payment_transaction.model_dump()
    trans_dict["created_at"] = trans_dict["created_at"].isoformat()
    trans_dict["updated_at"] = trans_dict["updated_at"].isoformat()
    
    await db.payment_transactions.insert_one(trans_dict)
    
    logger.info(f"Checkout session created: {session.id} for item {catalog_item_id}")
    
    return {
        "url": session.url,
        "session_id": session.id
    }


@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str):
    """Check payment status and create reservation if paid"""
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    # Get transaction from DB
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # If already processed, return cached status
    if transaction["status"] == "completed" and transaction["payment_status"] == "paid":
        return {
            "status": "completed",
            "payment_status": "paid",
            "amount_total": int(transaction["amount"] * 100),
            "currency": transaction["currency"],
            "metadata": transaction["metadata"]
        }
    
    # Check with Stripe
    if not EMERGENT_AVAILABLE:
        raise HTTPException(status_code=500, detail="Stripe checkout service not available. Please install emergentintegrations.")
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    
    try:
        checkout_status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction in DB
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "payment_status": checkout_status.payment_status,
                    "status": "completed" if checkout_status.payment_status == "paid" else checkout_status.status,
                    "payment_id": checkout_status.metadata.get("payment_intent_id", ""),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # If paid and not yet processed, create reservation
        if checkout_status.payment_status == "paid":
            # Check if reservation already created (prevent duplicates)
            existing_reservation = await db.reservations.find_one({
                "payment_intent_id": session_id
            }, {"_id": 0})
            
            if not existing_reservation:
                # Create reservation from metadata
                metadata = checkout_status.metadata
                item = await db.catalog_items.find_one({"id": metadata["catalog_item_id"]}, {"_id": 0})
                
                if item:
                    reservation = Reservation(
                        catalog_item_id=metadata["catalog_item_id"],
                        user_id=metadata["user_id"],
                        customer_name=metadata["customer_name"],
                        customer_email=metadata["customer_email"],
                        customer_phone=metadata.get("customer_phone"),
                        quantity=int(metadata["quantity"]),
                        total_price=checkout_status.amount_total / 100,
                        currency=checkout_status.currency.upper(),
                        payment_method="stripe",
                        payment_status="completed",
                        payment_intent_id=session_id,
                        status="confirmed",
                        notes=metadata.get("notes")
                    )
                    
                    res_dict = reservation.model_dump()
                    res_dict["reservation_date"] = res_dict["reservation_date"].isoformat()
                    res_dict["created_at"] = res_dict["created_at"].isoformat()
                    res_dict["updated_at"] = res_dict["updated_at"].isoformat()
                    
                    await db.reservations.insert_one(res_dict)
                    
                    # Update availability
                    if item.get("max_attendees"):
                        await db.catalog_items.update_one(
                            {"id": metadata["catalog_item_id"]},
                            {"$inc": {"current_attendees": int(metadata["quantity"])}}
                        )
                    
                    if item.get("stock_quantity") is not None:
                        await db.catalog_items.update_one(
                            {"id": metadata["catalog_item_id"]},
                            {"$inc": {"stock_quantity": -int(metadata["quantity"])}}
                        )
                    
                    # Send confirmation email
                    try:
                        await send_reservation_confirmation_email(
                            customer_name=reservation.customer_name,
                            customer_email=reservation.customer_email,
                            item_title=item["title"],
                            item_category=item["category"],
                            quantity=reservation.quantity,
                            total_price=reservation.total_price,
                            currency=reservation.currency,
                            event_date=item.get("event_date"),
                            location=item.get("location"),
                            reservation_id=reservation.id
                        )
                    except Exception as e:
                        logger.error(f"Failed to send confirmation email: {e}")
                    
                    logger.info(f"Reservation created from payment: {reservation.id}")
        
        return {
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "amount_total": checkout_status.amount_total,
            "currency": checkout_status.currency,
            "metadata": checkout_status.metadata
        }
    
    except Exception as e:
        logger.error(f"Error checking payment status: {e}")
        raise HTTPException(status_code=500, detail=f"Error checking payment: {str(e)}")


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    if not STRIPE_API_KEY:
        return JSONResponse({"status": "error", "message": "Stripe not configured"}, status_code=500)
    
    try:
        body = await request.body()
        stripe_signature = request.headers.get("Stripe-Signature")
        
        if not EMERGENT_AVAILABLE:
            return JSONResponse({"status": "error", "message": "Stripe checkout service not available. Please install emergentintegrations."}, status_code=500)
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        webhook_response = await stripe_checkout.handle_webhook(body, stripe_signature)
        
        logger.info(f"Stripe webhook received: {webhook_response.event_type}")
        
        # Update transaction based on webhook
        if webhook_response.session_id:
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {
                    "$set": {
                        "payment_status": webhook_response.payment_status,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
        
        return JSONResponse({"status": "success"})
    
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return JSONResponse({"status": "error", "message": str(e)}, status_code=400)


# ========================
# HEADSET RESERVATION ROUTES
# ========================

@api_router.post("/headset-reservations", response_model=HeadsetReservation)
async def create_headset_reservation(
    reservation_data: HeadsetReservationCreate
):
    """Create headset reservation (public endpoint)"""
    try:
        # Get catalog item (course/event)
        item = await db.catalog_items.find_one({"id": reservation_data.catalog_item_id}, {"_id": 0})
        
        if not item:
            raise HTTPException(status_code=404, detail="Course not found")
        
        if not item.get('event_date'):
            raise HTTPException(status_code=400, detail="This item is not a scheduled event")
        
        # Check if already reserved
        existing = await db.headset_reservations.find_one({
            "catalog_item_id": reservation_data.catalog_item_id,
            "customer_email": reservation_data.customer_email,
            "status": {"$ne": "cancelled"}
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="You already have a reservation for this course")
        
        # Create reservation
        new_reservation = HeadsetReservation(
            catalog_item_id=reservation_data.catalog_item_id,
            catalog_item_title=item['title'],
            event_date=datetime.fromisoformat(item['event_date']) if isinstance(item['event_date'], str) else item['event_date'],
            coach_id=item['user_id'],
            coach_name=item.get('coach_name', 'Coach'),
            customer_name=reservation_data.customer_name,
            customer_email=reservation_data.customer_email,
            customer_phone=reservation_data.customer_phone,
            chat_id=reservation_data.chat_id
        )
        
        reservation_dict = new_reservation.dict()
        reservation_dict['created_at'] = reservation_dict['created_at'].isoformat()
        reservation_dict['updated_at'] = reservation_dict['updated_at'].isoformat()
        reservation_dict['event_date'] = reservation_dict['event_date'].isoformat()
        
        await db.headset_reservations.insert_one(reservation_dict)
        
        # Create attendance record
        attendance = AttendanceRecord(
            reservation_id=new_reservation.id,
            catalog_item_id=reservation_data.catalog_item_id,
            coach_id=item['user_id'],
            status="pending"
        )
        
        attendance_dict = attendance.dict()
        attendance_dict['created_at'] = attendance_dict['created_at'].isoformat()
        
        await db.attendance_records.insert_one(attendance_dict)
        
        logger.info(f"Headset reservation created: {new_reservation.id}")
        
        return new_reservation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating headset reservation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/headset-reservations")
async def get_headset_reservations(
    catalog_item_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Get headset reservations for coach"""
    try:
        query = {"coach_id": current_user["id"]}
        
        if catalog_item_id:
            query["catalog_item_id"] = catalog_item_id
        
        reservations = await db.headset_reservations.find(query, {"_id": 0}).to_list(length=1000)
        
        return reservations
    except Exception as e:
        logger.error(f"Error fetching reservations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.patch("/headset-reservations/{reservation_id}")
async def update_headset_reservation(
    reservation_id: str,
    status: str,
    current_user: Dict = Depends(get_current_user)
):
    """Update headset reservation status"""
    try:
        result = await db.headset_reservations.update_one(
            {"id": reservation_id, "coach_id": current_user["id"]},
            {
                "$set": {
                    "status": status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Reservation not found")
        
        # Update attendance if present
        if status == "present":
            await db.attendance_records.update_one(
                {"reservation_id": reservation_id},
                {
                    "$set": {
                        "status": "present",
                        "checked_in_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
        
        return {"message": "Reservation updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating reservation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# ATTENDANCE ROUTES
# ========================

@api_router.get("/attendance")
async def get_attendance_records(
    catalog_item_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get attendance records for a course"""
    try:
        # Get reservations with attendance
        reservations = await db.headset_reservations.find(
            {
                "catalog_item_id": catalog_item_id,
                "coach_id": current_user["id"]
            },
            {"_id": 0}
        ).to_list(length=1000)
        
        # Get attendance records
        attendance_records = await db.attendance_records.find(
            {
                "catalog_item_id": catalog_item_id,
                "coach_id": current_user["id"]
            },
            {"_id": 0}
        ).to_list(length=1000)
        
        # Merge data
        result = []
        for reservation in reservations:
            attendance = next(
                (a for a in attendance_records if a['reservation_id'] == reservation['id']),
                None
            )
            result.append({
                "reservation": reservation,
                "attendance": attendance
            })
        
        return result
    except Exception as e:
        logger.error(f"Error fetching attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.patch("/attendance/{reservation_id}")
async def update_attendance(
    reservation_id: str,
    attendance_update: AttendanceUpdate,
    current_user: Dict = Depends(get_current_user)
):
    """Update attendance status"""
    try:
        update_data = {
            "status": attendance_update.status,
            **({} if not attendance_update.notes else {"notes": attendance_update.notes})
        }
        
        if attendance_update.status == "present":
            update_data["checked_in_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.attendance_records.update_one(
            {
                "reservation_id": reservation_id,
                "coach_id": current_user["id"]
            },
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        
        # Also update reservation
        await db.headset_reservations.update_one(
            {"id": reservation_id},
            {"$set": {"status": attendance_update.status}}
        )
        
        return {"message": "Attendance updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))




app.include_router(api_router)

# Product page HTML endpoint for WhatsApp/Facebook crawlers (outside /api prefix)
@app.get("/p/{slug}", response_class=HTMLResponse)
async def get_product_page_html(slug: str, request: Request):
    """
    Server-side HTML endpoint for product pages with OG meta tags.
    This ensures WhatsApp/Facebook crawlers see product-specific meta tags (no platform branding).
    """
    item = await db.catalog_items.find_one({"slug": slug, "is_published": True}, {"_id": 0})
    
    if not item:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get product details
    product_title = item.get('title', 'Product')
    product_description = item.get('description', '')
    product_image = item.get('image_url', '')
    product_price = item.get('price', 0)
    product_currency = item.get('currency', 'CHF')
    
    # Build product URL
    base_url = str(request.base_url).rstrip('/')
    product_url = f"{base_url}/p/{slug}"
    
    # Check if image_url is a YouTube URL and extract thumbnail
    youtube_match = None
    if product_image:
        youtube_match = re.search(r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)', product_image)
    
    if youtube_match:
        # Extract YouTube video ID and use YouTube thumbnail
        video_id = youtube_match.group(1)
        product_image = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
    elif not product_image:
        # If no image, use a default or empty
        product_image = f"{base_url}/logo512.png"
    
    # Build description with price if available
    if product_price:
        full_description = f"{product_description} - {product_price} {product_currency}"
    else:
        full_description = product_description or product_title
    
    # Escape HTML special characters
    def escape_html(text):
        if not text:
            return ""
        return (str(text)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace('"', "&quot;")
                .replace("'", "&#x27;"))
    
    # Create HTML with proper OG meta tags (no platform branding)
    html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{escape_html(product_title)}</title>
    <meta name="description" content="{escape_html(full_description)}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="product">
    <meta property="og:title" content="{escape_html(product_title)}">
    <meta property="og:description" content="{escape_html(full_description)}">
    <meta property="og:image" content="{escape_html(product_image)}">
    <meta property="og:url" content="{escape_html(product_url)}">
    <meta property="og:site_name" content="">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{escape_html(product_title)}">
    <meta name="twitter:description" content="{escape_html(full_description)}">
    <meta name="twitter:image" content="{escape_html(product_image)}">
    
    <!-- Redirect to React app -->
    <script>
        window.location.href = '/p/{slug}';
    </script>
    <noscript>
        <meta http-equiv="refresh" content="0; url=/p/{slug}">
    </noscript>
</head>
<body>
    <p>Redirecting to product page... <a href="/p/{slug}">Click here</a></p>
</body>
</html>"""
    
    return HTMLResponse(content=html_content)

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
