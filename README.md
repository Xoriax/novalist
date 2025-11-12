# Novalist

## Fonctionnalités

### 🔐 Authentification & Sécurité
- Authentification par email avec codes de vérification
- Authentification multi-facteurs (TOTP)
- Système de rôles utilisateur/administrateur
- Interface d'administration pour la gestion des utilisateurs
- Gestion des emails autorisés pour l'inscription
- Synchronisation automatique entre utilisateurs et emails autorisés

### 📊 Gestion Excel
- **Import de fichiers Excel** (.xlsx, .xls, .csv) - Réservé aux administrateurs
- **Affichage des données** sur le tableau de bord pour tous les utilisateurs
- **Sélection des colonnes** à afficher (contrôle administrateur uniquement)
- **Correction automatique de l'encodage** UTF-8 (caractères accentués français)
- **Tableau responsive** avec en-tête fixe et scroll optimisé
- **Parsing intelligent** des données avec nettoyage automatique

### 🎨 Interface Utilisateur
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
├── app/                   # App Router Next.js
│   ├── (public)/          # Routes publiques
│   │   ├── dashboard/     # Tableau de bord
│   │   └── signin/        # Page de connexion
│   ├── api/               # API Routes
│   │   ├── admin/         # Endpoints administrateur
│   │   └── auth/          # Endpoints authentification
│   ├── globals.css        # Styles globaux
│   └── layout.tsx         # Layout principal
├── components/            # Composants réutilisables
├── lib/                   # Utilitaires (DB, JWT, Email)
├── models/                # Modèles Mongoose
└── middleware.ts          # Middleware d'authentification
```

## API Endpoints

### Authentification
- `POST /api/auth/request-code` - Demander un code de vérification
- `POST /api/auth/verify-code` - Vérifier le code email
- `POST /api/auth/setup-totp` - Configurer l'authentification TOTP
- `POST /api/auth/verify-totp` - Vérifier le code TOTP
- `GET /api/auth/me` - Obtenir les informations utilisateur
- `POST /api/auth/logout` - Déconnexion

### Administration
- `GET /api/admin/users` - Lister les utilisateurs
- `DELETE /api/admin/users` - Supprimer un utilisateur
- `POST /api/admin/users/role` - Modifier le rôle d'un utilisateur
- `GET /api/admin/allowed-emails` - Lister les emails autorisés
- `POST /api/admin/allowed-emails` - Ajouter un email autorisé
- `DELETE /api/admin/allowed-emails` - Supprimer un email autorisé

### Excel
- `GET /api/excel` - Récupérer les données Excel stockées
- `POST /api/excel` - Importer un fichier Excel (admin uniquement)
- `DELETE /api/excel` - Supprimer toutes les données Excel (admin uniquement)

## Fonctionnalités d'administration

Les administrateurs peuvent :
- **Gérer les utilisateurs** (consulter, modifier les rôles, supprimer)
- **Gérer les emails autorisés** pour l'inscription
- **Importer des fichiers Excel** (.xlsx, .xls, .csv) sur le tableau de bord
- **Configurer les colonnes** à afficher pour tous les utilisateurs
- **Supprimer les données Excel** importées
- Accéder à un **panel d'administration** dédié avec interface moderne

## Fonctionnalités Excel

### Import de Fichiers
- **Formats supportés** : .xlsx (Excel moderne), .xls (Excel legacy), .csv
- **Accès restreint** : Seuls les administrateurs peuvent importer
- **Validation automatique** : Vérification du format et du contenu
- **Encodage UTF-8** : Correction automatique des caractères accentués

### Affichage des Données
- **Tableau responsive** : S'adapte à toutes les tailles d'écran
- **En-tête fixe** : Les colonnes restent visibles pendant le scroll
- **Sélection de colonnes** : Les admins choisissent quelles colonnes afficher
- **Interface optimisée** : Hauteur adaptée à la fenêtre, pas de scroll global

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
- **User** (utilisateurs avec rôles et authentification)
- **AllowedEmail** (emails autorisés pour l'inscription)
- **LoginToken** (tokens de vérification temporaires)
- **ExcelData** (stockage des fichiers Excel importés avec métadonnées)

## Sécurité

- Authentification JWT sécurisée
- Authentification multi-facteurs obligatoire
- Validation des emails par codes temporaires
- Middleware de protection des routes
- Gestion des rôles et permissions
- Chiffrement des données sensibles