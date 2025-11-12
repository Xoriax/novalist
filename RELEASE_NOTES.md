# Release Notes - Novalist

## Version 1.1.0 - Gestion Excel (12 novembre 2025)

### Nouvelles fonctionnalités Excel

**Import et gestion de fichiers Excel**
- **Import de fichiers Excel** : Support complet des formats .xlsx, .xls et .csv
- **Accès administrateur uniquement** : Seuls les admins peuvent importer des fichiers
- **Parsing intelligent** : Traitement automatique des en-têtes et données
- **Validation des fichiers** : Vérification du format et du contenu avant import
- **Remplacement automatique** : Chaque nouvel import remplace les données précédentes

**Affichage optimisé des données**
- **Tableau responsive** : Interface adaptée à toutes les tailles d'écran
- **En-tête fixe opaque** : Les colonnes restent visibles pendant le scroll
- **Interface sans scroll global** : Hauteur adaptée à la fenêtre utilisateur
- **Design glassmorphisme** : Intégration parfaite avec le thème existant

**Sélection dynamique des colonnes**
- **Panneau de configuration** : Interface intuitive pour sélectionner les colonnes
- **Contrôle administrateur** : Seuls les admins peuvent modifier les colonnes affichées
- **Actions rapides** : Boutons "Tout sélectionner/désélectionner"
- **Mise à jour temps réel** : Le tableau se met à jour instantanément
- **Grille responsive** : Organisation automatique des checkboxes de colonnes

**Correction automatique de l'encodage**
- **Support UTF-8** : Correction des caractères accentués français
- **Nettoyage intelligent** : Remplacement des caractères mal encodés (é, è, à, ç, etc.)
- **Application globale** : Correction dans les en-têtes et données
- **Compatibilité legacy** : Support des anciens fichiers Excel avec problèmes d'encodage

### Améliorations techniques

**API Excel**
- **Endpoint GET /api/excel** : Récupération des données stockées
- **Endpoint POST /api/excel** : Import sécurisé (admin uniquement)
- **Endpoint DELETE /api/excel** : Suppression des données (admin uniquement)
- **Traitement des erreurs** : Gestion complète des cas d'erreur
- **Validation sécurisée** : Vérification des permissions et du contenu

**Modèle de données**
- **ExcelData Model** : Nouveau modèle MongoDB pour stocker les fichiers Excel
- **Métadonnées complètes** : Filename, uploadedBy, uploadedAt, dimensions
- **Structure flexible** : Support de tout type de données Excel
- **Optimisation requêtes** : Index sur les champs de recherche

**Interface utilisateur**
- **Nouveaux composants** : Sélecteur de colonnes, tableau Excel responsive
- **Styles CSS étendus** : Plus de 100 lignes de nouveaux styles
- **Animations fluides** : Transitions pour les interactions utilisateur
- **Accessibilité** : Labels et contrôles accessibles

### Interface utilisateur améliorée

**Actions administrateur**
- **Bouton "Importer Excel"** : Interface de sélection de fichiers intuitive
- **Bouton "Colonnes"** : Accès rapide au panneau de configuration
- **Bouton "Effacer les données"** : Suppression sécurisée avec confirmation
- **Design cohérent** : Intégration parfaite avec l'interface existante

**Tableau de données**
- **Largeur optimisée** : Utilisation complète de l'espace disponible
- **Scroll vertical uniquement** : Dans le contenu du tableau
- **En-tête sticky** : Reste visible pendant la navigation
- **Alternance de couleurs** : Améliore la lisibilité des données

### 🔧 Corrections et optimisations

**Problèmes d'encodage résolus**
- **Caractères français** : "J�r�" → "Jérôme" 
- **Accents restaurés** : Correction automatique des é, è, à, ç
- **Compatibilité fichiers** : Support des fichiers Excel anciens et récents
- **Affichage uniforme** : Correction côté serveur et client

**Performance et UX**
- **Chargement optimisé** : Parsing efficace des gros fichiers Excel
- **Interface responsive** : Adaptation automatique aux petits écrans
- **Feedback utilisateur** : Messages de confirmation et d'erreur clairs
- **Mémoire optimisée** : Nettoyage automatique des anciennes données

### Dépendances ajoutées

- **xlsx ^0.18.5** : Traitement des fichiers Excel et CSV
- Aucune autre dépendance externe ajoutée

---

## Version 1.0.0 - Release Initiale (12 novembre 2025)

### Fonctionnalités principales

**Authentification sécurisée**
- Système d'authentification par email avec codes de vérification temporaires
- Authentification multi-facteurs (TOTP) obligatoire pour tous les utilisateurs
- Tokens JWT sécurisés avec expiration automatique
- Middleware de protection des routes

**Interface utilisateur moderne**
- Design glassmorphisme avec effets de flou et transparence
- Animations fluides et particules animées en arrière-plan
- Interface responsive adaptée à tous les appareils
- Thème sombre moderne avec dégradés colorés

**Gestion des utilisateurs**
- Tableau de bord administrateur complet
- Gestion des rôles utilisateur/administrateur
- Système d'emails autorisés pour contrôler les inscriptions
- Synchronisation automatique bidirectionnelle entre utilisateurs et emails autorisés

**Architecture technique**
- Next.js 16.0.1 avec App Router
- React 19.2.0 avec TypeScript
- MongoDB avec Mongoose pour la persistance
- API Routes pour le backend
- Système de composants modulaires

### Pages et fonctionnalités

**Page d'accueil**
- Landing page avec hero banner animé 
- Design attractif avec call-to-action
- Informations sur le créateur et lien GitHub

**Page de connexion**
- Processus d'authentification en 3 étapes
- Interface intuitive avec indicateurs de progression
- Gestion des erreurs et validation en temps réel

**Tableau de bord**
- Vue d'ensemble des statistiques utilisateur
- Navigation par onglets fluide
- Informations de profil et statut de sécurité

**Panel d'administration**
- Gestion complète des utilisateurs (consulter, modifier rôles, supprimer)
- Gestion des emails autorisés avec ajout/suppression
- Interface claire avec tables de données interactives

### Sécurité

- Authentification JWT avec secret sécurisé
- Validation des emails par codes temporaires
- Chiffrement des données sensibles
- Protection CSRF et validation des entrées
- Gestion des sessions sécurisée

### API Endpoints

**Authentification**
- POST /api/auth/request-code - Demander un code de vérification
- POST /api/auth/verify-code - Vérifier le code email
- POST /api/auth/setup-totp - Configurer TOTP
- POST /api/auth/verify-totp - Vérifier code TOTP
- GET /api/auth/me - Informations utilisateur
- POST /api/auth/logout - Déconnexion

**Administration**
- GET /api/admin/users - Lister utilisateurs
- DELETE /api/admin/users - Supprimer utilisateur
- POST /api/admin/users/role - Modifier rôle
- GET /api/admin/allowed-emails - Lister emails autorisés
- POST /api/admin/allowed-emails - Ajouter email
- DELETE /api/admin/allowed-emails - Supprimer email

### Installation et déploiement

- Configuration simple avec variables d'environnement
- Support MongoDB local ou cloud
- Déploiement compatible Vercel, Netlify, AWS
- Scripts npm pour développement et production

### Technologies utilisées

- **Framework**: Next.js 16.0.1
- **Frontend**: React 19.2.0, TypeScript
- **Base de données**: MongoDB avec Mongoose
- **Authentification**: JWT, TOTP
- **Styling**: CSS modules avec design system
- **Build**: Turbopack pour un développement rapide

Cette version initiale pose les bases solides d'une application moderne de gestion d'utilisateurs avec une sécurité renforcée et une interface utilisateur exceptionnelle.