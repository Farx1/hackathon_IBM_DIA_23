# 🚀 Guide de démarrage rapide - Cursor IDE

## Installation et configuration

### 1. Ouvrir le projet dans Cursor

```bash
# Cloner ou ouvrir le dossier du projet
cd track-sustainability-extension
```

Puis dans Cursor : `File` → `Open Folder` → Sélectionner `track-sustainability-extension`

### 2. Installer les dépendances (optionnel)

```bash
npm install
# ou
pnpm install
```

**Note** : Les dépendances npm ne sont nécessaires que pour les scripts de build. L'extension fonctionne sans installation.

## 🎯 Commandes disponibles

### Extension Chrome

```bash
# Afficher les instructions d'installation
npm run extension:install

# Créer le package ZIP
npm run extension:build

# Packager pour distribution
npm run extension:package

# Mode watch (surveille les changements)
npm run extension:watch
```

### Application web (serveur de dev)

```bash
# Démarrer le serveur de développement
npm run dev

# Build de production
npm run build

# Vérifier TypeScript
npm run check
```

## 📁 Structure du projet

```
track-sustainability-extension/
├── client/public/              ← Extension Chrome (fichiers principaux)
│   ├── manifest.json          ← Configuration
│   ├── popup.html/js          ← Interface popup
│   ├── content.js             ← Détection conversations
│   ├── background.js          ← Service worker
│   ├── predictor.js           ← Modèle ML
│   ├── data/                  ← Données (modèle + CO₂)
│   └── icon-*.png             ← Icônes
│
├── dist/                       ← Packages générés
│   └── track-sustainability-extension.zip
│
├── docs/                       ← Visualisations ML
│
├── README.md                   ← Documentation complète
├── INSTALLATION.md             ← Guide d'installation
├── CURSOR_GUIDE.md             ← Ce fichier
└── package.json                ← Scripts npm
```

## 🔧 Développement de l'extension

### Workflow recommandé

1. **Modifier les fichiers** dans `client/public/`
   - `popup.html/js` pour l'interface
   - `content.js` pour la détection
   - `background.js` pour les calculs
   - `predictor.js` pour le modèle

2. **Recharger l'extension** dans Chrome
   - Aller sur `chrome://extensions/`
   - Cliquer sur le bouton 🔄 de l'extension

3. **Tester** sur une plateforme LLM
   - Ouvrir chat.openai.com, claude.ai ou gemini.google.com
   - Envoyer un message
   - Vérifier le popup

### Hot-reload automatique

Pour surveiller les changements :

```bash
npm run extension:watch
```

Cela affiche un message à chaque modification de fichier dans `client/public/`.

## 🎨 Éditer l'interface (popup)

### Fichiers à modifier

- **HTML** : `client/public/popup.html`
- **CSS** : Intégré dans `popup.html` (balise `<style>`)
- **JavaScript** : `client/public/popup.js`

### Exemple : Changer la couleur du gradient

Dans `popup.html`, ligne ~15 :

```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

Remplacer par vos couleurs préférées.

### Exemple : Ajouter un nouveau pays

Dans `client/public/data/carbon_intensity.json` :

```json
"XX": {
  "name": "Votre Pays",
  "intensity": 123,
  "mix": "Description du mix énergétique"
}
```

Puis dans `popup.html`, ajouter l'option dans le `<select>`.

## 🧪 Déboguer l'extension

### Console du popup

1. Clic droit sur l'icône de l'extension
2. **Inspecter la vue popup**
3. Onglet **Console** pour voir les logs

### Console du content script

1. Ouvrir les DevTools (F12) sur la page LLM
2. Onglet **Console**
3. Chercher les messages `🌱 Track Sustainability`

### Console du background script

1. Aller sur `chrome://extensions/`
2. Trouver l'extension
3. Cliquer sur **Service worker** (lien bleu)
4. Onglet **Console**

### Vérifier le storage

1. Inspecter la vue popup
2. Onglet **Application**
3. **Storage** → **Local Storage** → `chrome-extension://...`
4. Voir `currentSession`, `totalStats`, etc.

## 📊 Analyser les données ML

Les scripts Python d'analyse sont dans `/home/ubuntu/track-sustainability/` :

```bash
# Aller dans le dossier d'analyse
cd /home/ubuntu/track-sustainability

# Explorer le dataset
python3 01_explore_dataset.py

# Nettoyer et analyser
python3 02_clean_and_eda.py

# Entraîner le modèle
python3 03_build_model.py

# Exporter en JavaScript
python3 04_export_model_js.py
```

Les visualisations sont dans `track-sustainability/visualizations/`.

## 🔄 Mettre à jour le modèle

Si vous modifiez le modèle ML :

1. Éditer `track-sustainability/03_build_model.py`
2. Réentraîner : `python3 03_build_model.py`
3. Exporter : `python3 04_export_model_js.py`
4. Les fichiers dans `client/public/data/` sont automatiquement mis à jour
5. Recharger l'extension dans Chrome

## 📦 Créer un package pour distribution

```bash
# Créer le ZIP
npm run extension:package

# Le fichier est dans dist/track-sustainability-extension.zip
```

Vous pouvez ensuite :
- Le partager directement
- Le soumettre au Chrome Web Store
- Le distribuer en interne

## 🐛 Problèmes courants

### L'extension ne se charge pas

**Solution** : Vérifier que tous les fichiers sont présents dans `client/public/` :
- manifest.json
- popup.html, popup.js
- content.js, background.js
- predictor.js
- data/model_simplified.json
- data/carbon_intensity.json
- icon-16.png, icon-48.png, icon-128.png

### Les statistiques ne se mettent pas à jour

**Solution** :
1. Vérifier la console du background script
2. Vérifier que le content script est injecté (console de la page)
3. Recharger l'extension
4. Actualiser la page LLM

### Erreur "Cannot find module"

**Solution** : L'extension n'utilise pas de modules npm. Si vous voyez cette erreur, c'est que vous essayez d'utiliser des imports ES6. Utilisez uniquement du JavaScript vanilla dans les fichiers de l'extension.

## 💡 Conseils pour Cursor

### Utiliser l'IA de Cursor

1. **Cmd/Ctrl + K** : Éditer du code avec l'IA
2. **Cmd/Ctrl + L** : Chat avec l'IA
3. Sélectionner du code et demander :
   - "Explique ce code"
   - "Ajoute des commentaires"
   - "Optimise cette fonction"
   - "Corrige les bugs"

### Extensions Cursor recommandées

- **ESLint** : Linting JavaScript
- **Prettier** : Formatage du code
- **Chrome Extension Kit** : Snippets pour extensions Chrome
- **JSON** : Validation des fichiers JSON

### Raccourcis utiles

- **Cmd/Ctrl + P** : Recherche rapide de fichiers
- **Cmd/Ctrl + Shift + F** : Recherche dans tout le projet
- **Cmd/Ctrl + B** : Toggle sidebar
- **Cmd/Ctrl + J** : Toggle terminal

## 🎯 Prochaines étapes

1. **Tester l'extension** sur différentes plateformes
2. **Personnaliser l'interface** selon vos préférences
3. **Ajouter de nouvelles fonctionnalités** (voir todo.md)
4. **Améliorer le modèle ML** avec plus de données
5. **Partager votre travail** avec la communauté

## 📚 Ressources

- [Documentation Chrome Extensions](https://developer.chrome.com/docs/extensions/)
- [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

## 📧 Support

Pour toute question :
- Consulter `README.md` pour la documentation complète
- Vérifier `INSTALLATION.md` pour les problèmes d'installation
- Contacter : hernan-camilo.carrillo-lindado@capgemini.com

---

**Bon développement ! 🚀**
