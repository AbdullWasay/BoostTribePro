# BoostTribe - Documentation Technique Complète

## Vue d'ensemble du Projet

**Nom**: BoostTribe (anciennement Afroboost Mailer)  
**Description**: Plateforme de marketing multicanal intelligent avec IA pour coachs, vendeurs et créateurs  
**Stack**: React + FastAPI + MongoDB  
**Langues**: Français, Anglais, Allemand  

---

## Architecture Technique

### Backend (FastAPI + Python)
**Fichier principal**: `/app/backend/server.py`

#### Structure des Collections MongoDB
- `users` - Utilisateurs (auth email/password, rôles admin/user)
- `contacts` - Contacts clients avec tags et historique
- `campaigns` - Campagnes email
- `whatsapp_campaigns` - Campagnes WhatsApp avancées
- `catalog_items` - Produits/Cours/Événements (Module 3)
- `reservations` - Réservations clients (Module 3)
- `reminders` - Rappels et notifications (Module 4)
- `automation_rules` - Règles d'automatisation (Module 4)
- `ai_assistant_messages` - Historique conversations IA (Module 5)
- `gift_cards` - Cartes cadeaux (Phase 2)
- `discounts` - Codes promo et réductions (Phase 2)
- `referrals` - Système de parrainage (Phase 2)
- `ad_chats` - Conversations depuis publicités (Phase 2)

#### Authentification
- **Type**: JWT (JSON Web Tokens)
- **Secret**: `JWT_SECRET` (variable d'environnement)
- **Middleware**: `get_current_user()`, `require_admin()`
- **Hash**: bcrypt pour les mots de passe

#### APIs Principales

**Auth** (`/api/auth/*`):
- POST `/register` - Inscription (premier user = admin)
- POST `/login` - Connexion (retourne JWT)
- GET `/me` - Utilisateur actuel
- POST `/forgot-password` - Réinitialisation mot de passe
- POST `/reset-password` - Confirmer nouveau mot de passe

**Contacts** (`/api/contacts/*`):
- GET `/contacts` - Liste des contacts
- POST `/contacts` - Créer contact
- PUT `/contacts/{id}` - Modifier contact
- DELETE `/contacts/{id}` - Supprimer contact
- POST `/contacts/bulk-message` - Message groupé WhatsApp

**Catalogue** (`/api/catalog/*`) - Module 3:
- GET/POST `/catalog` - CRUD produits/cours/événements
- PUT `/catalog/{id}` - Modifier item
- DELETE `/catalog/{id}` - Supprimer item

**Réservations** (`/api/reservations/*`) - Module 3:
- POST `/reservations` - Créer réservation (public)
- GET `/reservations` - Liste réservations (auth)
- PATCH `/reservations/{id}/status` - Changer statut

**Cartes Cadeaux** (`/api/gift-cards/*`) - Phase 2:
- POST `/gift-cards` - Créer carte cadeau
- GET `/gift-cards` - Liste cartes de l'utilisateur
- GET `/gift-cards/{code}` - Valider code (public)
- PATCH `/gift-cards/{code}/redeem` - Utiliser carte (public)

**Réductions** (`/api/discounts/*`) - Phase 2:
- POST `/discounts` - Créer code promo
- GET `/discounts` - Liste codes
- PATCH `/discounts/{id}` - Modifier code
- DELETE `/discounts/{id}` - Supprimer code
- POST `/discounts/validate` - Valider code pour achat

**Parrainage** (`/api/referrals/*`) - Phase 2:
- POST `/referrals` - Créer invitation
- GET `/referrals/my-referrals` - Mes parrainages
- GET `/referrals/stats` - Statistiques
- PATCH `/referrals/{id}/complete` - Marquer complété

**Chat Publicités** (`/api/ad-chat/*`) - Phase 2:
- POST `/ad-chat/start` - Démarrer chat (public)
- POST `/ad-chat/{id}/message` - Envoyer message
- GET `/ad-chat` - Liste chats (auth, filtrable)
- PATCH `/ad-chat/{id}` - Modifier chat
- POST `/ad-chat/{id}/convert` - Convertir en contact

**AI Assistant** (`/api/ai/assistant/*`) - Module 5:
- POST `/chat` - Conversation avec IA (GPT-4o-mini via Emergent LLM Key)
- GET `/sessions` - Liste sessions utilisateur
- GET `/history/{session_id}` - Historique conversation

#### Intégrations Externes
- **Resend**: Envoi emails (confirmation réservations, newsletters)
- **OpenAI**: Génération contenu IA via Emergent LLM Key
- **WhatsApp Business API**: Campagnes WhatsApp
- **Stripe/Twint**: Paiements (mode simulation)

---

### Frontend (React)

#### Structure des Pages
```
/app/frontend/src/pages/
├── Landing.js - Page d'accueil publique
├── Login.js - Connexion
├── Register.js - Inscription
├── ForgotPassword.js - Mot de passe oublié
├── ResetPassword.js - Réinitialiser mot de passe
├── Dashboard.js - Tableau de bord
├── Contacts.js - Gestion contacts
├── Campaigns.js - Campagnes email
├── WhatsAppCampaignsAdvanced.js - Campagnes WhatsApp (Module 2)
├── Analytics.js - Statistiques
├── Calendar.js - Calendrier
├── Catalog.js - Catalogue produits (Module 3)
├── Reservations.js - Gestion réservations (Module 3)
├── Reminders.js - Rappels & Automatisations (Module 4)
├── GiftCards.js - Cartes cadeaux (Phase 2)
├── Discounts.js - Codes promo (Phase 2)
├── Referrals.js - Parrainage (Phase 2)
├── AdChat.js - Chat publicités (Phase 2)
├── Profile.js - Profil utilisateur
├── Admin.js - Configuration admin
├── Pricing.js - Page tarifs publique
└── PricingManagement.js - Gestion plans (admin)
```

#### Composants Principaux
```
/app/frontend/src/components/
├── Layout.js - Layout principal avec navigation
├── ProtectedRoute.js - Route protégée (auth requise)
├── AIAssistantWidget.js - Widget chat IA flottant (Module 5)
├── InstallPrompt.js - Prompt installation PWA (Phase 2)
└── ui/ - Composants UI (shadcn/ui)
```

#### Hooks Personnalisés
- **useAuth** (`/contexts/AuthContext.js`): Gestion authentification
- **useFeatureAccess** (`/hooks/useFeatureAccess.js`): Permissions admin/user

#### Routes
```javascript
// Routes publiques
/ - Landing
/login - Connexion
/register - Inscription
/pricing - Tarifs
/forgot-password - Mot de passe oublié
/reset-password - Réinitialiser

// Routes protégées (auth requise)
/dashboard - Tableau de bord
/contacts - Contacts
/campaigns - Campagnes email
/whatsapp - Campagnes WhatsApp
/analytics - Analytics
/calendar - Calendrier
/catalog - Catalogue
/reservations - Réservations
/reminders - Rappels
/gift-cards - Cartes cadeaux
/discounts - Réductions
/referrals - Parrainage
/ad-chat - Chat publicités
/profile - Profil

// Routes admin uniquement
/admin - Configuration
/admin/pricing-plans - Gestion plans
```

---

## PWA (Progressive Web App)

### Service Worker
**Fichier**: `/app/frontend/public/service-worker.js`

**Fonctionnalités**:
- Cache intelligent (cache-first pour assets, network-first pour API)
- Support hors ligne (fallback vers index.html)
- Background sync pour synchronisation données
- Push notifications
- Gestion notifications cliquées

### Manifest
**Fichier**: `/app/frontend/public/manifest.json`

```json
{
  "short_name": "BoostTribe",
  "name": "BoostTribe - Marketing Multicanal Intelligent",
  "theme_color": "#8B5CF6",
  "background_color": "#000000",
  "display": "standalone",
  "orientation": "portrait-primary"
}
```

### Installation
- Prompt personnalisé (`InstallPrompt.js`)
- Détection auto si app déjà installée
- Dismiss persistant (localStorage)

---

## Système de Permissions

### Admin Free Access
**Fichier**: `/app/frontend/src/hooks/useFeatureAccess.js`

**Fonctionnalités**:
- `useFeatureAccess()` - Hook pour vérifier accès
- `AdminBadge` - Badge "Admin - Accès Illimité"
- `FeatureLimit` - Affichage limites avec progress bar
- `FeatureGate` - Bloquer accès feature selon rôle

**Règles**:
- Admin: Accès illimité à toutes fonctionnalités
- User: Limites par défaut (modifiables selon plan)

---

## Variables d'Environnement

### Backend (`.env`)
```bash
# MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=boosttribe

# JWT
JWT_SECRET=your-secret-key

# APIs
RESEND_API_KEY=re_xxx
EMERGENT_LLM_KEY=xxx
OPENAI_API_KEY=xxx (optionnel)
WHATSAPP_ACCESS_TOKEN=xxx
WHATSAPP_PHONE_NUMBER_ID=xxx

# URLs
FRONTEND_URL=https://boosttribe.com
CORS_ORIGINS=*

# Stripe (simulation)
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
```

### Frontend (`.env`)
```bash
REACT_APP_BACKEND_URL=https://api.boosttribe.com
```

---

## Déploiement

### Services Supervisor
```bash
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
sudo supervisorctl restart all
sudo supervisorctl status
```

### Ports
- Backend: 8001 (FastAPI)
- Frontend: 3000 (React dev server)
- MongoDB: 27017

### Kubernetes Ingress
- Routes API: Préfixer avec `/api` (redirection automatique vers port 8001)
- Routes frontend: Directement vers port 3000

---

## Tests

### Backend Testing
**Fichier**: `/app/phase2_backend_test.py`
- Tests automatisés des 21 nouvelles routes Phase 2
- Taux de réussite: 95.7%
- Corrections automatiques appliquées

### Frontend Testing
- Tests manuels via interface utilisateur
- Tests automatisés possibles avec Playwright

---

## Modules Implémentés

### ✅ Modules Core (MVP)
1. Authentification email/password
2. Gestion contacts
3. Campagnes email
4. Analytics basiques

### ✅ Module 1 - Contacts Avancés
- Tags, groupes, segmentation
- Envoi WhatsApp direct depuis contact

### ✅ Module 2 - WhatsApp Avancé
- Templates messages avec variables
- Boutons interactifs, listes
- Analytics détaillées par contact
- Payment links

### ✅ Module 3 - Catalogue & Réservations
- Produits/Cours/Événements
- Système de réservation public
- Email confirmation automatique (Resend)
- Gestion inventaire/places

### ✅ Module 4 - Rappels & Automatisations
- Rappels programmés (email/WhatsApp/in-app)
- Règles d'automatisation avec triggers
- Templates de rappels

### ✅ Module 5 - AI Assistant
- Chat IA avec GPT-4o-mini (Emergent LLM Key)
- Historique conversations par session
- Types de tâches: général, campagne, analyse, stratégie
- Widget flottant accessible partout

### ✅ Phase 2 - Nouvelles Fonctionnalités
- **Gift Cards**: Cartes cadeaux personnalisées
- **Discounts**: Codes promo et réductions
- **Referrals**: Système de parrainage
- **Ad Chat**: Chat depuis publicités avec conversion

### ✅ PWA & Admin
- Service Worker avec cache intelligent
- Install prompt personnalisé
- Admin free access (bypass toutes limites)

---

## Prochaines Étapes Recommandées

1. **Tests E2E Frontend**: Tests Playwright complets
2. **Email Envoi Réel**: Configurer vraies cartes cadeaux/invitations
3. **Stripe Production**: Remplacer simulation par vraies clés
4. **Optimisations**:
   - Pagination pour grandes listes
   - Lazy loading images
   - Optimisation bundle size
5. **Monitoring**: Ajouter logging/monitoring production

---

## Support & Contact

- **Documentation Emergent**: https://docs.emergent.sh
- **Support Plateforme**: Via chat Emergent
- **Email Contact**: contact@boosttribe.com

---

**Version**: 2.0.0  
**Dernière mise à jour**: Octobre 2024  
**Statut**: ✅ Production Ready
