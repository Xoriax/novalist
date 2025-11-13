# Release Notes - NoviList

## Version 1.3.0 - Navigation Hierarchique et Interface Optimisee (13 novembre 2025)

### Nouvelle architecture de navigation

**Navigation hierarchique avancee**
- **Onglet "Operateurs" pliable** : Regroupement intelligent de tous les employes
- **Systeme d'ouverture/fermeture** : Interface collapsible avec animation fluide
- **Onglet employe lie separe** : Affichage privilegie hors du groupe operateurs
- **Organisation logique** : Structure claire separant profil personnel et autres employes
- **Animation CSS avancee** : Transitions 0.4s avec cubic-bezier pour fluidite optimale

**Interface utilisateur repensee**
- **Scroll optimise dans sous-menus** : Navigation fluide avec barre de scroll personnalisee
- **Hauteur adaptive** : 60vh maximum pour le sous-menu avec scroll automatique
- **Ordre des onglets restructure** : Tableau de bord, Non attribue, Profil lie, Operateurs, Admin
- **Style distinct pour employe lie** : Design vert emeraude avec bordure laterale coloree
- **Icones meaningtiques** : Operateurs (groupe), Profil personnel (utilisateur)

**Gestion des permissions et acces**
- **Acces universel aux donnees Excel** : Tous les utilisateurs peuvent charger les donnees
- **Generation d'onglets pour tous** : Fini la restriction admin pour voir les onglets employes
- **Filtrage intelligent** : Separation automatique employe lie vs autres operateurs
- **Visibilite globale** : Tous les utilisateurs voient maintenant tous les onglets employes

### Ameliorations techniques

**Systeme de scroll hierarchique**
- **Scroll parent optimise** : Barre de scroll principale avec design gradiant violet-bleu
- **Scroll enfant specialise** : Sous-menu avec scroll vert assorti aux employes
- **Scroll-behavior smooth** : Defilement fluide sur tous les elements
- **Compatibilite Firefox** : scrollbar-width thin pour support etendu

**Architecture CSS avancee**
- **Classes hierarchiques** : parent-item, sub-item, linked-employee avec styles distincts
- **Variables CSS dynamiques** : max-height, opacity, transform geres par classes
- **Effets visuels avances** : Backdrop-filter, box-shadow, border-radius coordonnes
- **Responsive design** : Adaptation automatique sur toutes tailles d'ecran

**Logique JavaScript optimisee**
- **Etat operatorsExpanded** : Gestion claire de l'ouverture/fermeture
- **Separation des donnees** : linkedEmployeeTab vs otherEmployeeTabs
- **Detection automatique** : Identification de l'employe lie par comparaison user.employee
- **Prevention des erreurs** : Verification TypeScript avec optional chaining

### Corrections et optimisations

**Resolution du probleme de visibilite des onglets**
- **Suppression restriction admin** : fetchExcelData maintenant accessible a tous
- **Generation universelle** : getUniqueEmployees disponible pour tous les utilisateurs  
- **Correction useEffect** : Chargement conditionnel supprime pour acces global
- **Synchronisation donnees** : Onglets generes correctement des le premier chargement

**Ameliorations UX majeures**
- **Navigation intuitive** : Structure logique avec profil en premier, operateurs groupes
- **Scroll accessible** : Fin des limitations d'acces aux operateurs en bas de liste
- **Design coherent** : Styles uniformes avec variations meaningtiques par type d'onglet
- **Performance optimisee** : Rendu conditionnel et animations GPU-accelerated

**Architecture de donnees**
- **Filtrage employe lie** : Extraction automatique de la liste generale
- **Gestion des cas edge** : Utilisateur sans liaison, admin avec liaison, etc.
- **Persistance des selections** : Onglet actif preserve lors des operations pliage/depliage
- **Validation des donnees** : Verification presence user.employee avant traitement

### Interface et styles

**Design system coherent**
- **Palette couleurs etendue** : Vert emeraude pour lie, violet pour operateurs, bleu pour admin
- **Typographie optimisee** : font-weight 600 pour employe lie, tailles adaptees par contexte
- **Espacement harmonieux** : margins, paddings et gaps calibres pour hierarchie visuelle
- **Effets de profondeur** : box-shadow et backdrop-filter pour separation des niveaux

**Animations et transitions**
- **Duree calibree** : 0.4s pour ouverture/fermeture, 0.3s pour hovers et selections
- **Courbes d'easing** : cubic-bezier pour acceleration/deceleration naturelle
- **Transform coordonnees** : translateX, translateY, rotate pour interactions fluides
- **Opacity et scale** : Effets de fondu et redimensionnement coordonnes

---

## Version 1.2.0 - Liaison Employé-Utilisateur (12 novembre 2025)

### Nouvelle fonctionnalité majeure : Liaison Employé-Utilisateur

**Système de liaison personnalisé**
- **Interface d'administration** : Nouvel onglet pour lier les utilisateurs aux employés
- **Extraction automatique** : Les employés sont extraits automatiquement du fichier Excel
- **Liaison par email** : Sélection d'un utilisateur et d'un employé pour créer la liaison
- **Accès personnalisé** : Chaque utilisateur lié ne voit que son onglet employé
- **Gestion des permissions** : Les admins voient tous les employés, les utilisateurs leur seul employé

**Onglets dynamiques par employé**
- **Génération automatique** : Onglets créés automatiquement depuis les données Excel
- **Format intelligent** : Affichage "CODE-Nom Prénom" (ex: FRCO1-Francis CORTEZ)
- **Filtrage par rôle** : Admin voit tous, utilisateur standard voit le sien uniquement
- **Navigation intuitive** : Onglets intégrés dans la sidebar existante
- **Mise à jour en temps réel** : Synchronisation automatique avec les données Excel

**API de gestion des liaisons**
- **GET /api/admin/employee-link** : Récupérer toutes les liaisons existantes
- **POST /api/admin/employee-link** : Créer une nouvelle liaison employé-utilisateur  
- **DELETE /api/admin/employee-link** : Supprimer une liaison existante
- **Validation sécurisée** : Vérification des permissions administrateur
- **Gestion d'erreurs** : Messages clairs en cas de conflit ou erreur

### Améliorations UI/UX

**Interface administrateur enrichie**
- **Nouvel onglet "Liaison Employé"** : Interface dédiée dans le panel admin
- **Sélecteurs intelligents** : Dropdowns avec utilisateurs non liés et employés disponibles
- **Tableau des liaisons** : Affichage clair des connexions existantes
- **Actions rapides** : Boutons de suppression avec confirmation
- **Design cohérent** : Intégration parfaite avec l'interface existante

**Sidebar améliorée**
- **Onglets plus grands** : Taille augmentée pour une meilleure lisibilité
- **Espacement optimisé** : Padding et margins ajustés (16px→20px vertical)
- **Police agrandie** : Taille de police augmentée (14px→15px)
- **Hauteur uniforme** : min-height: 52px pour tous les onglets
- **Amélioration visuelle** : Gap et styles optimisés

### Améliorations techniques

**Modèle utilisateur étendu**
- **Champ employee** : Nouveau sous-document avec id, name, linked
- **Persistance MongoDB** : Stockage sécurisé des liaisons
- **Validation des données** : Contrôles d'intégrité côté serveur
- **Migration automatique** : Compatibilité avec les utilisateurs existants

**JWT enrichi**
- **Support dual uid/sub** : Compatibilité étendue pour l'authentification
- **Champ email ajouté** : Identification robuste des utilisateurs
- **Session persistante** : Maintien des liaisons employé entre les sessions
- **Sécurité renforcée** : Validation des tokens avec données employé

**Extraction intelligente des employés**
- **Parsing avancé** : Identification automatique des colonnes employé
- **Déduplication** : Élimination des doublons par clé unique
- **Nettoyage des données** : Normalisation des noms et codes
- **Performance optimisée** : Cache des employés extraits

### 🛠 Corrections et optimisations

**Logique de filtrage des onglets**
- **Correction majeure** : Les utilisateurs voient maintenant leur onglet employé
- **Filtrage intelligent** : Admin = tous, Utilisateur = son employé uniquement
- **Synchronisation** : Mise à jour temps réel des onglets après liaison
- **Gestion des états** : Onglets visibles/masqués selon les permissions

**Stabilité et performance**
- **Gestion d'erreurs robuste** : Cas d'edge couverts
- **Validation côté client/serveur** : Double contrôle des données
- **Optimisation requêtes** : Moins d'appels API redondants
- **Mémoire optimisée** : Nettoyage des données inutilisées

---

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