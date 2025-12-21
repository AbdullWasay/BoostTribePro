# 📝 BoostTribe - Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

---

## [2.0.0] - 2024-10-31

### 🎉 MAJOR RELEASE - Phase 2 Complete

#### ✨ Nouvelles Fonctionnalités Majeures

**🎁 Cartes Cadeaux**
- Création de cartes cadeaux personnalisées
- Montants configurables en CHF ou autre devise
- Messages personnels pour destinataires
- Templates de design (défaut, anniversaire, Noël, personnalisé)
- Codes uniques générés automatiquement
- Validation et utilisation avec support utilisation partielle
- Tracking solde restant
- Gestion expiration automatique

**💰 Système de Réductions**
- Codes promo avec validation automatique
- Types: Pourcentage ou Montant fixe
- Dates de validité configurables
- Limites d'utilisation (totale + par utilisateur)
- Achat minimum requis
- Applicabilité à produits spécifiques
- Ciblage par contacts/tags
- CRUD complet avec interface intuitive

**🤝 Programme de Parrainage**
- Génération de code de parrainage unique par utilisateur
- Lien de parrainage partageable
- Envoi d'invitations par email
- Dashboard statistiques (total, pending, complétés, récompenses)
- Tracking complet des conversions
- Système de récompenses configurables
- Critères de completion personnalisables
- État des récompenses (appliquée/en attente)

**💬 Chat depuis Publicités**
- Démarrage conversations depuis ads (Facebook, Instagram, Google, LinkedIn)
- Chat temps réel visiteur ↔ agent
- Messages bidirectionnels
- Collecte informations visiteur (nom, email, téléphone)
- Filtres par statut (actif, résolu, archivé, converti)
- Lead scoring (0-100)
- Priorités (low, normal, high, urgent)
- Assignment agents
- Conversion automatique en contact
- Tags personnalisables

#### 🚀 Améliorations PWA

**Service Worker**
- Cache intelligent avec stratégie cache-first pour assets statiques
- Network-first pour appels API
- Support hors ligne avec fallback vers page cachée
- Background sync pour synchronisation données
- Support push notifications
- Gestion des clics notifications
- Nettoyage automatique anciens caches

**Installation PWA**
- Prompt d'installation personnalisé avec UI BoostTribe
- Détection si app déjà installée
- Dismiss persistant (localStorage)
- Support desktop et mobile
- Mode standalone optimisé

#### 🔐 Système de Permissions Admin

**Admin Free Access**
- Hook `useFeatureAccess()` pour vérifier permissions
- Admins: Accès illimité à toutes fonctionnalités (bypass toutes limites)
- Users: Limites par défaut affichées avec progress bars
- Badge "Admin - Accès Illimité" avec icône Crown
- Composant `FeatureLimit` pour afficher usage avec warning à 80%
- Composant `FeatureGate` pour bloquer accès features premium
- Intégrable facilement sur toutes pages

#### 🎨 Rebranding Complet

**De "Afroboost Mailer" à "BoostTribe"**
- Nouveau nom sur toutes les pages (15+ fichiers modifiés)
- Logo personnalisé créé (SVG + PNG variants)
- Nouveau favicon avec design gradient violet
- Manifest PWA mis à jour
- Meta tags SEO/OpenGraph/Twitter enrichis
- Nouvelle couleur thème: #8B5CF6 (violet)
- Emails: contact@afroboost.com → contact@boosttribe.com
- Traductions FR/EN/DE mises à jour

#### 🔧 Backend

**21 Nouvelles Routes API**
- 4 routes Gift Cards (`/api/gift-cards/*`)
- 7 routes Discounts (`/api/discounts/*`)
- 4 routes Referrals (`/api/referrals/*`)
- 6 routes Ad Chat (`/api/ad-chat/*`)

**Modèles Pydantic**
- `GiftCard`, `GiftCardCreate`, `GiftCardRedeem`
- `Discount`, `DiscountCreate`, `DiscountUpdate`, `DiscountValidation`
- `Referral`, `ReferralCreate`, `ReferralStats`
- `AdChat`, `AdChatMessage`, `AdChatStart`, `AdChatUpdate`

**Améliorations**
- Gestion datetime ISO format pour MongoDB
- Validation renforcée avec Pydantic
- Error handling amélioré
- Endpoints publics pour gift cards et ad chat start

#### 💻 Frontend

**4 Nouvelles Pages**
- `GiftCards.js` - Interface CRUD complète avec preview design
- `Discounts.js` - Gestion codes promo avec validation temps réel
- `Referrals.js` - Dashboard parrainage avec stats et invitations
- `AdChat.js` - Interface chat split-view avec liste conversations

**Composants**
- `InstallPrompt.js` - Prompt installation PWA
- Hook `useFeatureAccess` avec composants AdminBadge, FeatureLimit, FeatureGate

**Navigation**
- 4 nouveaux liens dans sidebar avec icônes
- Routes intégrées dans App.js
- Responsive design maintenu

#### 📚 Documentation

**Nouveaux Fichiers**
- `DOCUMENTATION_COMPLETE.md` - Documentation technique exhaustive
- `GUIDE_DEMARRAGE.md` - Guide démarrage rapide utilisateur
- `CHANGELOG.md` - Ce fichier

#### ✅ Tests

**Backend Testing**
- Tests automatisés des 21 nouvelles routes
- Taux de réussite: 95.7%
- Corrections automatiques appliquées:
  - Fixed `current_user.id` access
  - Fixed gift card redemption balance calculation
  - Optimized discount validation logic

### 🐛 Corrections de Bugs

- Fixed: Accès aux attributs user dans endpoints auth
- Fixed: Calcul solde restant cartes cadeaux
- Fixed: Modèle GiftCardRedeem (champ `code` retiré)
- Fixed: Service Worker registration path

### 🔄 Changements Techniques

**Backend**
- Upgrade dependencies: ajout `emergentintegrations` pour LLM
- MongoDB: Utilisation systématique UUID au lieu ObjectId
- Datetime: Conversion ISO format pour storage MongoDB

**Frontend**
- Service Worker enregistré dans index.html
- InstallPrompt intégré globalement dans Layout
- Améliorations responsive design

---

## [1.5.0] - 2024-10-28

### ✨ Module 5 - AI Assistant

**Fonctionnalités**
- Widget chat IA flottant accessible partout
- Intégration GPT-4o-mini via Emergent LLM Key
- Historique conversations par session
- Types de tâches: général, campagne, analyse, stratégie
- Interface conversationnelle fluide
- Suggestions rapides (quickSuggestions)

**Backend**
- Routes `/api/ai/assistant/chat` et `/api/ai/assistant/sessions`
- Service `AIMemoryService` pour gestion mémoire conversationnelle
- Stockage MongoDB des sessions et messages

**Frontend**
- Composant `AIAssistantWidget.js`
- Support markdown dans réponses IA
- Minimisation/maximisation widget

---

## [1.4.0] - 2024-10-25

### ✨ Module 4 - Reminders & Automations

**Fonctionnalités**
- Création rappels (email, WhatsApp, in-app)
- Programmation date/heure
- Règles d'automatisation avec triggers
- Actions automatiques (email, WhatsApp, notification)

**Backend**
- Modèles `Reminder`, `AutomationTrigger`
- Routes CRUD complètes

**Frontend**
- Page `Reminders.js`
- Interface gestion rappels et automatisations

---

## [1.3.0] - 2024-10-20

### ✨ Module 3 - Catalogue & Réservations

**Fonctionnalités**
- Catalogue produits/cours/événements
- Système réservation public avec lien direct
- Email confirmation automatique (Resend)
- Gestion inventaire et places disponibles

**Backend**
- Modèles `CatalogItem`, `Reservation`
- Routes CRUD + endpoint public réservation
- Intégration Resend pour emails

**Frontend**
- Page `Catalog.js` pour gestion catalogue
- Page `Reservations.js` pour gestion réservations
- Page publique réservation (pas d'auth requise)

---

## [1.2.0] - 2024-10-15

### ✨ Module 2 - WhatsApp Campaigns Advanced

**Fonctionnalités**
- Templates messages avec variables `{{nom}}`, `{{email}}`
- Boutons interactifs (Call-to-Action, URLs, Téléphone)
- Listes de sélection
- Payment links intégrés
- Analytics détaillées par contact

**Backend**
- Modèles `AdvancedWhatsAppCampaign`, `WhatsAppTemplate`
- Routes CRUD + analytics + envoi

**Frontend**
- Page `WhatsAppCampaignsAdvanced.js`
- Éditeur visuel avec preview temps réel
- Builder boutons/listes interactifs

---

## [1.1.0] - 2024-10-10

### ✨ Module 1 - Advanced Contacts

**Fonctionnalités**
- Tags et groupes contacts
- Segmentation avancée
- Envoi WhatsApp direct depuis contact
- Historique interactions

**Backend**
- Amélioration modèle `Contact` avec tags/groupes
- Route `/api/contacts/bulk-message` pour WhatsApp groupé

**Frontend**
- Page `Contacts.js` enrichie
- Bouton "Send WhatsApp" sur chaque contact
- Filtres et recherche améliorés

---

## [1.0.0] - 2024-10-01

### 🎉 MVP Initial - Afroboost Mailer

**Fonctionnalités Core**
- Authentification email/password avec JWT
- Premier user = admin automatiquement
- Gestion contacts basique
- Campagnes email
- Dashboard analytics
- Support multilingue (FR/EN/DE)

**Backend**
- FastAPI + MongoDB
- JWT authentication avec bcrypt
- API RESTful complète
- Intégration Resend pour emails

**Frontend**
- React + TailwindCSS
- Shadcn/UI components
- react-i18next pour i18n
- Responsive design

**Pages**
- Landing, Login, Register
- Dashboard, Contacts, Campaigns
- Analytics, Calendar
- Profile, Admin, Pricing

---

## Format du Changelog

- **[MAJOR.MINOR.PATCH]** - Date
- **Types**: ✨ Features, 🐛 Fixes, 🔧 Changes, 🗑️ Deprecated, 🚀 Performance
- **Sections**: Added, Changed, Fixed, Removed, Security

---

**Maintenu par**: BoostTribe Development Team  
**Dernière mise à jour**: 2024-10-31
