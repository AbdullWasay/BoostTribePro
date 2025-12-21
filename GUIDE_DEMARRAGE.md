# 🚀 BoostTribe - Guide de Démarrage Rapide

## Accès à l'Application

**URL**: https://boosttribe-app-1.preview.emergentagent.com

## Première Connexion

### Créer un Compte Admin
1. Allez sur `/register`
2. Remplissez le formulaire
3. **Le premier utilisateur inscrit devient automatiquement admin**
4. Vous recevrez un token JWT pour l'authentification

### Connexion
1. Allez sur `/login`
2. Email + Mot de passe
3. Vous serez redirigé vers le Dashboard

---

## Fonctionnalités Principales

### 📧 1. Campagnes Email
**Page**: `/campaigns`
- Créer des campagnes email
- Sélectionner contacts/groupes cibles
- Templates personnalisables
- Programmation envoi

### 💬 2. Campagnes WhatsApp
**Page**: `/whatsapp`
- Messages avec variables dynamiques `{{nom}}`, `{{email}}`
- Boutons interactifs (Call-to-Action, URLs, Téléphone)
- Listes de sélection
- Payment links intégrés
- Analytics par contact

### 👥 3. Contacts
**Page**: `/contacts`
- Import CSV
- Tags et groupes
- Envoi WhatsApp direct (bouton sur chaque contact)
- Historique interactions

### 📦 4. Catalogue
**Page**: `/catalog`
- Ajouter Produits, Cours, Événements
- Prix, durée, places disponibles
- Images (URL)
- Gestion inventaire

### 🎫 5. Réservations
**Page**: `/reservations`
- Vue liste toutes réservations
- Filtres par statut (pending/confirmed/cancelled)
- Gestion des réservations
- **Lien public**: Vos clients peuvent réserver directement via URL

**URL publique de réservation**:
```
https://boosttribe-app-1.preview.emergentagent.com/reservations/public?item={catalog_item_id}
```

### 🎁 6. Cartes Cadeaux (NOUVEAU)
**Page**: `/gift-cards`
- Créer cartes cadeaux personnalisées
- Montant, devise, expiration
- Message personnel
- Templates design (défaut, anniversaire, Noël)
- Validation par code
- Utilisation partielle supportée

**Cas d'usage**:
- Offrir services à des clients VIP
- Promotions spéciales
- Cadeaux d'entreprise

### 💰 7. Réductions (NOUVEAU)
**Page**: `/discounts`
- Créer codes promo (ex: SUMMER2024)
- Type: Pourcentage ou Montant fixe
- Dates de validité
- Limites d'utilisation (totale + par user)
- Achat minimum requis
- Validation automatique à l'achat

**Cas d'usage**:
- Promotions saisonnières
- Récompenser clients fidèles
- Lancement produit

### 🤝 8. Parrainage (NOUVEAU)
**Page**: `/referrals`
- Dashboard statistiques (total, pending, complétés, récompenses)
- Lien de parrainage unique à partager
- Invitations par email
- Tracking complet des parrainages
- Récompenses automatiques (10% réduction par défaut)

**Comment ça marche**:
1. Vous partagez votre lien de parrainage
2. Votre ami s'inscrit via le lien
3. À son premier achat, vous recevez tous les deux une récompense

### 💬 9. Chat Publicités (NOUVEAU)
**Page**: `/ad-chat`
- Conversations depuis publicités Facebook/Instagram/Google/LinkedIn
- Chat temps réel visiteur ↔ agent
- Filtres par statut (actif, résolu, converti)
- Conversion automatique en contact
- Lead scoring et priorités
- Assignment agents

**Cas d'usage**:
- Support depuis ads
- Qualifier leads en temps réel
- Convertir prospects en clients

### 🔔 10. Rappels & Automatisations
**Page**: `/reminders`
- Créer rappels (email, WhatsApp, in-app)
- Date et heure programmables
- Automatisations avec triggers:
  - Nouvelle réservation
  - Nouveau contact
  - Anniversaire client
  - Panier abandonné
- Actions: Envoyer email, WhatsApp, notification

### 🤖 11. Assistant IA
**Widget flottant** (accessible partout)
- Chat avec IA (GPT-4o-mini)
- Aide à la rédaction campagnes
- Suggestions stratégiques marketing
- Analyse de données
- Conseils personnalisés

---

## Configuration Admin

### Page Admin
**Page**: `/admin` (admin uniquement)

**Sections**:
1. **Informations Entreprise**
   - Nom entreprise
   - Email expéditeur
   - Nom expéditeur
   - Coordonnées bancaires (IBAN, devise)

2. **Intégrations API**
   - Resend API Key (emails)
   - WhatsApp Access Token + Phone Number ID
   - Stripe Keys (paiements)
   - Twint (paiements Suisse)

3. **Tarifs & Plans**
   - Gérer les plans (Starter, Pro Coach, Business)
   - Prix, limites, fonctionnalités

---

## Accès Admin vs User

### 👑 Admin (Accès Illimité)
- Badge "Admin - Accès Illimité" visible dans interface
- Toutes fonctionnalités débloquées
- Pas de limites d'usage
- Accès page `/admin`

### 👤 User Standard
- Limites par défaut:
  - 1000 emails/mois
  - 500 WhatsApp/mois
  - 5000 contacts max
  - 10 cartes cadeaux/mois
  - 5 codes promo actifs
- Progress bars affichent usage
- Message upgrade si limite atteinte

---

## Internationalisation

### Langues Supportées
- 🇫🇷 Français (par défaut)
- 🇬🇧 Anglais
- 🇩🇪 Allemand

### Changer de Langue
- Sélecteur en haut à droite de l'interface
- Traduction automatique de toute l'interface
- Persisté dans localStorage

---

## PWA (Application Mobile)

### Installer sur Mobile/Desktop

**Sur Chrome Desktop**:
1. Icône "Installer" apparaîtra dans la barre d'adresse
2. Ou popup "Installer BoostTribe" en bas à droite
3. Cliquer "Installer"

**Sur Mobile (Android/iOS)**:
1. Menu navigateur → "Ajouter à l'écran d'accueil"
2. L'app s'ouvrira en mode standalone (sans barre navigateur)

**Fonctionnalités PWA**:
- ✅ Fonctionne hors ligne (données en cache)
- ✅ Installation écran d'accueil
- ✅ Notifications push (à venir)
- ✅ Expérience native

---

## FAQ Rapide

### Comment envoyer ma première campagne ?
1. Allez sur `/contacts`, ajoutez vos contacts
2. Allez sur `/campaigns`, créez une campagne
3. Sélectionnez vos contacts cibles
4. Rédigez votre message (ou utilisez l'IA)
5. Envoyez ou programmez

### Comment activer WhatsApp ?
1. Allez sur `/admin`
2. Section "Intégrations WhatsApp"
3. Ajoutez votre Access Token + Phone Number ID
4. Sauvegardez
5. WhatsApp est maintenant disponible

### Comment créer un code promo ?
1. Allez sur `/discounts`
2. Cliquez "Nouvelle Réduction"
3. Remplissez: Code, Type (%), Valeur, Dates
4. Définissez limites d'usage
5. Créez

### Comment partager mon lien de parrainage ?
1. Allez sur `/referrals`
2. Copiez votre lien unique
3. Partagez sur réseaux sociaux, email, etc.
4. Suivez vos stats en temps réel

### Comment gérer les chats publicités ?
1. Allez sur `/ad-chat`
2. Cliquez sur une conversation
3. Répondez en temps réel
4. Bouton "Convertir en contact" si intéressé
5. Assignez priorités et statuts

---

## Raccourcis Clavier

- `Ctrl + K` - Recherche globale
- `Ctrl + B` - Toggle sidebar
- `Ctrl + ,` - Paramètres

---

## Besoin d'Aide ?

### Documentation Complète
- Voir `/DOCUMENTATION_COMPLETE.md`

### Support
- Email: contact@boosttribe.com
- Chat IA intégré dans l'app

---

**Bon marketing avec BoostTribe ! 🚀**
