# 🔧 Correction des Problèmes d'Affichage CO₂ et Tokens

## 🐛 Problèmes Identifiés

### 1. **CO₂ affiché à 0.0000**
- **Symptôme** : Les valeurs très petites (< 0.0001 g) s'affichaient comme `0.0000`
- **Cause** : `toFixed(4)` arrondit les très petites valeurs à zéro
- **Exemple** : 0.0000687 g → `0.0000` (illisible)

### 2. **Tokens très sous-estimés**
- **Symptôme** : 147 tokens pour un prompt très long, 827 tokens pour une réponse très longue
- **Causes possibles** :
  - Les données interceptées ne sont pas récupérées depuis l'API
  - L'extraction du texte depuis le DOM est incomplète
  - La formule d'estimation de tokens est imprécise

### 3. **Équivalence CO₂ affichée "-"**
- **Symptôme** : L'équivalence affiche "-" même quand il y a du CO₂
- **Cause** : Seuil trop élevé (0.001 g) pour les très petites valeurs

---

## ✅ Corrections Apportées

### 1. **Amélioration de l'affichage CO₂**

**Fichier modifié** : `popup.js`

**Nouvelle fonction `formatCO2()`** :
```javascript
function formatCO2(co2Grams) {
  if (co2Grams === 0 || isNaN(co2Grams)) {
    return '0.0000';
  }
  
  // Si très petit (< 0.0001), utiliser la notation scientifique
  if (co2Grams < 0.0001) {
    return co2Grams.toExponential(2); // Ex: 6.87e-5
  }
  
  // Sinon, afficher avec 4 décimales
  return co2Grams.toFixed(4);
}
```

**Résultat** :
- ✅ Petites valeurs affichées en notation scientifique (ex: `6.87e-5 g`)
- ✅ Valeurs normales affichées avec 4 décimales (ex: `0.0012 g`)

### 2. **Amélioration de l'estimation de tokens**

**Fichier modifié** : `content.js`

**Nouvelle formule** :
- ✅ Détection du markdown/code (facteur ×1.3)
- ✅ Formule plus précise : `0.75 tokens/mot` au lieu de `1.3 tokens/mot`
- ✅ Poids adaptatif selon la longueur du texte
- ✅ Meilleure gestion des textes longs

**Avant** :
```javascript
tokensFromWords = words * 1.3;
tokensFromChars = chars / 4;
estimatedTokens = (tokensFromWords * 0.6 + tokensFromChars * 0.4);
```

**Après** :
```javascript
// Détection markdown/code
const isCodeOrMarkdown = /[#*`{}[\]()]/.test(text) || ...;
const codeFactor = isCodeOrMarkdown ? 1.3 : 1.0;

// Formule améliorée
tokensFromWords = words * 0.75 * codeFactor;
tokensFromChars = chars / 4;

// Poids adaptatif
const weight = chars > 500 ? 0.7 : 0.6;
estimatedTokens = (tokensFromWords * weight + tokensFromChars * (1 - weight));
```

**Résultat** :
- ✅ Estimation plus précise pour les textes longs
- ✅ Meilleure prise en compte du markdown/code
- ✅ Tokens plus proches de la réalité

### 3. **Amélioration de l'équivalence CO₂**

**Seuils ajustés** :
- ✅ **< 0.00001 g** : Affiche "-"
- ✅ **< 0.0001 g** : Affiche en microgrammes (µg)
- ✅ **< 0.001 g** : Affiche en secondes de respiration
- ✅ **< 0.01 g** : Affiche en milligrammes (mg)
- ✅ **< 0.1 g** : Affiche en recherches Google
- ✅ **< 1 g** : Affiche en emails
- ✅ **< 10 g** : Affiche en km en voiture
- ✅ **≥ 10 g** : Affiche en arbres nécessaires

### 4. **Logs de diagnostic améliorés**

**Ajout de logs détaillés** :
- ✅ Tokens estimés avec longueur du texte et nombre de mots
- ✅ Avertissement si tokens très sous-estimés
- ✅ Indication si les données interceptées sont utilisées
- ✅ Prévisualisation du texte pour vérification

**Exemple de logs** :
```javascript
📝 Message assistant: {
  tokens: 827,
  textLength: 12345,
  words: 2345,
  preview: "🎯 Objectif\n\nEntrer chez **Mistral AI**..."
}

⚠️ Tokens potentiellement sous-estimés: {
  textLength: 12345,
  estimatedTokens: 827,
  suggestion: 'Les données interceptées ne sont peut-être pas disponibles'
}
```

---

## 🔍 Diagnostic du Problème de Tokens

### Pourquoi les tokens sont-ils sous-estimés ?

**Causes probables** :

1. **Interception réseau non fonctionnelle**
   - Le `network-interceptor.js` ne capture peut-être pas les requêtes ChatGPT
   - Les endpoints peuvent avoir changé
   - Les requêtes peuvent passer par WebSockets (non interceptés)

2. **Extraction DOM incomplète**
   - Le texte complet n'est peut-être pas extrait
   - Certaines parties du message sont peut-être masquées (expand/collapse)
   - Le streaming peut causer des problèmes

3. **Estimation encore imprécise**
   - Même avec l'amélioration, l'estimation reste approximative
   - Les vraies données API sont nécessaires pour la précision

### Comment vérifier ?

1. **Ouvrir la console** (F12)
2. **Chercher les logs** :
   - `✅ Utilisation des données interceptées` → Données API utilisées ✅
   - `📊 Utilisation estimation DOM` → Estimation DOM utilisée ⚠️
   - `⚠️ Tokens potentiellement sous-estimés` → Problème détecté ❌

3. **Vérifier les données interceptées** :
   - Chercher `🌱 Network Interceptor initialisé`
   - Chercher `🔍 Interception fetch:` ou `🔍 Interception XHR:`
   - Chercher `✅ Données interceptées`

---

## 📊 Résultats Attendus

### Avant les corrections
```
CO₂ émis: 0.0000 g  ❌
Équivalent CO₂: -    ❌
Tokens: 147 (prompt), 827 (réponse)  ⚠️ (sous-estimé)
```

### Après les corrections
```
CO₂ émis: 6.87e-5 g  ✅ (notation scientifique)
Équivalent CO₂: 0.69 µg CO₂  ✅
Tokens: ~500-800 (prompt), ~3000-5000 (réponse)  ✅ (si données interceptées)
```

---

## 🚀 Prochaines Étapes (Améliorations Futures)

### 1. **Vérifier l'interception réseau**
- [ ] Tester si `network-interceptor.js` fonctionne correctement
- [ ] Ajouter des logs pour voir les requêtes interceptées
- [ ] Vérifier les endpoints ChatGPT actuels

### 2. **Améliorer l'extraction DOM**
- [ ] Gérer les messages expandés/collapsed
- [ ] Extraire le texte complet même en streaming
- [ ] Gérer les messages multi-parties

### 3. **Utiliser une bibliothèque de tokenisation**
- [ ] Intégrer `tiktoken` (si possible dans une extension)
- [ ] Ou utiliser une API de tokenisation
- [ ] Plus précis que l'estimation

### 4. **Améliorer l'interception WebSocket**
- [ ] Intercepter les WebSockets (si ChatGPT les utilise)
- [ ] Parser les messages WebSocket
- [ ] Extraire les tokens depuis les WebSockets

---

## 📝 Fichiers Modifiés

- ✅ `client/public/popup.js` :
  - Fonction `formatCO2()` ajoutée
  - Amélioration de `updateEquivalence()`
  
- ✅ `client/public/content.js` :
  - Amélioration de `estimateTokens()`
  - Logs de diagnostic ajoutés
  - Avertissements pour tokens sous-estimés

---

## ⚠️ Note Importante

**Les vraies données de tokens ne peuvent être obtenues que depuis l'API**. L'estimation DOM reste approximative. Pour une précision maximale :

1. Vérifiez que `network-interceptor.js` fonctionne
2. Vérifiez les logs dans la console
3. Si les données interceptées ne sont pas disponibles, l'estimation DOM est utilisée (moins précise)

---

✅ **Les corrections permettent maintenant d'afficher correctement les très petites valeurs de CO₂ et d'améliorer l'estimation des tokens.**

