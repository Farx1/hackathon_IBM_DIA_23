# 🔧 Correction du Problème de Scroll - Messages Doublons

## 🐛 Problème Identifié

Lors du scroll dans une conversation, les anciennes requêtes étaient re-détectées et ajoutées plusieurs fois aux statistiques. Cela causait :
- ❌ Comptage multiple des mêmes messages
- ❌ Calculs CO2 incorrects (surestimés)
- ❌ Statistiques faussées

## ✅ Solution Implémentée

### 1. **Système de Déduplication Persistant**

**Avant** : Les messages traités étaient stockés uniquement en mémoire (Set)
- Perdus lors du rechargement
- Pas de protection contre les messages lors du scroll

**Après** : Double système de déduplication
- **Mémoire** (`processedMessages`) : Pour les performances (rapide)
- **Persistant** (`processedMessagesPersistent`) : Stocké dans `chrome.storage.local`
- Les messages sont sauvegardés par conversation et persistent même après rechargement

### 2. **Hash Stable Basé sur le Contenu**

**Avant** : Hash incluant un timestamp (changeait à chaque vérification)
```javascript
const hash = `${role}-${textHash}-${timestamp}`; // ❌ Timestamp changeant
```

**Après** : Hash basé uniquement sur le contenu (stable)
```javascript
const hash = `${conversationId}-${role}-${contentHash}-${messageId}`; // ✅ Stable
```

**Avantages** :
- Le même message a toujours le même hash
- Fonctionne même si le message est déplacé dans le DOM lors du scroll
- Inclut l'ID de conversation pour éviter les collisions

### 3. **ID de Conversation Unique**

Chaque conversation a maintenant un ID unique basé sur :
- L'URL de la conversation (si disponible)
- Sinon, un hash de l'URL complète

**Avantages** :
- Les messages sont isolés par conversation
- Évite les collisions entre différentes conversations
- Permet de charger les messages déjà traités pour une conversation spécifique

### 4. **Vérification de Tous les Messages**

**Avant** : Vérifiait seulement les messages après `lastMessageCount`
```javascript
for (let i = lastMessageCount; i < messages.length; i++) { // ❌ Ignore les messages anciens
```

**Après** : Vérifie TOUS les messages visibles
```javascript
for (const messageEl of messages) { // ✅ Vérifie tous les messages
  if (!processedMessages.has(hash) && !processedMessagesPersistent.has(hash)) {
    // Nouveau message
  }
}
```

**Avantages** :
- Détecte correctement les nouveaux messages même lors du scroll
- Ignore les messages déjà traités, même s'ils réapparaissent

### 5. **Détection des Changements d'URL**

Détection automatique des changements d'URL (nouvelle conversation) :
- Réinitialise les compteurs
- Charge les messages déjà traités pour la nouvelle conversation
- Fonctionne avec les Single Page Applications (SPAs)

### 6. **Nettoyage Automatique**

Nettoyage automatique toutes les 5 minutes :
- Garde seulement les 10 conversations les plus récentes
- Limite à 1000 messages par conversation
- Évite le stockage excessif

## 🔄 Flux de Fonctionnement

```
1. Page chargée
   ↓
2. Génération ID conversation
   ↓
3. Chargement messages déjà traités (depuis storage)
   ↓
4. Observation DOM
   ↓
5. Détection nouveau message
   ↓
6. Génération hash stable
   ↓
7. Vérification dans mémoire + persistant
   ↓
8. Si nouveau → Traitement + Sauvegarde
   Si existant → Ignoré ✅
```

## 📊 Résultat

| Aspect | Avant | Après |
|--------|-------|-------|
| **Scroll** | ❌ Messages re-détectés | ✅ Messages ignorés |
| **Déduplication** | ⚠️ Mémoire uniquement | ✅ Mémoire + Persistant |
| **Hash** | ⚠️ Avec timestamp | ✅ Basé sur contenu |
| **Conversation** | ⚠️ Pas d'isolation | ✅ ID unique par conversation |
| **Précision** | ⚠️ Comptage multiple | ✅ Comptage unique |

## 🧪 Test

Pour tester la correction :

1. **Ouvrir une conversation** sur ChatGPT/Claude/Gemini
2. **Envoyer quelques messages** et vérifier les statistiques
3. **Scroll vers le haut** pour voir les anciens messages
4. **Vérifier la console** : Vous devriez voir `⏭️ Message déjà traité, ignoré`
5. **Vérifier les statistiques** : Elles ne devraient pas augmenter

## 📝 Fichiers Modifiés

- ✅ `client/public/content.js` : 
  - Ajout système de déduplication persistant
  - Hash stable basé sur contenu
  - ID de conversation
  - Détection changements d'URL
  - Nettoyage automatique

## ⚙️ Configuration

Le système stocke les messages traités dans :
```javascript
chrome.storage.local.processedMessagesMap = {
  "conv-abc123": ["hash1", "hash2", ...],
  "conv-def456": ["hash3", "hash4", ...]
}
```

**Limites** :
- 1000 messages maximum par conversation
- 10 conversations maximum conservées
- Nettoyage automatique toutes les 5 minutes

---

✅ **Le problème de scroll est maintenant résolu ! Les messages ne seront plus comptés plusieurs fois.**

