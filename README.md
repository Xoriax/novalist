# Novalist

> **Une solution complète de gestion d'employés et de données Excel avec authentification sécurisée**

Novalist est une application web moderne qui combine la gestion d'utilisateurs, l'authentification multi-facteurs et le traitement intelligent de fichiers Excel. Conçue pour les entreprises et organisations nécessitant un contrôle précis des accès et une visualisation flexible des données employés.

## Description

Novalist offre une plateforme sécurisée permettant de :
- **Gérer les utilisateurs** avec un système de rôles administrateur/utilisateur
- **Importer et visualiser des données Excel** avec une interface responsive
- **Lier les utilisateurs aux employés** pour un accès personnalisé aux données
- **Contrôler les permissions** avec une authentification renforcée
- **Administrer facilement** avec un panel d'administration complet

### Cas d'usage principaux
- **Entreprises** : Gestion des données RH et accès employés
- **Organisations** : Contrôle d'accès aux informations sensibles  
- **Équipes** : Collaboration sécurisée autour de données Excel
- **Administrations** : Gestion centralisée des utilisateurs et permissions

## Fonctionnalités

### Authentification & Sécurité
- Authentification par email avec codes de vérification
- Authentification multi-facteurs (TOTP)
- Système de rôles utilisateur/administrateur
- Interface d'administration pour la gestion des utilisateurs
- Gestion des emails autorisés pour l'inscription
- Synchronisation automatique entre utilisateurs et emails autorisés

### Gestion des Tickets Excel
- **Import incrémental** - Ajout/mise à jour sans suppression des anciens tickets
- **Détection des changements** - Comparaison intelligente ligne par ligne
- **Logs spécifiques** - Uniquement pour status, assignation, pièces et actions
- **Système de tickets individuels** - Chaque ligne Excel devient un ticket en base de données
- **Onglet "Fermé"** - Affichage dédié des tickets inactifs (absents du dernier import)
- **Gestion du cycle de vie** - Tickets actifs, fermés, et réactivation automatique
- **Détection automatique de tableaux** - Recognition intelligente du début des données (pas forcément en A1)
- **Parsing flexible** - Support des fichiers avec en-têtes, logos, ou espaces en début
- **Barre de recherche avancée** - Recherche par Work Order Number ou Customer Reference Number dans tous les onglets
- **Détails de tickets clickables** - Modal détaillé avec informations complètes du ticket
- **Système de logs chronologiques** - Historique généré automatiquement, tri du plus récent au plus ancien
- **Modal à deux colonnes** - Détails à gauche, logs chronologiques à droite
- **Scroll indépendant** - Navigation séparée dans chaque section du modal
- **Système de drag & drop** - Assignation intuitive de tickets aux opérateurs (admin)
- **Assignation automatique** - Les opérateurs peuvent récupérer les tickets TBP
- **Notifications toast** - Retours visuels élégants pour toutes les actions
- **Synchronisation temps réel** - Polling intelligent (5s) pour mises à jour multi-utilisateurs
- **Logs d'attribution** - Traçabilité complète de qui a assigné quel ticket

### Gestion Excel & Employés
- **Import de fichiers Excel** (.xlsx, .xls, .csv) - Réservé aux administrateurs
- **Liaison employé-utilisateur** - Les utilisateurs voient uniquement leur onglet personnel
- **Onglets dynamiques** - Génération automatique d'onglets par employé depuis Excel
- **Navigation hiérarchique** - Onglet "Opérateurs" pliable regroupant tous les employés
- **Accès personnalisé** - Onglet employé lié affiché séparément hors du groupe
- **Interface admin complète** - Liaison des emails utilisateurs aux employés Excel
- **Affichage des données** sur le tableau de bord avec filtrage par rôle
- **Sélection des colonnes** à afficher (contrôle administrateur uniquement)
- **Correction automatique de l'encodage** UTF-8 (caractères accentués français)
- **Tableau responsive** avec en-tête fixe et scroll optimisé
- **Parsing intelligent** des données avec nettoyage automatique
- **Pagination augmentée** - Affichage jusqu'à 10,000 tickets par onglet

### Interface Utilisateur
- Design responsive avec glassmorphisme
- Animations et effets visuels modernes
- Interface adaptée à la taille de la fenêtre (pas de scroll global)
- Tableau Excel avec colonnes configurables dynamiquement

## Technologies utilisées

- Next.js 16.0.1
- React 19.2.0
- TypeScript
- MongoDB avec Mongoose
- JWT pour l'authentification
- **XLSX** pour le traitement des fichiers Excel
- CSS modules avec design system
- Middleware d'authentification
- API Routes pour le backend
- Glassmorphism UI avec effets de flou

## Installation

1. Cloner le repository
```bash
git clone <repository-url>
cd novilist
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les variables d'environnement
Créer un fichier `.env.local` avec :
```env
MONGODB_URI=your_mongodb_connection_string
AUTH_SECRET=your_jwt_secret
EMAIL_SERVICE_CONFIG=your_email_service_config
```

4. Lancer le serveur de développement
```bash
npm run dev
```

5. Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur

## Structure du projet

```
src/
├── app/                      # App Router Next.js
│   ├── (public)/             # Routes publiques
│   │   ├── dashboard/        # Tableau de bord avec gestion tickets
│   │   └── signin/           # Page de connexion
│   ├── admin/                # Pages d'administration
│   ├── api/                  # API Routes
│   │   ├── admin/            # Endpoints administrateur
│   │   │   ├── allowed-emails/ # Gestion emails autorisés
│   │   │   ├── employee-link/  # Liaison employé-utilisateur
│   │   │   └── users/        # Gestion utilisateurs et rôles
│   │   ├── auth/             # Endpoints authentification
│   │   │   ├── confirm-totp/ # Confirmation TOTP
│   │   │   ├── logout/       # Déconnexion
│   │   │   ├── me/           # Informations utilisateur
│   │   │   ├── request-code/ # Demande code vérification
│   │   │   ├── setup-totp/   # Configuration TOTP
│   │   │   ├── verify-code/  # Vérification code email
│   │   │   └── verify-totp/  # Vérification code TOTP
│   │   ├── excel/            # Import et gestion fichiers Excel
│   │   │   ├── last-update/  # Polling temps réel (timestamp)
│   │   │   └── upload/       # Upload fichiers Excel
│   │   ├── ticket-history/   # Historique des tickets
│   │   ├── ticket-logs/      # Logs détaillés des tickets
│   │   └── tickets/          # CRUD tickets et recherche
│   │       ├── assign/       # Assignation admin (drag & drop)
│   │       └── self-assign/  # Auto-assignation opérateurs
│   ├── favicon.ico           # Icône du site
│   ├── globals.css           # Styles globaux (3700+ lignes)
│   ├── layout.tsx            # Layout principal avec métadonnées
│   ├── page.module.css       # Styles page d'accueil
│   └── page.tsx              # Page d'accueil
├── components/               # Composants réutilisables
│   ├── EmailSignInForm.tsx   # Formulaire connexion par email
│   ├── TotpSetupPanel.tsx    # Configuration authentification TOTP
│   └── VerifyEmailCodeForm.tsx # Vérification code email
├── lib/                      # Utilitaires et helpers
│   ├── db.ts                 # Connexion MongoDB
│   ├── jwt.ts                # Gestion tokens JWT
│   ├── mailer.ts             # Envoi d'emails
│   └── ticketUtils.ts        # Utilitaires tickets et logs
├── models/                   # Modèles Mongoose MongoDB
│   ├── AllowedEmail.ts       # Emails autorisés pour inscription
│   ├── LoginToken.ts         # Tokens temporaires de connexion
│   ├── Ticket.ts             # Tickets avec logs intégrés
│   └── User.ts               # Utilisateurs avec liaison employé
└── middleware.ts             # Middleware d'authentification routes
```

## API Endpoints

### Authentification
- `POST /api/auth/request-code` - Demander un code de vérification
- `POST /api/auth/verify-code` - Vérifier le code email
- `POST /api/auth/setup-totp` - Configurer l'authentification TOTP
- `POST /api/auth/verify-totp` - Vérifier le code TOTP
- `GET /api/auth/me` - Obtenir les informations utilisateur (avec données employé)
- `POST /api/auth/logout` - Déconnexion

### Administration
- `GET /api/admin/users` - Lister les utilisateurs
- `DELETE /api/admin/users` - Supprimer un utilisateur
- `POST /api/admin/users/role` - Modifier le rôle d'un utilisateur
- `GET /api/admin/allowed-emails` - Lister les emails autorisés
- `POST /api/admin/allowed-emails` - Ajouter un email autorisé
- `DELETE /api/admin/allowed-emails` - Supprimer un email autorisé
- `GET /api/admin/employee-link` - Lister les liaisons employé-utilisateur
- `POST /api/admin/employee-link` - Lier un utilisateur à un employé
- `DELETE /api/admin/employee-link` - Supprimer une liaison employé-utilisateur

### Excel
- `GET /api/excel` - Récupérer les données Excel stockées
- `POST /api/excel` - Importer un fichier Excel (admin uniquement)
- `DELETE /api/excel` - Supprimer toutes les données Excel (admin uniquement)
- `GET /api/excel/last-update` - Obtenir le timestamp de la dernière modification (polling)

### Tickets
- `GET /api/tickets` - Lister tous les tickets avec filtres et recherche
- `POST /api/tickets/assign` - Assigner un ticket à un opérateur (admin uniquement)
- `POST /api/tickets/self-assign` - Auto-assignation d'un ticket TBP (opérateurs)
- `GET /api/ticket-logs` - Récupérer les logs d'un ticket spécifique
- `GET /api/ticket-history` - Obtenir l'historique complet d'un ticket

## Fonctionnalités d'administration

Les administrateurs peuvent :
- **Gérer les utilisateurs** (consulter, modifier les rôles, supprimer)
- **Gérer les emails autorisés** pour l'inscription
- **Lier les utilisateurs aux employés** avec interface dédiée
- **Importer des fichiers Excel** (.xlsx, .xls, .csv) sur le tableau de bord
- **Configurer les colonnes** à afficher pour tous les utilisateurs
- **Supprimer les données Excel** importées
- **Voir tous les onglets employés** dans la sidebar
- Accéder à un **panel d'administration** dédié avec interface moderne

### Fonctionnalités utilisateur standard

Les utilisateurs standard peuvent :
- **Voir leur onglet employé personnel** affiché séparément en haut de la sidebar
- **Accéder à l'onglet "Opérateurs"** avec liste pliable de tous les autres employés
- **Naviguer facilement** avec scroll optimisé dans la liste des opérateurs
- **Accéder à leurs données personnelles** extraites du fichier Excel
- **Visualiser le tableau de bord** avec les colonnes configurées par l'admin
- **Gérer leur profil** et leur authentification TOTP

## Fonctionnalités Excel

### Import de Fichiers Intelligent
- **Formats supportés** : .xlsx (Excel moderne), .xls (Excel legacy), .csv
- **Détection automatique** : Reconnaissance du début du tableau même si pas en A1
- **Parsing flexible** : Support des fichiers avec en-têtes, logos, espaces
- **Algorithme intelligent** : Analyse des 20 premières lignes pour trouver les données
- **Accès restreint** : Seuls les administrateurs peuvent importer
- **Validation automatique** : Vérification du format et du contenu
- **Encodage UTF-8** : Correction automatique des caractères accentués

### Recherche et Navigation
- **Barre de recherche globale** : Recherche instantanée dans tous les tickets
- **Critères multiples** : Work Order Number ET Customer Reference Number
- **Recherche partielle** : Trouve les tickets contenant le terme recherché
- **Compteur de résultats** : Affichage du nombre de tickets trouvés
- **Effacement rapide** : Bouton pour vider la recherche instantanément
- **Recherche temps réel** : Filtrage automatique pendant la saisie

### Détails de Tickets Interactifs
- **Lignes clickables** : Clic sur n'importe quelle ligne pour voir les détails
- **Modal à deux colonnes** : Organisation claire des informations
- **Détails complets** : Tous les champs du ticket affichés
- **Logs automatiques** : Historique chronologique généré depuis Excel
- **Types de logs** : Création, ouverture, actions, assignations
- **Scroll indépendant** : Navigation séparée dans détails et logs
- **Design responsive** : Adaptation mobile avec colonnes verticales

### Affichage des Données
- **Tableau responsive** : S'adapte à toutes les tailles d'écran
- **En-tête fixe** : Les colonnes restent visibles pendant le scroll
- **Sélection de colonnes** : Les admins choisissent quelles colonnes afficher
- **Interface optimisée** : Hauteur adaptée à la fenêtre, pas de scroll global
- **Filtrage dynamique** : Affichage des résultats de recherche en temps réel

### Gestion des Colonnes
- **Panneau de configuration** : Interface intuitive pour sélectionner les colonnes
- **Tout sélectionner/désélectionner** : Actions rapides pour les admins
- **Mise à jour en temps réel** : Le tableau se met à jour instantanément
- **Persistence** : Les colonnes sélectionnées restent actives

## Développement

### Scripts disponibles
- `npm run dev` - Lancer en mode développement
- `npm run build` - Construire pour la production
- `npm run start` - Lancer en mode production
- `npm run lint` - Vérifier le code avec ESLint

### Configuration de la base de données
L'application utilise MongoDB avec Mongoose. Les modèles incluent :
- **User** (utilisateurs avec rôles, authentification et liaison employé)
- **AllowedEmail** (emails autorisés pour l'inscription)
- **LoginToken** (tokens de vérification temporaires)
- **Ticket** (tickets individuels avec logs intégrés et métadonnées)
  - Stockage des données brutes Excel
  - Génération automatique des logs chronologiques
  - Indexation pour recherche rapide par Work Order et Customer Reference
  - Métadonnées d'import (fichier, utilisateur, date)

## Sécurité

- Authentification JWT sécurisée
- Authentification multi-facteurs obligatoire
- Validation des emails par codes temporaires
- Middleware de protection des routes
- Gestion des rôles et permissions
- Chiffrement des données sensibles
