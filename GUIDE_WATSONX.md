# 🔗 Guide d'Intégration Watsonx

## ✅ Ce qui a été créé

### Fichiers créés

1. **`watsonx-config.js`** : Configuration Watsonx avec gestion des credentials
2. **`watsonx-service.js`** : Service d'accès au dataset Watsonx
3. **`dashboard.html`** : Dashboard complet avec visualisations
4. **`dashboard.js`** : Logique du dashboard avec Chart.js

### Modifications

1. **`manifest.json`** : 
   - Ajout des permissions pour watsonx.cloud.ibm.com
   - Ajout de `options_page` pour le dashboard
   - Ajout des fichiers watsonx dans `web_accessible_resources`

2. **`background.js`** :
   - Intégration Watsonx avec fallback local
   - Conversion des données Watsonx en format modèle

---

## 🚀 Configuration Initiale

### Étape 1 : Configurer Watsonx dans le Dashboard

1. **Ouvrir le dashboard** :
   - Clic droit sur l'icône de l'extension → "Options"
   - Ou : `chrome://extensions/` → Track Sustainability → "Options"

2. **Remplir la configuration** :
   - **API Key** : Votre clé API Watsonx
   - **API URL** : La région (ex: `https://us-south.ml.cloud.ibm.com`)
   - **Project ID** : L'ID de votre projet Watsonx
   - **Instance ID** : (Optionnel) L'ID de l'instance

3. **Tester la connexion** :
   - Cliquer sur "🔍 Tester la Connexion"
   - Vérifier que la connexion réussit

4. **Sauvegarder** :
   - Cliquer sur "💾 Sauvegarder Configuration"

### Étape 2 : Vérifier le Dataset

Le dataset doit être importé dans Watsonx avec le nom :
- `llm-inference-energy-consumption`

Ou contenant `llm-inference` dans le nom.

---

## 📊 Utilisation du Dashboard

### Onglets disponibles

1. **📊 Vue d'ensemble**
   - Statistiques globales
   - Graphiques comparatifs
   - Total des mesures

2. **🤖 Modèles**
   - Comparaison des modèles LLM
   - Filtres par hardware et taille
   - Graphiques énergie par token
   - Tableau comparatif

3. **💻 GPUs/Hardware**
   - Comparaison des types de hardware
   - Filtres par modèle
   - Graphiques consommation énergétique
   - Tableau comparatif

4. **⚡ Mix Énergétique**
   - Comparaison des pays
   - Impact CO₂ selon le mix énergétique
   - Graphiques d'émissions
   - Filtres par modèle

5. **⚙️ Configuration**
   - Configuration Watsonx
   - Test de connexion
   - Sauvegarde des paramètres

---

## 🔧 Fonctionnalités

### Comparaison des Modèles

- **Énergie par token** : Comparaison de la consommation énergétique
- **Filtres** : Par hardware, par taille de modèle
- **Tableau** : Vue détaillée avec toutes les métriques

### Comparaison des GPUs

- **Consommation moyenne** : Par type de hardware
- **Modèles testés** : Quels modèles ont été testés sur chaque hardware
- **Nombre de tests** : Volume de données par hardware

### Comparaison des Mix Énergétiques

- **Impact CO₂ par pays** : Visualisation selon le mix énergétique
- **Comparaison** : Entre différents pays (Suède, France, Chine, etc.)
- **Filtres** : Par modèle pour voir l'impact spécifique

---

## 🐛 Dépannage

### Le dashboard affiche "Configuration Watsonx requise"

**Solution** :
1. Aller dans l'onglet Configuration
2. Remplir les champs requis (API Key, Project ID)
3. Tester la connexion
4. Sauvegarder

### Erreur "Service Watsonx non disponible"

**Solutions** :
1. Vérifier que `watsonx-service.js` est bien chargé
2. Vérifier la console pour les erreurs
3. Vérifier les permissions dans `manifest.json`
4. Recharger l'extension

### Le dataset n'est pas trouvé

**Solutions** :
1. Vérifier que le dataset est bien importé dans Watsonx
2. Vérifier que le nom contient `llm-inference`
3. Vérifier les permissions du projet Watsonx
4. Vérifier le Project ID

### Les graphiques ne s'affichent pas

**Solutions** :
1. Vérifier que Chart.js est chargé (CDN)
2. Vérifier la console pour les erreurs
3. Vérifier que les données sont bien chargées
4. Actualiser la page

---

## 📚 Structure des Données

### Format attendu du Dataset Watsonx

Le dataset doit contenir les colonnes suivantes :
- `model_name` ou `model` : Nom du modèle
- `hardware_type` : Type de hardware (laptop, workstation, server)
- `prompt_token_length` : Longueur du prompt en tokens
- `response_token_length` : Longueur de la réponse en tokens
- `energy_consumption_llm_total` : Consommation énergétique totale (Joules)

### Format des Statistiques Sauvegardées

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "stats": {
    "requests": 150,
    "tokens": 50000,
    "co2Grams": 0.5
  },
  "metadata": {
    "range": "day",
    "date": "2024-01-15"
  }
}
```

---

## 🔐 Sécurité

### Credentials

- Les credentials sont stockés dans `chrome.storage.local`
- Ne jamais commiter les credentials dans le code
- Utiliser des variables d'environnement pour le développement

### Permissions

L'extension nécessite :
- `storage` : Pour sauvegarder la configuration
- `host_permissions` : Pour accéder à Watsonx API

---

## 🚀 Prochaines Étapes

### Améliorations possibles

1. **Analyses temporelles** :
   - Graphiques par jour/mois/année
   - Tendances et projections
   - Comparaisons temporelles

2. **Export de données** :
   - Export CSV/JSON
   - Rapports PDF
   - Partage de visualisations

3. **Multi-utilisateurs** :
   - Statistiques par utilisateur
   - Comparaison entre équipes
   - Dashboard admin

---

## 📞 Support

Pour toute question ou problème :
1. Vérifier la console du navigateur
2. Vérifier les logs du service worker
3. Tester la connexion Watsonx
4. Vérifier la documentation Watsonx

---

**Note** : Le dashboard utilise Chart.js pour les visualisations. Assurez-vous d'avoir une connexion internet pour charger la bibliothèque depuis le CDN.

