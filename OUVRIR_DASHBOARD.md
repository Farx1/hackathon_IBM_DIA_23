# 🚀 Comment Ouvrir le Dashboard

## Méthode 1 : Depuis l'Extension (Recommandé)

1. **Ouvrir Chrome**
2. **Cliquer sur l'icône de l'extension** 🌱 dans la barre d'outils
3. **Dans le popup**, cliquer sur le bouton **"📊 Ouvrir le Dashboard Analytics"**
4. Le dashboard s'ouvre dans un nouvel onglet

## Méthode 2 : Depuis la Page des Extensions

1. Aller dans `chrome://extensions/`
2. Trouver **"Track Sustainability - CO₂ Impact Tracker for LLMs"**
3. Cliquer sur **"Options"** ou **"Détails"** → **"Options de l'extension"**
4. Le dashboard s'ouvre

## Méthode 3 : URL Directe

1. Ouvrir un nouvel onglet dans Chrome
2. Taper dans la barre d'adresse :
   ```
   chrome-extension://[EXTENSION_ID]/dashboard.html
   ```
   
   Pour trouver l'ID de l'extension :
   - Aller dans `chrome://extensions/`
   - Activer le "Mode développeur"
   - L'ID s'affiche sous le nom de l'extension

## Méthode 4 : Script PowerShell (Automatique)

Exécuter ce script PowerShell pour ouvrir automatiquement :

```powershell
# Obtenir l'ID de l'extension
$extensions = Get-Content "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Extensions\*.json" | ConvertFrom-Json
# ... (plus complexe)

# Ou simplement ouvrir chrome://extensions/
Start-Process "chrome://extensions/"
```

## Vérification

Le dashboard devrait afficher :
- ✅ En-tête avec titre "Track Sustainability - Dashboard Analytics"
- ✅ 5 onglets : Vue d'ensemble, Modèles, GPUs/Hardware, Mix Énergétique, Configuration
- ✅ Si Watsonx n'est pas configuré : Message dans l'onglet Configuration

## Si le Dashboard ne s'ouvre pas

1. **Vérifier que l'extension est chargée** :
   - Aller dans `chrome://extensions/`
   - Vérifier que l'extension est activée

2. **Vérifier les fichiers** :
   - `dashboard.html` doit être dans `client/public/`
   - `dashboard.js` doit être dans `client/public/`
   - `watsonx-service.js` doit être dans `client/public/`
   - `watsonx-config.js` doit être dans `client/public/`

3. **Vérifier la console** :
   - Ouvrir les outils de développement (F12)
   - Vérifier la console pour les erreurs
   - Vérifier l'onglet Network pour les fichiers manquants

4. **Recharger l'extension** :
   - Dans `chrome://extensions/`
   - Cliquer sur le bouton de rechargement 🔄 de l'extension

