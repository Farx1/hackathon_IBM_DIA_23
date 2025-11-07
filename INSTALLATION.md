# 🚀 Guide d'installation rapide - Track Sustainability

## Installation en 3 étapes

### Étape 1 : Télécharger l'extension

Deux options :

**Option A : Fichier ZIP**
- Télécharger `track-sustainability-extension.zip` depuis le dossier `dist/`
- Extraire le contenu dans un dossier de votre choix

**Option B : Dossier source**
- Utiliser directement le dossier `client/public/`

### Étape 2 : Ouvrir Chrome Extensions

1. Ouvrir Google Chrome
2. Aller dans le menu `⋮` (3 points verticaux en haut à droite)
3. Sélectionner **Plus d'outils** → **Extensions**
4. Ou taper directement dans la barre d'adresse : `chrome://extensions/`

### Étape 3 : Charger l'extension

1. **Activer le mode développeur**
   - Cliquer sur le bouton en haut à droite : **Mode développeur**
   - Il doit être en position ON (bleu)

2. **Charger l'extension**
   - Cliquer sur **"Charger l'extension non empaquetée"**
   - Sélectionner le dossier contenant les fichiers de l'extension :
     - Si ZIP : le dossier extrait
     - Si source : le dossier `client/public/`

3. **Vérifier l'installation**
   - L'extension apparaît dans la liste avec l'icône 🌱
   - Le nom : "Track Sustainability - CO₂ Impact Tracker for LLMs"
   - Version : 1.0.0

## ✅ Test de l'extension

### Test 1 : Ouvrir le popup

1. Cliquer sur l'icône de l'extension dans la barre d'outils Chrome
2. Le popup devrait s'ouvrir avec :
   - En-tête violet avec le titre
   - Statut : "⚠️ Aucune conversation détectée"
   - Statistiques à 0
   - Sélecteur de pays

### Test 2 : Tester sur ChatGPT

1. Aller sur [chat.openai.com](https://chat.openai.com)
2. Se connecter à votre compte
3. Envoyer un message simple : "Bonjour, comment vas-tu ?"
4. Attendre la réponse
5. Ouvrir le popup de l'extension
6. Vérifier que :
   - Statut : "✅ Conversation active détectée"
   - Requêtes : 1
   - Tokens affichés
   - CO₂ calculé

### Test 3 : Changer le mix énergétique

1. Dans le popup, aller dans **Paramètres**
2. Changer le pays (ex: France)
3. Observer que le CO₂ est recalculé automatiquement

## 🔧 Dépannage

### L'extension ne se charge pas

**Problème** : Erreur lors du chargement

**Solutions** :
1. Vérifier que tous les fichiers sont présents :
   - `manifest.json`
   - `popup.html`, `popup.js`
   - `content.js`, `background.js`
   - `predictor.js`
   - Dossier `data/` avec les fichiers JSON
   - Icônes PNG

2. Vérifier la console Chrome :
   - Clic droit sur l'extension → **Inspecter la vue popup**
   - Onglet **Console** pour voir les erreurs

### Aucune conversation détectée

**Problème** : Le statut reste "⚠️ Aucune conversation détectée"

**Solutions** :
1. Vérifier que vous êtes sur un site supporté :
   - chat.openai.com
   - claude.ai
   - gemini.google.com

2. Actualiser la page (F5)

3. Vérifier les permissions :
   - Aller dans `chrome://extensions/`
   - Cliquer sur **Détails** de l'extension
   - Vérifier que les **Autorisations** incluent les sites LLM

4. Vérifier la console du content script :
   - Ouvrir les DevTools (F12) sur la page LLM
   - Onglet **Console**
   - Chercher les messages de Track Sustainability

### Les statistiques ne se mettent pas à jour

**Problème** : Les chiffres restent à 0

**Solutions** :
1. Envoyer un nouveau message sur la plateforme LLM
2. Attendre 2-3 secondes (rafraîchissement automatique)
3. Fermer et rouvrir le popup
4. Vérifier le storage :
   - Ouvrir `chrome://extensions/`
   - Cliquer sur **Détails** → **Inspecter la vue popup**
   - Onglet **Application** → **Storage** → **Local Storage**

### Réinitialiser l'extension

Si l'extension ne fonctionne pas correctement :

1. Ouvrir le popup
2. Cliquer sur **🔄 Réinitialiser les statistiques**
3. Ou supprimer et recharger l'extension :
   - `chrome://extensions/`
   - Cliquer sur **Supprimer**
   - Recharger l'extension (étape 3 ci-dessus)

## 📱 Utilisation quotidienne

### Épingler l'extension

Pour un accès rapide :
1. Cliquer sur l'icône puzzle 🧩 dans la barre d'outils
2. Trouver "Track Sustainability"
3. Cliquer sur l'épingle 📌

### Consulter les statistiques

- **Session actuelle** : Impact de la conversation en cours
- **Total cumulé** : Impact depuis l'installation
- **Équivalence** : Comparaison concrète (km en voiture, emails, etc.)

### Changer le mix énergétique

Sélectionner votre pays pour un calcul plus précis :
- 🇸🇪 Suède : 13 gCO₂/kWh (très faible)
- 🇫🇷 France : 52 gCO₂/kWh (nucléaire)
- 🇺🇸 États-Unis : 369 gCO₂/kWh
- 🌍 Moyenne mondiale : 480 gCO₂/kWh

## 🎯 Prochaines étapes

Une fois l'extension installée et testée :

1. **Utiliser régulièrement** pour prendre conscience de votre impact
2. **Comparer les modèles** : GPT-4 vs GPT-3.5, Claude Opus vs Haiku
3. **Optimiser vos requêtes** : Prompts plus courts, modèles plus petits quand possible
4. **Partager** avec vos collègues et amis

## 📧 Support

En cas de problème :
- Consulter le [README.md](README.md) complet
- Vérifier les logs dans la console Chrome
- Contacter : hernan-camilo.carrillo-lindado@capgemini.com

---

**Bon tracking ! 🌱**
