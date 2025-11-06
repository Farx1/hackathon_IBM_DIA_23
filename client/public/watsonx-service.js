/**
 * Service Watsonx - Accès direct au dataset et analytics
 * Option B : Extension Chrome → Watsonx directement
 */

// Log de démarrage pour vérifier que le script s'exécute
console.log('🔵 watsonx-service.js: Script démarré');
console.log('🔵 Contexte:', typeof window !== 'undefined' ? 'window' : typeof self !== 'undefined' ? 'self' : 'unknown');
console.log('🔵 chrome disponible:', typeof chrome !== 'undefined');
console.log('🔵 chrome.storage disponible:', typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined');

// Vérifier que nous sommes dans un contexte avec chrome.storage
if (typeof chrome === 'undefined' || !chrome.storage) {
  console.error('❌ watsonx-service.js: chrome.storage non disponible');
  console.error('Contexte:', typeof window !== 'undefined' ? 'window' : typeof self !== 'undefined' ? 'self' : 'unknown');
} else {
  console.log('✓ watsonx-service.js: chrome.storage disponible');
}

// Charger la configuration
let watsonxConfig = null;
console.log('🔵 watsonx-service.js: Variables initialisées');

/**
 * Mettre à jour la configuration (pour synchronisation immédiate)
 */
function updateConfig(config) {
  watsonxConfig = config;
  console.log('✓ Configuration Watsonx mise à jour dans le service:', {
    hasApiKey: !!config.apiKey,
    apiKeyLength: config.apiKey ? config.apiKey.length : 0,
    apiKeyPrefix: config.apiKey ? config.apiKey.substring(0, 15) + '...' : 'vide',
    projectId: config.projectId,
    apiUrl: config.apiUrl
  });
}

/**
 * Initialiser le service Watsonx
 */
async function initWatsonxService() {
  try {
    // Charger la configuration depuis storage
    const result = await chrome.storage.local.get(['watsonxConfig']);
    
    console.log('🔍 initWatsonxService - Résultat storage:', {
      hasConfig: !!result.watsonxConfig,
      hasProjectId: !!result.watsonxConfig?.projectId,
      hasApiKey: !!result.watsonxConfig?.apiKey,
      hasConfigInMemory: !!watsonxConfig
    });
    
    // Si pas dans storage, vérifier si on a déjà une config en mémoire
    if (!result.watsonxConfig) {
      if (!watsonxConfig) {
        console.error('❌ Aucune configuration trouvée ni dans storage ni en mémoire');
        throw new Error('Configuration Watsonx non trouvée. Veuillez configurer dans l\'onglet Configuration.');
      } else {
        console.log('⚠️ Configuration non trouvée dans storage, utilisation de la config en mémoire');
      }
    } else {
      watsonxConfig = result.watsonxConfig;
      console.log('✓ Configuration chargée depuis storage');
    }
    
    // Vérifier que les champs requis sont présents
    if (!watsonxConfig.apiKey || !watsonxConfig.projectId) {
      throw new Error('Configuration incomplète. API Key et Project ID requis.');
    }
    
    console.log('✓ Service Watsonx initialisé avec:', {
      apiUrl: watsonxConfig.apiUrl,
      projectId: watsonxConfig.projectId,
      hasApiKey: !!watsonxConfig.apiKey,
      hasDeploymentId: !!watsonxConfig.deploymentId
    });
    
    // Ne plus chercher de datasets - on utilise uniquement le modèle déployé pour les prédictions
    // Les datasets ne sont plus nécessaires
    
    return true;
  } catch (error) {
    console.error('❌ Erreur initialisation Watsonx:', error);
    return false;
  }
}

// Variable pour éviter les appels multiples simultanés à getAuthToken
let tokenRequestInProgress = null;

/**
 * Obtenir le token d'authentification
 * Utilise XMLHttpRequest comme dans l'exemple IBM
 */
async function getAuthToken() {
  // S'assurer que la config est à jour depuis le storage
  if (!watsonxConfig?.apiKey) {
    console.log('🔄 Rechargement de la config depuis storage...');
    const result = await chrome.storage.local.get(['watsonxConfig']);
    if (result.watsonxConfig) {
      watsonxConfig = result.watsonxConfig;
      console.log('✓ Config rechargée depuis storage');
    }
  }
  
  if (!watsonxConfig?.apiKey) {
    throw new Error('API Key Watsonx non configurée');
  }
  
  // Nettoyer agressivement la clé API : supprimer tous les espaces, guillemets, retours à la ligne, etc.
  let apiKey = watsonxConfig.apiKey;
  
  // Convertir en string si ce n'est pas déjà le cas
  if (typeof apiKey !== 'string') {
    apiKey = String(apiKey);
  }
  
  // Supprimer tous les espaces (y compris les espaces insécables)
  apiKey = apiKey.replace(/\s+/g, '');
  
  // Supprimer les guillemets au début et à la fin
  apiKey = apiKey.replace(/^["']+|["']+$/g, '');
  
  // Trim final
  apiKey = apiKey.trim();
  
  if (!apiKey) {
    throw new Error('API Key Watsonx est vide après nettoyage');
  }
  
  // Log pour debug (sans afficher la clé complète)
  console.log('🔑 API Key détectée:', {
    length: apiKey.length,
    startsWith: apiKey.substring(0, 15) + '...',
    endsWith: '...' + apiKey.substring(apiKey.length - 10),
    format: apiKey.startsWith('cpd-apikey-') ? 'cpd-apikey' : (apiKey.startsWith('apikey-') ? 'apikey' : 'autre'),
    hasSpaces: apiKey.includes(' '),
    hasQuotes: apiKey.includes('"') || apiKey.includes("'")
  });
  
 
  
  // Pour IBM Cloud, il faut échanger l'API key contre un token IAM
  // L'API key ne peut pas être utilisée directement comme Bearer token
  // Il faut obtenir un token IAM depuis https://iam.cloud.ibm.com/identity/token
  
  try {
    // Vérifier si on a un token en cache (valide pendant 1 heure)
    const tokenCache = await chrome.storage.local.get(['watsonxIamToken', 'watsonxIamTokenExpiry']);
    if (tokenCache.watsonxIamToken && tokenCache.watsonxIamTokenExpiry && 
        Date.now() < tokenCache.watsonxIamTokenExpiry) {
      console.log('✓ Token IAM réutilisé depuis le cache');
      return tokenCache.watsonxIamToken;
    }
    
    // Si une requête est déjà en cours, attendre qu'elle se termine
    if (tokenRequestInProgress) {
      console.log('⏳ Attente d\'une requête de token en cours...');
      return await tokenRequestInProgress;
    }
    
    // Obtenir un nouveau token IAM en utilisant XMLHttpRequest (comme dans l'exemple IBM)
    console.log('🔄 Obtention d\'un nouveau token IAM...');
    
    // Stocker apiKey et requestBody dans une portée accessible pour les logs d'erreur
    let requestBody = '';
    
    tokenRequestInProgress = new Promise((resolve, reject) => {
      const req = new XMLHttpRequest();
      
      req.addEventListener('load', () => {
        try {
          // Vérifier le statut HTTP
          if (req.status !== 200) {
            let errorMessage = `Erreur HTTP ${req.status}`;
            let errorDetails = '';
            let errorCode = '';
            
            try {
              const errorResponse = JSON.parse(req.responseText);
              errorMessage = errorResponse.error_description || errorResponse.error || errorMessage;
              errorCode = errorResponse.error || '';
              errorDetails = JSON.stringify(errorResponse, null, 2);
            } catch (e) {
              errorMessage = req.responseText ? req.responseText.substring(0, 200) : errorMessage;
              errorDetails = req.responseText || '';
            }
            
            // Log détaillé de l'erreur avec toutes les informations utiles
            console.error('❌ Erreur obtention token IAM:', {
              status: req.status,
              statusText: req.statusText,
              errorCode: errorCode,
              errorMessage: errorMessage,
              responseText: req.responseText?.substring(0, 500),
              fullResponse: req.responseText,
              // Ajouter des infos sur la requête qui a échoué
              requestInfo: {
                url: 'https://iam.cloud.ibm.com/identity/token',
                method: 'POST',
                contentType: 'application/x-www-form-urlencoded',
                apiKeyLength: apiKey.length,
                apiKeyFormat: apiKey.startsWith('cpd-apikey-') ? 'cpd-apikey' : (apiKey.startsWith('apikey-') ? 'apikey' : 'autre'),
                requestBodyLength: requestBody.length,
                requestBodyPreview: requestBody.substring(0, 80) + '...' // Afficher le début du body
              }
            });
            
            // Afficher aussi le body qui a été envoyé (masqué pour sécurité mais utile pour debug)
            console.error('❌ Body envoyé (masqué):', {
              grantType: 'urn:ibm:params:oauth:grant-type:apikey',
              apikeyLength: apiKey.length,
              apikeyPrefix: apiKey.substring(0, 20) + '...',
              bodyLength: requestBody.length,
              bodyStart: requestBody.substring(0, 60) + '...',
              bodyEnd: '...' + requestBody.substring(requestBody.length - 30)
            });
            
            // Messages d'erreur plus explicites selon le code
            if (req.status === 400) {
              if (errorCode === 'invalid_grant' || errorMessage.includes('invalid')) {
                errorMessage = 'Clé API invalide ou expirée. Vérifiez votre clé API dans IBM Cloud.';
              } else if (errorMessage.includes('missing') || errorMessage.includes('required')) {
                errorMessage = 'Paramètres manquants dans la requête. Vérifiez le format de la clé API.';
              } else {
                errorMessage = `Requête mal formée (400): ${errorMessage}`;
              }
            }
            
            reject(new Error(`Erreur HTTP ${req.status}: ${errorMessage}`));
            return;
          }
          
          const tokenResponse = JSON.parse(req.responseText);
          const accessToken = tokenResponse.access_token;
          
          if (!accessToken) {
            throw new Error('Token IAM non reçu dans la réponse');
          }
          
          // Sauvegarder le token en cache (expire dans 1 heure, mais on le met à jour après 50 minutes pour être sûr)
          const expiryTime = Date.now() + (50 * 60 * 1000); // 50 minutes
          chrome.storage.local.set({
            watsonxIamToken: accessToken,
            watsonxIamTokenExpiry: expiryTime
          }).then(() => {
            console.log('✅ Token IAM obtenu avec succès');
            tokenRequestInProgress = null; // Réinitialiser
            resolve(accessToken);
          }).catch(reject);
        } catch (ex) {
          console.error('❌ Erreur parsing token response:', ex);
          console.error('Réponse brute:', req.responseText?.substring(0, 200));
          tokenRequestInProgress = null; // Réinitialiser
          reject(new Error('Erreur parsing token response: ' + ex.message));
        }
      });
      
       req.addEventListener('error', (error) => {
         console.error('❌ Erreur réseau lors de l\'obtention du token IAM:', error);
         console.error('Type d\'erreur:', error.type);
         console.error('Message d\'erreur:', error.message);
         console.error('⚠️ Vérifiez votre connexion internet et que https://iam.cloud.ibm.com est accessible');
         tokenRequestInProgress = null; // Réinitialiser
         reject(new Error('Erreur réseau lors de l\'obtention du token IAM. Vérifiez votre connexion internet et que https://iam.cloud.ibm.com est accessible.'));
       });
      
       req.addEventListener('timeout', () => {
         console.error('❌ Timeout lors de l\'obtention du token IAM (après 30 secondes)');
         console.error('⚠️ La connexion à IBM Cloud IAM prend trop de temps. Vérifiez votre connexion internet.');
         tokenRequestInProgress = null; // Réinitialiser
         reject(new Error('Timeout lors de l\'obtention du token IAM - La connexion à IBM Cloud IAM prend trop de temps. Vérifiez votre connexion internet.'));
       });
       
       // Configurer le timeout AVANT d'ouvrir la requête
       req.timeout = 30000; // 30 secondes de timeout (augmenté pour les connexions lentes)
       
       req.open('POST', 'https://iam.cloud.ibm.com/identity/token');
       
       // Headers exacts comme dans l'exemple IBM
       req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
       req.setRequestHeader('Accept', 'application/json');
       
       // Log avant l'envoi pour diagnostic
       console.log('⏳ Envoi requête token IAM (timeout: 30s)...');
      
      // Construire le body exactement comme dans l'exemple IBM
      // Format: grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=VOTRE_API_KEY
      // IMPORTANT: encodeURIComponent UNIQUEMENT sur la valeur de l'apikey, pas sur tout le body
      // Les caractères spéciaux dans la clé API doivent être encodés, mais pas les paramètres du body
      const grantType = 'urn:ibm:params:oauth:grant-type:apikey';
      const encodedApiKey = encodeURIComponent(apiKey);
      requestBody = `grant_type=${grantType}&apikey=${encodedApiKey}`;
      
      // Log détaillé pour diagnostic - AFFICHER LE BODY COMPLET pour vérification
      console.log('📤 Envoi requête token IAM:', {
        url: 'https://iam.cloud.ibm.com/identity/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        apiKey: {
          raw: apiKey.substring(0, 30) + '...' + apiKey.substring(apiKey.length - 10),
          length: apiKey.length,
          prefix: apiKey.substring(0, 15),
          endsWith: '...' + apiKey.substring(apiKey.length - 10),
          hasSpaces: apiKey.includes(' '),
          hasQuotes: apiKey.includes('"') || apiKey.includes("'")
        },
        requestBody: {
          full: requestBody, // AFFICHER LE BODY COMPLET pour debug
          length: requestBody.length,
          grantTypePart: requestBody.split('&')[0],
          apikeyPart: requestBody.split('&')[1]?.substring(0, 50) + '...'
        }
      });
      
      // Vérification finale avant envoi
      if (!apiKey || apiKey.length < 20) {
        console.error('❌ API Key invalide avant envoi:', {
          apiKey: apiKey ? apiKey.substring(0, 30) + '...' : 'null',
          length: apiKey ? apiKey.length : 0
        });
        tokenRequestInProgress = null;
        reject(new Error('API Key invalide: trop courte ou vide'));
        return;
      }
      
      req.send(requestBody);
    });
    
    return await tokenRequestInProgress;
  } catch (error) {
    tokenRequestInProgress = null; // Réinitialiser en cas d'erreur
    console.error('❌ Erreur obtention token IAM:', error);
    throw new Error(`Impossible d'obtenir le token IAM: ${error.message}`);
  }
}

/**
 * Faire une requête à l'API Watsonx
 */
async function watsonxRequest(endpoint, options = {}) {
  try {
    const token = await getAuthToken();
    
    // Pour les endpoints /v2/assets, /v2/data, etc., utiliser dataplatform.cloud.ibm.com
    // Pour les autres endpoints, utiliser l'URL configurée
    let baseUrl = watsonxConfig.apiUrl || 'https://us-south.ml.cloud.ibm.com';
    
    // Si l'endpoint commence par /v2/ ou /v1/, c'est un endpoint dataplatform
    if (endpoint.startsWith('/v2/') || endpoint.startsWith('/v1/')) {
      // Extraire la région depuis l'URL configurée ou utiliser eu-de par défaut
      const regionMatch = baseUrl.match(/https:\/\/([^.]+)\.(ml|dataplatform)\.cloud\.ibm\.com/);
      const region = regionMatch ? regionMatch[1] : 'eu-de';
      baseUrl = `https://${region}.dataplatform.cloud.ibm.com`;
    }
    
    // Construire l'URL complète
    let url = `${baseUrl}${endpoint}`;
    
    // Ajouter le project_id dans les query params si nécessaire et pas déjà présent
    // Ne pas l'ajouter si le project_id est déjà dans le path (ex: /v2/projects/{project_id}/assets)
    const hasProjectIdInPath = endpoint.includes('projects/') && endpoint.includes(watsonxConfig.projectId);
    // Pour /v2/assets, ajouter project_id comme query param selon la documentation
    if (watsonxConfig.projectId && !hasProjectIdInPath && !url.includes('project_id') && !url.includes('project-id')) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}project_id=${encodeURIComponent(watsonxConfig.projectId)}`;
    }
    
    // Headers requis par Watsonx API
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json', // Forcer une réponse JSON
      ...options.headers
    };
    
    // Ajouter le project_id dans les headers si nécessaire (certaines APIs le demandent)
    // Pour IBM Cloud Platform, X-Project-Id est souvent requis
    if (watsonxConfig.projectId && !headers['X-Project-Id']) {
      headers['X-Project-Id'] = watsonxConfig.projectId;
    }
    
    // Pour les endpoints dataplatform (interface web), ajouter des headers supplémentaires
    if (baseUrl.includes('dataplatform.cloud.ibm.com')) {
      headers['Accept'] = 'application/json';
      headers['X-Requested-With'] = 'XMLHttpRequest'; // Pour indiquer une requête AJAX
      // Pour dataplatform, le token IAM doit être utilisé avec le header Authorization
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('📡 Requête Watsonx:', {
      method: options.method || 'GET',
      url: url, // URL complète pour debug
      baseUrl: baseUrl,
      endpoint: endpoint,
      hasProjectId: !!watsonxConfig.projectId,
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 20) + '...' : 'none'
    });
    
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' // Inclure les cookies si nécessaire pour dataplatform.cloud.ibm.com
    });
    
    // Obtenir le contenu de la réponse avant de vérifier le statut
    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || '';
    
    if (!response.ok) {
      let errorMessage = `Watsonx API Error: ${response.status} - ${responseText.substring(0, 200)}`;
      
      // Essayer de parser l'erreur JSON si possible
      try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch (e) {
        // Ce n'est pas du JSON, on garde le texte brut
      }
      
      throw new Error(errorMessage);
    }
    
    // Si la réponse est HTML au lieu de JSON, essayer d'extraire les données JSON
    if (contentType.includes('text/html') || responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.log('⚠️ Réponse HTML détectée, tentative d\'extraction des données JSON...');
      
      // Pattern 1: Données JSON dans un script tag avec id="__NEXT_DATA__" ou similaire
      const nextDataMatch = responseText.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
      if (nextDataMatch && nextDataMatch[1]) {
        try {
          const data = JSON.parse(nextDataMatch[1]);
          console.log('✅ Données JSON extraites depuis __NEXT_DATA__');
          return data;
        } catch (e) {
          console.log('⚠️ Échec parsing __NEXT_DATA__:', e.message);
        }
      }
      
      // Pattern 2: window.__INITIAL_STATE__ ou window.__APP_STATE__
      const statePatterns = [
        /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/,
        /window\.__APP_STATE__\s*=\s*({[\s\S]*?});/,
        /window\.__DATA__\s*=\s*({[\s\S]*?});/
      ];
      
      for (const pattern of statePatterns) {
        const match = responseText.match(pattern);
        if (match && match[1]) {
          try {
            const data = JSON.parse(match[1]);
            console.log('✅ Données JSON extraites depuis window state');
            return data;
          } catch (e) {
            // Ignorer
          }
        }
      }
      
      // Pattern 3: JSON dans un script tag quelconque (chercher plus agressivement)
      const scriptMatches = responseText.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g);
      for (const match of scriptMatches) {
        const scriptContent = match[1];
        // Chercher des objets JSON dans le script (plusieurs patterns)
        const jsonPatterns = [
          /\{[\s\S]{100,}\}/g, // Objets JSON de plus de 100 caractères
          /\[[\s\S]{100,}\]/g, // Tableaux JSON de plus de 100 caractères
          /"resources"\s*:\s*(\[[\s\S]*?\])/g, // Pattern spécifique pour "resources"
          /"assets"\s*:\s*(\[[\s\S]*?\])/g, // Pattern spécifique pour "assets"
          /"data"\s*:\s*(\[[\s\S]*?\])/g // Pattern spécifique pour "data"
        ];
        
        for (const pattern of jsonPatterns) {
          const matches = scriptContent.matchAll(pattern);
          for (const jsonMatch of matches) {
            try {
              let data;
              if (jsonMatch[1]) {
                // Si c'est un pattern avec capture group, parser directement
                data = JSON.parse(jsonMatch[1]);
              } else {
                // Sinon, parser l'ensemble
                data = JSON.parse(jsonMatch[0]);
              }
              
              // Vérifier si ça ressemble à des données d'assets
              if (data.resources || data.assets || data.data || Array.isArray(data) || 
                  (typeof data === 'object' && data !== null && Object.keys(data).length > 0)) {
                console.log('✅ Données JSON extraites depuis script tag');
                return data;
              }
            } catch (e) {
              // Ignorer
            }
          }
        }
      }
      
      // Pattern 4: Chercher des données JSON dans data-* attributes ou dans des commentaires
      const dataAttrMatch = responseText.match(/data-assets="([^"]+)"/);
      if (dataAttrMatch && dataAttrMatch[1]) {
        try {
          const decoded = decodeURIComponent(dataAttrMatch[1]);
          const data = JSON.parse(decoded);
          console.log('✅ Données JSON extraites depuis data-attribute');
          return data;
        } catch (e) {
          // Ignorer
        }
      }
      
      // Pattern 5: Chercher dans les commentaires HTML
      const commentMatches = responseText.matchAll(/<!--([\s\S]*?)-->/g);
      for (const match of commentMatches) {
        const commentContent = match[1];
        const jsonInComment = commentContent.match(/\{[\s\S]{50,}\}/);
        if (jsonInComment) {
          try {
            const data = JSON.parse(jsonInComment[0]);
            if (data.resources || data.assets || Array.isArray(data)) {
              console.log('✅ Données JSON extraites depuis commentaire HTML');
              return data;
            }
          } catch (e) {
            // Ignorer
          }
        }
      }
      
      // Si aucune donnée JSON n'est trouvée, c'est probablement une page web complète
      // Logger un extrait du HTML pour debug et chercher des indices
      const htmlPreview = responseText.substring(0, 1000);
      console.log('📄 Aperçu de la réponse HTML (premiers 1000 caractères):', htmlPreview);
      
      // Chercher des URLs d'API dans le HTML qui pourraient être les vrais endpoints
      const apiUrlMatches = responseText.matchAll(/https?:\/\/[^"'\s]+(?:api|v[0-9]|data-assets|assets)[^"'\s]*/gi);
      const foundApiUrls = [...apiUrlMatches].map(m => m[0]).filter((url, i, arr) => arr.indexOf(url) === i);
      if (foundApiUrls.length > 0) {
        console.log('🔍 URLs d\'API trouvées dans le HTML:', foundApiUrls.slice(0, 5));
      }
      
      throw new Error(`Réponse HTML reçue au lieu de JSON. L'endpoint ${url} retourne une page web au lieu d'une réponse API JSON. \n\n` +
        `Pour trouver le bon endpoint API:\n` +
        `1. Ouvrez l'interface Watsonx: https://dataplatform.cloud.ibm.com/\n` +
        `2. Ouvrez les outils de développement (F12) → onglet "Network"\n` +
        `3. Naviguez vers la liste des assets dans l'interface\n` +
        `4. Cherchez une requête qui a:\n` +
        `   - Content-Type: application/json (dans les Response Headers)\n` +
        `   - Une réponse JSON (pas HTML)\n` +
        `   - Un nom qui contient "assets", "data", "api", ou "v2"/"v4"\n` +
        `5. Copiez l'URL complète de cette requête et partagez-la\n\n` +
        `Status: ${response.status}`);
    }
    
    // Essayer de parser comme JSON
    try {
      return JSON.parse(responseText);
    } catch (e) {
      // Si ce n'est pas du JSON valide, essayer de lire le texte
      throw new Error(`Réponse non-JSON reçue: ${responseText.substring(0, 200)}...`);
    }
  } catch (error) {
    console.error('❌ Erreur requête Watsonx:', error);
    throw error;
  }
}

/**
 * Trouver tous les datasets liés à llm-inference
 */
async function findDatasets(datasetName = 'llm-inference-energy-consumption') {
  try {
    // Vérifier que la config est chargée
    if (!watsonxConfig) {
      await initWatsonxService();
    }
    
    if (!watsonxConfig || !watsonxConfig.projectId) {
      throw new Error('Configuration Watsonx incomplète. Project ID requis.');
    }
    
    // Essayer plusieurs URLs de base possibles selon la documentation IBM
    // 1. ml.cloud.ibm.com (format standard Watsonx pour inférence)
    // 2. api.{region}.dataplatform.cloud.ibm.com/wx (format Data Platform avec /wx pour prompts, notebooks, etc.)
    // 3. {region}.dataplatform.cloud.ibm.com (format Data Platform avec région)
    // 4. dataplatform.cloud.ibm.com (format Data Platform sans région)
    // 5. api.dataplatform.cloud.ibm.com (format API Data Platform sans région)
    const currentApiUrl = watsonxConfig.apiUrl || 'https://us-south.ml.cloud.ibm.com';
    
    // Extraire la région si présente (ex: eu-de, us-south)
    let region = 'us-south'; // par défaut
    const regionMatch = currentApiUrl.match(/https:\/\/([^.]+)\.ml\.cloud\.ibm\.com/);
    if (regionMatch) {
      region = regionMatch[1];
    }
    
    // Pour les endpoints /projects/, on DOIT utiliser dataplatform.cloud.ibm.com (pas ml.cloud.ibm.com)
    // L'URL validée est: https://eu-de.dataplatform.cloud.ibm.com/projects/{project_id}/assets?context=wx
    const baseUrls = [
      `https://${region}.dataplatform.cloud.ibm.com`, // Format Data Platform avec région (PRIORITAIRE - format de l'interface web validé)
      `https://api.${region}.dataplatform.cloud.ibm.com/wx`, // Format API Data Platform avec /wx
      `https://api.${region}.dataplatform.cloud.ibm.com`, // Format API Data Platform avec région
      'https://dataplatform.cloud.ibm.com', // Format sans région
      'https://api.dataplatform.cloud.ibm.com/wx', // Format API sans région avec /wx
      'https://api.dataplatform.cloud.ibm.com', // Format API sans région
      currentApiUrl // URL originale (ml.cloud.ibm.com) - seulement pour les autres endpoints
    ];
    
    // Retirer les doublons
    const uniqueBaseUrls = [...new Set(baseUrls)];
    
    // Endpoint Watsonx API - essayer plusieurs formats selon la région et la version
    // Formats possibles selon la documentation Watsonx, Watson Studio, et Cloud Pak for Data:
    // - /ml/v4/data_assets (format standard Watsonx)
    // - /v4/data_assets (format alternatif)
    // - /api/v4/data_assets (format API)
    // - /v2/data_assets (format v2 legacy)
    // - /v2/projects/{project_id}/assets (format avec project dans path)
    // - /zen-data/v3/datasets (format Cloud Pak for Data)
    // - /icp4d-api/v1/data_assets (format ICP4D)
    // - /data_assets (format simple)
    // - /assets (format encore plus simple)
    const endpointsToTry = [
      // Format officiel selon documentation IBM Watson Data Platform (PRIORITAIRE ABSOLU)
      `/v2/assets`, // Format officiel: https://<region>.dataplatform.cloud.ibm.com/v2/assets (PRIORITAIRE)
      `/v2/data`, // Format alternatif: https://<region>.dataplatform.cloud.ibm.com/v2/data
      `/v1/data`, // Format v1: https://<region>.dataplatform.cloud.ibm.com/v1/data
      // Formats API REST avec project_id
      `/api/projects/${encodeURIComponent(watsonxConfig.projectId)}/assets`, // Format API REST avec /api/
      `/api/v2/projects/${encodeURIComponent(watsonxConfig.projectId)}/assets`, // Format API REST v2
      `/api/v4/projects/${encodeURIComponent(watsonxConfig.projectId)}/assets`, // Format API REST v4
      `/api/projects/${encodeURIComponent(watsonxConfig.projectId)}/data-assets`, // Format API REST data-assets
      `/api/v2/projects/${encodeURIComponent(watsonxConfig.projectId)}/data-assets`, // Format API REST v2 data-assets
      // Formats web interface (peuvent retourner du HTML)
      `/projects/${encodeURIComponent(watsonxConfig.projectId)}/assets`, // Format assets simple (fonctionne avec context=wx)
      `/projects/${encodeURIComponent(watsonxConfig.projectId)}/data-assets`, // Format data-assets avec tiret
      `/projects/${encodeURIComponent(watsonxConfig.projectId)}/data_assets`, // Format avec underscore
      // Formats API standard
      `/ml/v4/data_assets`,      // Format standard pour Watsonx
      `/v4/data_assets`,         // Format alternatif
      `/v2/projects/${encodeURIComponent(watsonxConfig.projectId)}/assets`, // Format avec project dans path
      `/v2/data_assets`,         // Format v2 (legacy)
      `/api/v4/data_assets`,     // Format API
      `/wx/data_assets`,         // Format avec préfixe /wx (pour Data Platform)
      `/wx/v4/data_assets`,      // Format /wx avec version
      `/wx/ml/v4/data_assets`,  // Format /wx avec ml/v4
      `/v2/projects/${encodeURIComponent(watsonxConfig.projectId)}/connections`, // Format connections avec project
      `/v2/connections`,        // Format connections simple
      `/v4/connections`,        // Format connections v4
      `/ml/v4/connections`,     // Format connections ml/v4
      `/wx/connections`,        // Format connections avec /wx
      `/zen-data/v3/datasets`,   // Format Cloud Pak for Data
      `/zen-data/v3/data_assets`, // Format Cloud Pak for Data assets
      `/icp4d-api/v1/data_assets`, // Format ICP4D
      `/icp4d-api/v1/connections`, // Format ICP4D connections
      `/data_assets`,            // Format simple
      `/assets`,                 // Format encore plus simple
      `/connections`,            // Format connections simple
      `/datasets`                // Format datasets simple
    ];
    
    let response;
    let lastError = null;
    let successfulBaseUrl = null;
    let successfulEndpoint = null;
    
    // Réorganiser les endpoints : /v2/assets en PRIORITÉ ABSOLUE
    const v2AssetsEndpoint = endpointsToTry.find(e => e === '/v2/assets');
    const v2DataEndpoint = endpointsToTry.find(e => e === '/v2/data');
    const v1DataEndpoint = endpointsToTry.find(e => e === '/v1/data');
    const officialEndpoints = [v2AssetsEndpoint, v2DataEndpoint, v1DataEndpoint].filter(Boolean);
    const projectsEndpoints = endpointsToTry.filter(e => e.includes('projects/') && !officialEndpoints.includes(e));
    const otherEndpoints = endpointsToTry.filter(e => !e.includes('projects/') && !officialEndpoints.includes(e));
    
    // Réorganiser les baseUrls : dataplatform en premier (obligatoire pour /v2/assets)
    const dataplatformUrls = uniqueBaseUrls.filter(url => url.includes('dataplatform.cloud.ibm.com'));
    const otherUrls = uniqueBaseUrls.filter(url => !url.includes('dataplatform.cloud.ibm.com'));
    const reorderedBaseUrls = [...dataplatformUrls, ...otherUrls];
    
    // Essayer toutes les combinaisons de baseUrl + endpoint
    for (const baseUrl of reorderedBaseUrls) {
      // Sauvegarder temporairement l'URL de base pour cette tentative
      const originalApiUrl = watsonxConfig.apiUrl;
      watsonxConfig.apiUrl = baseUrl;
      
      // Pour les endpoints /v2/assets, /v2/data, etc., utiliser SEULEMENT dataplatform URLs
      // Pour les autres endpoints, tester selon le type de baseUrl
      const endpointsToTest = baseUrl.includes('dataplatform.cloud.ibm.com')
        ? [...officialEndpoints, ...projectsEndpoints, ...otherEndpoints]  // PRIORITÉ: /v2/assets, puis /projects/, puis autres
        : [...otherEndpoints, ...projectsEndpoints]; // Si pas dataplatform, ne pas tester /v2/assets
      
      for (let i = 0; i < endpointsToTest.length; i++) {
        let endpointBase = endpointsToTest[i];
        
        // Si l'URL de base contient déjà /wx, ne pas ajouter /wx dans l'endpoint
        if (baseUrl.includes('/wx') && endpointBase.startsWith('/wx')) {
          endpointBase = endpointBase.replace(/^\/wx/, '');
        }
        
        // Si l'endpoint contient déjà project_id dans le path, ne pas l'ajouter en query param
        const hasProjectIdInPath = endpointBase.includes('projects/') && endpointBase.includes(watsonxConfig.projectId);
        
        // Construire l'endpoint avec ou sans project_id selon le format
        let endpoint;
        if (hasProjectIdInPath) {
          // Le project_id est déjà dans le path, ne pas l'ajouter en query param
          endpoint = endpointBase;
          // Pour les endpoints web (assets, data-assets), ajouter le context=wx si nécessaire
          // Format validé: /projects/{project_id}/assets?context=wx
          if ((endpoint.includes('/assets') || endpoint.includes('data-assets')) && !endpoint.includes('context=')) {
            endpoint += (endpoint.includes('?') ? '&' : '?') + 'context=wx';
          }
        } else {
          // Ajouter project_id en query param
          endpoint = `${endpointBase}?project_id=${encodeURIComponent(watsonxConfig.projectId)}`;
        }
        
        try {
          const attemptNum = reorderedBaseUrls.indexOf(baseUrl) * endpointsToTest.length + i + 1;
          const totalAttempts = reorderedBaseUrls.length * endpointsToTest.length;
          console.log(`🔍 [${attemptNum}/${totalAttempts}] Essai: ${baseUrl}${endpointBase}`);
          response = await watsonxRequest(endpoint);
          console.log(`✅ SUCCÈS! URL de base: ${baseUrl}, Endpoint: ${endpointBase}`);
          successfulBaseUrl = baseUrl;
          successfulEndpoint = endpointBase;
          break; // Succès, sortir des deux boucles
        } catch (error) {
          lastError = error;
          const errorMsg = error.message.toLowerCase();
          const is404 = errorMsg.includes('404') || errorMsg.includes('not found');
          const is400 = errorMsg.includes('400') || errorMsg.includes('bad request');
          const is401 = errorMsg.includes('401') || errorMsg.includes('unauthorized');
          const is403 = errorMsg.includes('403') || errorMsg.includes('forbidden');
          const isAuthError = is400 || is401 || is403;
          
          // Si c'est une erreur d'authentification (400, 401, 403), arrêter complètement
          // car c'est probablement un problème d'API key, pas d'endpoint
          if (isAuthError) {
            console.error(`❌ Erreur d'authentification avec ${baseUrl}${endpointBase}:`, error.message.substring(0, 200));
            console.error('⚠️ Arrêt des tentatives - vérifiez votre API key dans la configuration');
            // Arrêter toutes les tentatives
            throw new Error(`Erreur d'authentification: ${error.message}. Vérifiez votre API key Watsonx dans l'onglet Configuration.`);
          }
          
          if (is404) {
            // Continuons à essayer avec le prochain endpoint
            continue;
          } else {
            // Erreur autre que 404 ou auth - arrêter pour cette baseUrl mais continuer avec la suivante
            console.error(`❌ Erreur avec ${baseUrl}${endpointBase}:`, error.message.substring(0, 100));
            // Continuer avec la prochaine baseUrl
            break;
          }
        }
      }
      
      // Restaurer l'URL de base originale
      watsonxConfig.apiUrl = originalApiUrl;
      
      // Si on a trouvé un endpoint fonctionnel, sortir de la boucle des baseUrls
      if (response) {
        // Mettre à jour l'URL de base pour les requêtes futures
        watsonxConfig.apiUrl = successfulBaseUrl;
        break;
      }
    }
    
    if (!response) {
      const totalAttempts = reorderedBaseUrls.length * endpointsToTest.length;
      const errorMsg = `Aucun endpoint valide trouvé après ${totalAttempts} tentatives.\n\n` +
        `URLs de base testées:\n${reorderedBaseUrls.map((url, i) => `  ${i + 1}. ${url}`).join('\n')}\n\n` +
        `Endpoints testés:\n${endpointsToTest.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}\n\n` +
        `⚠️ IMPORTANT: Les data assets dans Watson Studio peuvent ne pas être accessibles via l'API REST standard de watsonx.ai.\n\n` +
        `Solutions alternatives:\n` +
        `1. Vérifiez dans l'interface Watsonx Studio:\n` +
        `   - Allez sur https://dataplatform.cloud.ibm.com/\n` +
        `   - Ouvrez votre projet (Project ID: ${watsonxConfig.projectId})\n` +
        `   - Naviguez vers "Assets" ou "Data"\n` +
        `   - Ouvrez les outils de développement (F12) → onglet "Network"\n` +
        `   - Cherchez les requêtes HTTP vers vos data assets\n` +
        `   - Copiez l'URL complète de la requête réussie\n\n` +
        `2. Alternative: Utiliser les fichiers locaux\n` +
        `   - Téléchargez vos datasets CSV depuis l'interface Watsonx\n` +
        `   - Placez-les dans le dossier data/ de l'extension\n` +
        `   - L'extension utilisera automatiquement les fichiers locaux\n\n` +
        `3. Vérifier l'authentification:\n` +
        `   - Vérifiez que votre API Key est valide\n` +
        `   - Vérifiez que le Project ID est correct: ${watsonxConfig.projectId}\n` +
        `   - Vérifiez que votre API Key a les permissions pour accéder aux data assets\n\n` +
        `Dernière erreur: ${lastError?.message || 'Unknown'}`;
      throw new Error(errorMsg);
    }
    
    // Log pour debug
    console.log('📊 Réponse API Watsonx:', {
      totalResources: response.resources?.length || 0,
      firstResource: response.resources?.[0] || null
    });
    
    // Chercher tous les datasets liés
    // D'abord, essayer de trouver ceux qui correspondent au nom recherché
    let datasets = response.resources?.filter(
      asset => {
        const name = asset.metadata?.name?.toLowerCase() || '';
        const assetType = asset.metadata?.asset_type?.toLowerCase() || '';
        
        // Vérifier si c'est un dataset de données (CSV, etc.)
        const isDataAsset = assetType === 'data_asset' || 
                           assetType === 'dataset' ||
                           name.endsWith('.csv') ||
                           name.endsWith('.json');
        
        // Chercher ceux qui correspondent au nom recherché
        const matchesSearch = name.includes('llm-inference') ||
                             name.includes('llm_inference') ||
                             name.includes('energy-consumption') ||
                             name.includes('energy_consumption') ||
                             name.includes(datasetName.toLowerCase());
        
        return isDataAsset && matchesSearch;
      }
    ) || [];
    
    // Si aucun dataset spécifique trouvé, retourner tous les data assets CSV
    if (datasets.length === 0 && datasetName) {
      console.log('⚠️ Aucun dataset correspondant au nom, recherche de tous les data assets CSV...');
      datasets = response.resources?.filter(
        asset => {
          const name = asset.metadata?.name?.toLowerCase() || '';
          const assetType = asset.metadata?.asset_type?.toLowerCase() || '';
          return (assetType === 'data_asset' || assetType === 'dataset' || name.endsWith('.csv')) &&
                 !name.includes('flow') && // Exclure les flows
                 !name.includes('notebook') && // Exclure les notebooks
                 !name.includes('visualization'); // Exclure les visualisations
        }
      ) || [];
    }
    
    console.log(`✓ ${datasets.length} datasets trouvés (sur ${response.resources?.length || 0} assets totaux)`);
    if (datasets.length > 0) {
      console.log('📋 Noms des datasets trouvés:', datasets.map(d => d.metadata?.name || d.id));
    }
    
    return datasets;
  } catch (error) {
    console.error('❌ Erreur recherche datasets:', error);
    return [];
  }
}

/**
 * Trouver le dataset par nom (compatibilité)
 */
async function findDataset(datasetName) {
  const datasets = await findDatasets(datasetName);
  return datasets.length > 0 ? datasets[0] : null;
}

/**
 * Charger tous les datasets depuis Watsonx et les combiner
 */
async function loadDatasetFromWatsonx(filters = {}) {
  try {
    // Trouver tous les datasets liés
    const datasets = await findDatasets();
    
    if (datasets.length === 0) {
      throw new Error('Aucun dataset llm-inference trouvé dans Watsonx');
    }
    
    console.log(`📊 Chargement de ${datasets.length} datasets...`);
    
    // Charger tous les datasets et les combiner
    const allData = [];
    
    for (const dataset of datasets) {
      try {
        const previousLength = allData.length;
        // Utiliser le même format d'endpoint que pour findDatasets
        const endpointsToTry = [
          `/ml/v4/data_assets/${dataset.id}`,
          `/v4/data_assets/${dataset.id}`,
          `/api/v4/data_assets/${dataset.id}`,
          `/v2/data_assets/${dataset.id}`
        ];
        
        let asset;
        for (const endpointBase of endpointsToTry) {
          const endpoint = `${endpointBase}?project_id=${encodeURIComponent(watsonxConfig.projectId)}`;
          try {
            asset = await watsonxRequest(endpoint);
            break; // Succès
          } catch (error) {
            if (error.message.includes('404') && endpointsToTry.indexOf(endpointBase) < endpointsToTry.length - 1) {
              continue; // Essayer le suivant
            } else {
              throw error;
            }
          }
        }
        
        if (!asset) {
          throw new Error(`Impossible de charger le dataset ${dataset.id}`);
        }
        
        // Charger les données
        if (asset.entity?.data_location) {
          const dataUrl = asset.entity.data_location.href;
          const dataResponse = await fetch(dataUrl, {
            headers: {
              'Authorization': `Bearer ${await getAuthToken()}`
            }
          });
          
          if (dataResponse.ok) {
            const contentType = dataResponse.headers.get('content-type');
            let data = null;
            
            if (contentType?.includes('json')) {
              data = await dataResponse.json();
              // Si c'est un array, l'utiliser directement
              if (Array.isArray(data)) {
                allData.push(...data);
              } else if (data.data && Array.isArray(data.data)) {
                allData.push(...data.data);
              } else {
                allData.push(data);
              }
            } else if (contentType?.includes('csv') || dataUrl.includes('.csv')) {
              const csvText = await dataResponse.text();
              const parsed = parseCSV(csvText);
              allData.push(...parsed);
            } else {
              // Essayer de parser comme CSV par défaut
              const text = await dataResponse.text();
              const parsed = parseCSV(text);
              allData.push(...parsed);
            }
            
            const newLength = allData.length;
            console.log(`✓ Dataset "${dataset.metadata?.name}" chargé: ${newLength - previousLength} lignes`);
          }
        }
      } catch (datasetError) {
        console.warn(`⚠️ Erreur chargement dataset "${dataset.metadata?.name}":`, datasetError);
        // Continuer avec les autres datasets
      }
    }
    
    if (allData.length === 0) {
      throw new Error('Aucune donnée chargée depuis les datasets');
    }
    
    console.log(`✓ Total: ${allData.length} mesures chargées depuis ${datasets.length} datasets`);
    
    // Normaliser les colonnes (gérer les différences entre fichiers)
    const normalizedData = normalizeDatasetColumns(allData);
    
    // Appliquer les filtres si nécessaire
    if (Object.keys(filters).length > 0) {
      return filterDataset(normalizedData, filters);
    }
    
    return normalizedData;
  } catch (error) {
    console.error('❌ Erreur chargement dataset:', error);
    throw error;
  }
}

/**
 * Normaliser les colonnes entre différents fichiers CSV
 */
function normalizeDatasetColumns(data) {
  return data.map(row => {
    const normalized = {};
    
    // Mapping des colonnes possibles
    const columnMapping = {
      'model_name': ['model_name', 'model', 'Model'],
      'hardware_type': ['hardware_type', 'hardware', 'Hardware', 'type'],
      'prompt_token_length': ['prompt_token_length', 'prompt_tokens', 'Prompt Tokens'],
      'response_token_length': ['response_token_length', 'response_tokens', 'Response Tokens'],
      'energy_consumption_llm_total': ['energy_consumption_llm_total', 'energy_total', 'Energy Total', 'energy'],
      'energy_consumption_llm_cpu': ['energy_consumption_llm_cpu', 'cpu_energy'],
      'energy_consumption_llm_gpu': ['energy_consumption_llm_gpu', 'gpu_energy'],
      'total_duration': ['total_duration', 'duration', 'Duration'],
      'word_count': ['word_count', 'words', 'Words']
    };
    
    // Normaliser chaque colonne
    Object.entries(columnMapping).forEach(([targetCol, possibleCols]) => {
      for (const col of possibleCols) {
        if (row[col] !== undefined) {
          normalized[targetCol] = row[col];
          break;
        }
      }
    });
    
    // Copier les autres colonnes telles quelles
    Object.keys(row).forEach(key => {
      if (!normalized[key]) {
        normalized[key] = row[key];
      }
    });
    
    return normalized;
  });
}

/**
 * Parser CSV en JSON (gère les colonnes manquantes)
 */
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Prendre la première ligne comme headers
  const headers = lines[0].split(',').map(h => h.trim()).filter(h => h);
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    // Parser la ligne en tenant compte des guillemets et virgules dans les valeurs
    const values = parseCSVLine(lines[i]);
    const row = {};
    
    // Mapper les valeurs aux headers disponibles
    headers.forEach((header, index) => {
      if (values[index] !== undefined) {
        row[header] = values[index].trim();
      } else {
        // Colonne manquante - laisser vide
        row[header] = '';
      }
    });
    
    data.push(row);
  }
  
  return data;
}

/**
 * Parser une ligne CSV en tenant compte des guillemets
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Ajouter la dernière valeur
  values.push(current);
  
  return values;
}

/**
 * Filtrer les données du dataset
 */
function filterDataset(data, filters) {
  if (!filters || Object.keys(filters).length === 0) {
    return data;
  }
  
  return data.filter(row => {
    return Object.entries(filters).every(([key, value]) => {
      if (Array.isArray(value)) {
        return value.includes(row[key]);
      }
      return row[key] === value || 
             String(row[key]).toLowerCase().includes(String(value).toLowerCase());
    });
  });
}

/**
 * Obtenir les statistiques agrégées par modèle
 */
async function getModelStats(filters = {}) {
  try {
    const data = await loadDatasetFromWatsonx();
    const filtered = filterDataset(data, filters);
    
    // Grouper par modèle
    const byModel = {};
    
    filtered.forEach(row => {
      const model = row.model_name || row.model || 'unknown';
      if (!byModel[model]) {
        byModel[model] = {
          model,
          count: 0,
          totalEnergy: 0,
          totalTokens: 0,
          avgEnergyPerToken: 0,
          hardwareTypes: new Set()
        };
      }
      
      const stats = byModel[model];
      stats.count++;
      stats.totalEnergy += parseFloat(row.energy_consumption_llm_total || 0);
      stats.totalTokens += parseFloat(row.prompt_token_length || 0) + 
                          parseFloat(row.response_token_length || 0);
      
      if (row.hardware_type) {
        stats.hardwareTypes.add(row.hardware_type);
      }
    });
    
    // Calculer les moyennes
    Object.values(byModel).forEach(stats => {
      stats.avgEnergyPerToken = stats.totalTokens > 0 
        ? stats.totalEnergy / stats.totalTokens 
        : 0;
      stats.hardwareTypes = Array.from(stats.hardwareTypes);
    });
    
    return Object.values(byModel);
  } catch (error) {
    console.error('❌ Erreur calcul stats modèles:', error);
    throw error;
  }
}

/**
 * Obtenir les statistiques par GPU/Hardware
 */
async function getHardwareStats(filters = {}) {
  try {
    const data = await loadDatasetFromWatsonx();
    const filtered = filterDataset(data, filters);
    
    const byHardware = {};
    
    filtered.forEach(row => {
      const hardware = row.hardware_type || 'unknown';
      if (!byHardware[hardware]) {
        byHardware[hardware] = {
          hardware,
          count: 0,
          totalEnergy: 0,
          avgEnergy: 0,
          models: new Set()
        };
      }
      
      const stats = byHardware[hardware];
      stats.count++;
      stats.totalEnergy += parseFloat(row.energy_consumption_llm_total || 0);
      
      if (row.model_name) {
        stats.models.add(row.model_name);
      }
    });
    
    Object.values(byHardware).forEach(stats => {
      stats.avgEnergy = stats.totalEnergy / stats.count;
      stats.models = Array.from(stats.models);
    });
    
    return Object.values(byHardware);
  } catch (error) {
    console.error('❌ Erreur calcul stats hardware:', error);
    throw error;
  }
}

/**
 * Sauvegarder les statistiques d'analyse dans Watsonx
 */
async function saveStatsToWatsonx(stats, metadata = {}) {
  try {
    const statsData = {
      timestamp: new Date().toISOString(),
      stats,
      metadata
    };
    
    // Créer un nouvel asset de données
    const asset = {
      metadata: {
        name: `co2-stats-${Date.now()}`,
        asset_type: 'data_asset',
        tags: ['co2-tracking', 'stats', metadata.range || 'day']
      },
      entity: {
        data: statsData
      }
    };
    
    const endpoint = `/ml/v4/data_assets?project_id=${watsonxConfig.projectId}`;
    const response = await watsonxRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(asset)
    });
    
    return response;
  } catch (error) {
    console.error('❌ Erreur sauvegarde stats:', error);
    throw error;
  }
}

/**
 * Charger les statistiques sauvegardées
 */
async function loadStatsFromWatsonx(range = 'all') {
  try {
    // Essayer d'abord /v4, puis /ml/v4 si nécessaire
    let endpoint = `/v4/data_assets?project_id=${encodeURIComponent(watsonxConfig.projectId)}`;
    let response;
    
    try {
      response = await watsonxRequest(endpoint);
    } catch (error) {
      if (error.message.includes('404')) {
        endpoint = `/ml/v4/data_assets?project_id=${encodeURIComponent(watsonxConfig.projectId)}`;
        response = await watsonxRequest(endpoint);
      } else {
        throw error;
      }
    }
    
    // Filtrer par tags
    const statsAssets = response.resources?.filter(
      asset => asset.metadata?.tags?.includes('co2-tracking')
    ) || [];
    
    // Charger les données
    const allStats = [];
    for (const asset of statsAssets) {
      if (asset.entity?.data_location) {
        const dataUrl = asset.entity.data_location.href;
        const dataResponse = await fetch(dataUrl, {
          headers: {
            'Authorization': `Bearer ${await getAuthToken()}`
          }
        });
        
        if (dataResponse.ok) {
          const stats = await dataResponse.json();
          allStats.push(stats);
        }
      }
    }
    
    return allStats;
  } catch (error) {
    console.error('❌ Erreur chargement stats:', error);
    return [];
  }
}

/**
 * Utiliser le modèle ML déployé pour faire des prédictions d'énergie
 * Basé sur l'exemple IBM: https://eu-de.dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/ml-authentication.html
 * 
 * @param {Object} params - Paramètres pour la prédiction
 * @param {number} params.totalDuration - Durée totale en nanosecondes
 * @param {number} params.promptTokens - Nombre de tokens du prompt (prompt_token_length)
 * @param {number} params.responseTokens - Nombre de tokens de la réponse (response_token_length)
 * @param {number} params.responseDuration - Durée de réponse en nanosecondes
 * @param {number} params.wordCount - Nombre de mots (word_count)
 * @param {number} params.readingTime - Temps de lecture en secondes
 * @returns {Promise<number>} - Énergie prédite en Joules
 */
async function predictEnergyWithDeployedModel(params) {
  console.log('🎯 ========== PREDICT ENERGY WITH DEPLOYED MODEL ==========');
  console.log('Params reçus:', params);
  console.log('Config:', {
    hasDeploymentId: !!watsonxConfig?.deploymentId,
    hasApiKey: !!watsonxConfig?.apiKey,
    hasProjectId: !!watsonxConfig?.projectId,
    deploymentId: watsonxConfig?.deploymentId,
    apiUrl: watsonxConfig?.apiUrl
  });
  
  try {
    if (!watsonxConfig?.deploymentId || !watsonxConfig?.apiKey || !watsonxConfig?.projectId) {
      console.log('⚠️ Modèle déployé non configuré, utilisation du modèle local');
      return null; // Retourner null pour indiquer qu'il faut utiliser le modèle local
    }
    
    console.log('🔑 Obtention du token IAM...');
    const token = await getAuthToken();
    console.log('✅ Token obtenu:', token ? token.substring(0, 20) + '...' : 'null');
    const baseUrl = watsonxConfig.apiUrl || 'https://eu-de.ml.cloud.ibm.com';
    
    // Extraire la région pour construire l'URL privée
    const regionMatch = baseUrl.match(/https:\/\/([^.]+)\.(ml|dataplatform)\.cloud\.ibm\.com/);
    const region = regionMatch ? regionMatch[1] : 'eu-de';
    const privateBaseUrl = `https://private.${region}.ml.cloud.ibm.com`;
    
    // Endpoints possibles pour les prédictions
    // Essayer les endpoints publics en premier (plus fiables que les privés)
    // Note: Le project_id peut être dans les headers (X-Project-Id) plutôt que dans l'URL pour l'API de prédiction
    const projectIdParam = watsonxConfig.projectId ? `project_id=${encodeURIComponent(watsonxConfig.projectId)}` : '';
     // Endpoints selon la documentation officielle IBM
     // Format: https://{region}.ml.cloud.ibm.com/ml/v4/deployments/{deployment_id}/predictions?version=2021-05-01
     // IMPORTANT: Le paramètre 'version' est OBLIGATOIRE et doit être au format YYYY-MM-DD
     // Le project_id doit être dans l'URL en tant que paramètre de requête si nécessaire
     const endpoints = [
       // Endpoint public avec version ET project_id (format officiel selon documentation - PRIORITAIRE)
       `${baseUrl}/ml/v4/deployments/${watsonxConfig.deploymentId}/predictions?version=2021-05-01${projectIdParam ? '&' + projectIdParam : ''}`,
       // Endpoint public avec version seulement (project_id dans URL si nécessaire)
       `${baseUrl}/ml/v4/deployments/${watsonxConfig.deploymentId}/predictions?version=2021-05-01`
       // NOTE: Les endpoints sans 'version' ne sont plus utilisés car l'API exige ce paramètre
     ];
    
    // Préparer les données d'entrée selon le format attendu par le modèle
    // Les champs doivent correspondre exactement à ceux utilisés lors de l'entraînement
    const inputFields = [
      'total_duration',        // en nanosecondes
      'prompt_token_length',
      'response_token_length',
      'response_duration',     // en nanosecondes
      'word_count',
      'reading_time'           // en secondes
    ];
    
    // S'assurer que toutes les variables sont bien définies et converties en nombres
    // Utiliser des valeurs par défaut si nécessaire
    // IMPORTANT: Les valeurs doivent être des nombres valides, pas null, pas undefined, pas NaN
    let totalDuration = typeof params.totalDuration === 'number' ? params.totalDuration : (parseFloat(params.totalDuration) || 0);
    let promptTokens = typeof params.promptTokens === 'number' ? params.promptTokens : (parseInt(params.promptTokens) || 0);
    let responseTokens = typeof params.responseTokens === 'number' ? params.responseTokens : (parseInt(params.responseTokens) || 0);
    let responseDuration = typeof params.responseDuration === 'number' ? params.responseDuration : (parseFloat(params.responseDuration) || 0);
    let wordCount = typeof params.wordCount === 'number' ? params.wordCount : (parseInt(params.wordCount) || 0);
    let readingTime = typeof params.readingTime === 'number' ? params.readingTime : (parseFloat(params.readingTime) || 0);
    
    // S'assurer que toutes les valeurs sont des nombres finis (pas Infinity, pas NaN)
    totalDuration = isFinite(totalDuration) ? totalDuration : 0;
    promptTokens = isFinite(promptTokens) ? promptTokens : 0;
    responseTokens = isFinite(responseTokens) ? responseTokens : 0;
    responseDuration = isFinite(responseDuration) ? responseDuration : 0;
    wordCount = isFinite(wordCount) ? wordCount : 0;
    readingTime = isFinite(readingTime) ? readingTime : 0;
    
    // S'assurer que les valeurs sont positives (ou au moins 0)
    totalDuration = Math.max(0, totalDuration);
    promptTokens = Math.max(0, promptTokens);
    responseTokens = Math.max(0, responseTokens);
    responseDuration = Math.max(0, responseDuration);
    wordCount = Math.max(0, wordCount);
    readingTime = Math.max(0, readingTime);
    
    // Avertir si toutes les valeurs sont à 0 (peut causer des problèmes avec le modèle)
    if (totalDuration === 0 && promptTokens === 0 && responseTokens === 0 && responseDuration === 0 && wordCount === 0 && readingTime === 0) {
      console.warn('⚠️ Toutes les valeurs sont à 0. Le modèle pourrait retourner une prédiction invalide.');
    }
    
    // Créer le tableau de valeurs avec les variables bien définies
    const inputValues = [
      totalDuration,      // total_duration en nanosecondes
      promptTokens,      // prompt_token_length
      responseTokens,     // response_token_length
      responseDuration,   // response_duration en nanosecondes
      wordCount,         // word_count
      readingTime        // reading_time en secondes
    ];
    
    // Vérifier que toutes les valeurs sont valides avant de construire le payload
    console.log('🔍 Vérification des valeurs...');
    const invalidValues = inputValues
      .map((val, idx) => ({ val, idx, field: inputFields[idx], isValid: val !== null && val !== undefined && !isNaN(val) && isFinite(val) }))
      .filter(item => !item.isValid);
    
    if (invalidValues.length > 0) {
      console.error('❌ Valeurs invalides détectées:', invalidValues);
      const invalidFields = invalidValues.map(item => `${item.field} (${item.val})`).join(', ');
      throw new Error(`Valeurs invalides pour les champs: ${invalidFields}. Toutes les valeurs doivent être des nombres valides.`);
    }
    console.log('✅ Toutes les valeurs sont valides');
    
    // Log des valeurs pour diagnostic avec validation
    console.log('📊 ========== VALEURS POUR PRÉDICTION ==========');
    console.log('totalDuration:', totalDuration, '(type:', typeof totalDuration, ', isFinite:', isFinite(totalDuration), ')');
    console.log('promptTokens:', promptTokens, '(type:', typeof promptTokens, ', isFinite:', isFinite(promptTokens), ')');
    console.log('responseTokens:', responseTokens, '(type:', typeof responseTokens, ', isFinite:', isFinite(responseTokens), ')');
    console.log('responseDuration:', responseDuration, '(type:', typeof responseDuration, ', isFinite:', isFinite(responseDuration), ')');
    console.log('wordCount:', wordCount, '(type:', typeof wordCount, ', isFinite:', isFinite(wordCount), ')');
    console.log('readingTime:', readingTime, '(type:', typeof readingTime, ', isFinite:', isFinite(readingTime), ')');
    console.log('inputValues:', inputValues);
    console.log('================================================');
    
    // Construire le payload JSON exactement comme attendu par l'API Watson ML
    // Format standard selon documentation IBM: input_data uniquement, SANS project_id dans le body
    // Le project_id doit être passé dans l'URL en tant que paramètre de requête, PAS dans le body
    const payload = {
      input_data: [{
        fields: inputFields,
        values: [inputValues]
      }]
    };
    
    // Log du payload complet pour diagnostic
    console.log('📦 Payload JSON (format exact API):', JSON.stringify(payload, null, 2));
    console.log('📊 Valeurs numériques:', {
      totalDuration: typeof totalDuration === 'number' ? totalDuration : 'NAN',
      promptTokens: typeof promptTokens === 'number' ? promptTokens : 'NAN',
      responseTokens: typeof responseTokens === 'number' ? responseTokens : 'NAN',
      responseDuration: typeof responseDuration === 'number' ? responseDuration : 'NAN',
      wordCount: typeof wordCount === 'number' ? wordCount : 'NAN',
      readingTime: typeof readingTime === 'number' ? readingTime : 'NAN'
    });
    
    let lastError = null;
    // Utiliser uniquement le payload standard (sans project_id dans le body)
    // Le project_id sera passé dans l'URL en tant que paramètre de requête
    const currentPayload = payload;
    const payloadName = 'format standard API (input_data uniquement)';
    
    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      try {
        const attemptNum = i + 1;
        const totalAttempts = endpoints.length;
        console.log(`🔄 Tentative ${attemptNum}/${totalAttempts} avec modèle déployé: ${endpoint}`);
          
          // Ajouter un petit délai entre les tentatives (sauf pour la première)
          if (attemptNum > 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 seconde de délai
          }
          
          const result = await new Promise((resolve, reject) => {
            try {
              const oReq = new XMLHttpRequest();
              
              // FORCER L'AFFICHAGE - Log avant même d'envoyer la requête
              console.log('🚀 ========== DÉBUT REQUÊTE ==========');
              console.log('Endpoint:', endpoint);
              console.log('Payload:', JSON.stringify(currentPayload, null, 2));
              console.log('======================================');
            
            oReq.addEventListener('load', () => {
            // FORCER L'AFFICHAGE - Log immédiatement au début de load
            console.log('🔥 ÉVÉNEMENT LOAD DÉCLENCHÉ !');
            
            try {
              // Log de la réponse complète pour diagnostic - TOUJOURS AFFICHER
              const responseStatus = oReq.status;
              const responseText = oReq.responseText || '';
              
              // FORCER L'AFFICHAGE avec plusieurs console.log séparés
              // Utiliser alert pour forcer l'affichage si console.log ne fonctionne pas
              if (responseStatus !== 200) {
                // Pour les erreurs, forcer l'affichage avec alert temporairement
                try {
                  const errorPreview = responseText.substring(0, 1000);
                  console.error('❌❌❌ ERREUR HTTP DÉTECTÉE ❌❌❌');
                  console.error('Status:', responseStatus);
                  console.error('Response:', errorPreview);
                  // FORCER L'AFFICHAGE avec alert pour voir la réponse exacte
                  // Décommenter temporairement pour debug
                  if (responseStatus === 400) {
                    alert('Erreur 400 Bad Request:\n\n' + errorPreview + '\n\nVérifiez la console pour plus de détails.');
                  }
                } catch (e) {
                  console.error('Erreur lors de l\'affichage de l\'erreur:', e);
                }
              }
              
              console.log('📥 ========== RÉPONSE HTTP ==========');
              console.log('Status:', responseStatus);
              console.log('Status Text:', oReq.statusText);
              console.log('Response Text Length:', responseText.length);
              console.log('Response Text (premiers 1000 chars):', responseText.substring(0, 1000));
              console.log('Response Text (COMPLET):', responseText);
              console.log('=====================================');
              
              if (responseStatus !== 200) {
                // Essayer de parser l'erreur JSON pour obtenir plus de détails
                let errorDetails = responseText;
                let errorJson = null;
                try {
                  errorJson = JSON.parse(responseText);
                  console.log('📋 Erreur JSON parsée:', JSON.stringify(errorJson, null, 2));
                  
                  if (errorJson.errors && Array.isArray(errorJson.errors) && errorJson.errors.length > 0) {
                    errorDetails = errorJson.errors.map(e => {
                      if (typeof e === 'string') return e;
                      return e.message || JSON.stringify(e);
                    }).join('; ');
                  } else if (errorJson.message) {
                    errorDetails = errorJson.message;
                  } else if (errorJson.error) {
                    errorDetails = typeof errorJson.error === 'string' ? errorJson.error : JSON.stringify(errorJson.error);
                  } else {
                    errorDetails = JSON.stringify(errorJson, null, 2);
                  }
                } catch (e) {
                  console.log('⚠️ Réponse n\'est pas du JSON valide');
                }
                
                // Log complet de l'erreur pour diagnostic - FORCER L'AFFICHAGE
                console.error('❌ ========== ERREUR HTTP COMPLÈTE ==========');
                console.error('Status:', responseStatus);
                console.error('Status Text:', oReq.statusText);
                console.error('Response Text:', responseText);
                console.error('Error Details:', errorDetails);
                console.error('Error JSON:', errorJson);
                console.error('Endpoint:', endpoint);
                console.error('Payload:', JSON.stringify(currentPayload, null, 2));
                console.error('===========================================');
                
                // Pour les erreurs 400, inclure plus de détails et le payload envoyé
                if (responseStatus === 400) {
                  const errorMsg = `Erreur 400 Bad Request: ${errorDetails}\n\nEndpoint: ${endpoint}\nPayload:\n${JSON.stringify(currentPayload, null, 2)}\n\nVérifiez que les noms de champs et le format correspondent exactement à ce que le modèle attend.`;
                  console.error('❌ ========== DÉTAILS ERREUR 400 ==========');
                  console.error(errorMsg);
                  console.error('==========================================');
                  
                  // Pour les erreurs 400, continuer avec le prochain endpoint au lieu de rejeter immédiatement
                  // Sauf si c'est le dernier essai
                  if (i === endpoints.length - 1) {
                    reject(new Error(errorMsg));
                  } else {
                    // Continuer avec le prochain essai
                    reject(new Error(`Erreur 400 - Essai suivant...`));
                  }
                  return;
                } else {
                  reject(new Error(`Erreur HTTP ${responseStatus}: ${errorDetails}`));
                }
                return;
              }
              
              // Parser la réponse JSON
              let parsedResponse;
              try {
                parsedResponse = JSON.parse(oReq.responseText);
                console.log('✅ Réponse parsée complète:', JSON.stringify(parsedResponse, null, 2));
                console.log('📊 Structure de la réponse:', {
                  hasPredictions: !!parsedResponse.predictions,
                  predictionsLength: parsedResponse.predictions?.length,
                  firstPrediction: parsedResponse.predictions?.[0],
                  firstPredictionValues: parsedResponse.predictions?.[0]?.values,
                  firstPredictionValuesType: Array.isArray(parsedResponse.predictions?.[0]?.values?.[0]) ? 'array of arrays' : typeof parsedResponse.predictions?.[0]?.values?.[0],
                  hasValues: !!parsedResponse.values,
                  valuesLength: parsedResponse.values?.length,
                  keys: Object.keys(parsedResponse)
                });
              } catch (parseError) {
                console.error('❌ Erreur parsing JSON:', parseError);
                console.error('❌ Réponse brute:', oReq.responseText);
                reject(new Error('Erreur parsing response JSON: ' + parseError.message));
                return;
              }
              
              resolve(parsedResponse);
            } catch (ex) {
              console.error('❌ Erreur dans load handler:', ex);
              console.error('❌ Réponse complète:', oReq.responseText);
              reject(new Error('Erreur parsing response: ' + ex.message));
            }
          });
          
          oReq.addEventListener('error', (error) => {
            console.error('🔥 ========== ÉVÉNEMENT ERROR DÉCLENCHÉ ==========');
            console.error(`❌ Erreur réseau lors de la prédiction pour ${endpoint}:`, error);
            console.error('Error type:', error.type);
            console.error('Error message:', error.message);
            console.error('Error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            console.error('==================================================');
            // Ne pas rejeter immédiatement pour les erreurs réseau, laisser le timeout gérer
            // ou rejeter avec un message plus informatif
            if (error.type === 'timeout' || error.type === 'abort') {
              reject(new Error(`Timeout ou connexion interrompue pour ${endpoint}`));
            } else {
              reject(new Error(`Erreur réseau: ${error.message || error}`));
            }
          });
          
          oReq.addEventListener('abort', () => {
            console.warn(`⚠️ Requête annulée pour ${endpoint}`);
            reject(new Error('Requête annulée'));
          });
          
          oReq.addEventListener('timeout', () => {
            console.error(`❌ Timeout lors de la prédiction (60s) pour ${endpoint}`);
            oReq.abort();
            reject(new Error(`Timeout lors de la prédiction après 60 secondes`));
          });
          
          oReq.timeout = 60000; // 60 secondes (augmenté pour les requêtes lentes)
          oReq.open('POST', endpoint);
          
          // Headers requis pour le scoring Watson ML (format exact selon documentation IBM)
          oReq.setRequestHeader('Accept', 'application/json');
          oReq.setRequestHeader('Authorization', 'Bearer ' + token);
          oReq.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
          
          // NOTE: Le project_id doit être passé dans l'URL en tant que paramètre de requête,
          // PAS dans le body ni dans les headers selon la documentation officielle
          
          // Log de la requête pour diagnostic
          console.log('📤 Envoi requête scoring:', {
            endpoint,
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Authorization': 'Bearer ' + (token ? token.substring(0, 20) + '...' : 'none'),
              'Content-Type': 'application/json;charset=UTF-8'
            },
            payloadSize: JSON.stringify(payload).length
          });
          
          // Envoyer le payload JSON
          const payloadString = JSON.stringify(currentPayload);
          console.log(`📦 Payload stringifié (${payloadName}):`, payloadString);
          console.log(`📦 Payload size: ${payloadString.length} bytes`);
          
          // FORCER L'AFFICHAGE - Log avant l'envoi
          console.log('⏳ ========== ENVOI REQUÊTE ==========');
          console.log('Endpoint:', endpoint);
          console.log('Payload:', payloadString);
          console.log('=====================================');
          
          oReq.send(payloadString);
          console.log('✅ Requête envoyée, attente de la réponse...');
            } catch (setupError) {
              console.error('❌ Erreur lors de la configuration de la requête:', setupError);
              reject(setupError);
            }
          });
        
        // Extraire la prédiction d'énergie depuis la réponse
        // Le format peut varier selon le modèle, on essaie plusieurs formats
        let energyJoules = null;
        
        console.log('🔍 Analyse de la réponse pour extraire la prédiction:', {
          resultType: typeof result,
          resultKeys: Object.keys(result || {}),
          hasPredictions: !!result.predictions,
          predictionsType: Array.isArray(result.predictions) ? 'array' : typeof result.predictions,
          predictionsLength: result.predictions?.length,
          firstPrediction: result.predictions?.[0],
          hasValues: !!result.values,
          valuesType: Array.isArray(result.values) ? 'array' : typeof result.values
        });
        
        if (result.predictions && Array.isArray(result.predictions) && result.predictions.length > 0) {
          const prediction = result.predictions[0];
          console.log('📊 Première prédiction:', {
            predictionType: typeof prediction,
            predictionKeys: typeof prediction === 'object' ? Object.keys(prediction) : 'N/A',
            hasValues: Array.isArray(prediction.values),
            valuesLength: prediction.values?.length,
            firstValue: prediction.values?.[0]
          });
          
          // Si c'est un tableau de valeurs, prendre la première (énergie)
          // Format attendu: values = [[value1, value2, ...]] (tableau de tableaux)
          if (Array.isArray(prediction.values) && prediction.values.length > 0) {
            const firstValueArray = prediction.values[0];
            if (Array.isArray(firstValueArray) && firstValueArray.length > 0) {
              // Format: [[92.93696209825372]] -> prendre [0][0]
              energyJoules = firstValueArray[0];
            } else if (typeof firstValueArray === 'number') {
              // Format: [92.93696209825372] -> prendre [0]
              energyJoules = firstValueArray;
            } else {
              // Format inattendu, essayer de prendre directement
              energyJoules = firstValueArray;
            }
          } else if (typeof prediction === 'number') {
            energyJoules = prediction;
          } else if (prediction && typeof prediction === 'object') {
            // Essayer différents noms de propriétés
            energyJoules = prediction.energy_joules || prediction.energy || prediction.prediction || 
                          prediction.value || prediction[0] || Object.values(prediction)[0];
          }
        } else if (result.values && Array.isArray(result.values) && result.values.length > 0) {
          energyJoules = result.values[0];
        } else if (result.predictions && !Array.isArray(result.predictions)) {
          // Si predictions n'est pas un tableau mais un objet
          energyJoules = result.predictions.value || result.predictions.prediction || 
                        result.predictions.energy_joules || result.predictions.energy;
        } else if (typeof result === 'number') {
          energyJoules = result;
        } else if (result && typeof result === 'object') {
          // Dernier recours : chercher n'importe quelle valeur numérique
          const numericValues = Object.values(result).filter(v => typeof v === 'number' && !isNaN(v));
          if (numericValues.length > 0) {
            energyJoules = numericValues[0];
          }
        }
        
        console.log('🎯 Énergie extraite:', {
          energyJoules,
          type: typeof energyJoules,
          isValid: energyJoules !== null && typeof energyJoules === 'number' && !isNaN(energyJoules) && energyJoules >= 0
        });
        
        if (energyJoules !== null && typeof energyJoules === 'number' && !isNaN(energyJoules) && energyJoules >= 0) {
          console.log(`✅ Prédiction d'énergie depuis modèle déployé: ${energyJoules.toFixed(8)} J`);
          return energyJoules;
        } else {
          console.warn('⚠️ Format de réponse inattendu du modèle déployé. Réponse complète:', JSON.stringify(result, null, 2));
          lastError = new Error(`Format de réponse inattendu. Réponse: ${JSON.stringify(result).substring(0, 500)}`);
          continue; // Essayer le prochain endpoint/payload
        }
      } catch (error) {
        lastError = error;
        const errorMsg = error.message || String(error);
        
        // Si l'erreur indique "Essai suivant...", c'est une erreur 400 et on continue
        if (errorMsg.includes('Essai suivant...')) {
          console.warn(`⚠️ Erreur 400 avec ${endpoint}, essai suivant...`);
          continue;
        }
        
        console.warn(`⚠️ Erreur avec endpoint ${endpoint}:`, errorMsg);
        
        // Si c'est un timeout ou une erreur de connexion, continuer avec le prochain endpoint
        if (errorMsg.includes('Timeout') || errorMsg.includes('timeout') || 
            errorMsg.includes('CONNECTION') || errorMsg.includes('ERR_CONNECTION')) {
          console.log(`⏭️ Passage au prochain endpoint...`);
          continue;
        }
        
        // Pour les autres erreurs, continuer
        continue;
      }
    } // Fin de la boucle for endpoints
    
    // Si on arrive ici, tous les endpoints ont échoué
    if (lastError) {
      throw lastError;
    } else {
      throw new Error('Aucun endpoint disponible pour les prédictions');
    }
    
  } catch (error) {
    console.error('❌ Erreur prédiction avec modèle déployé:', error);
    console.log('⚠️ Fallback vers modèle local');
    return null; // Retourner null pour utiliser le modèle local en fallback
  }
}

/**
 * Envoyer des données à Watsonx (pour synchronisation)
 */
async function sendDataToWatsonx(batch) {
  try {
    if (!watsonxConfig || !watsonxConfig.apiKey || !watsonxConfig.projectId) {
      throw new Error('Configuration Watsonx incomplète');
    }
    
    if (!batch || batch.length === 0) {
      return { success: true, message: 'Aucune donnée à envoyer' };
    }
    
    console.log(`📤 Envoi de ${batch.length} échanges à Watsonx...`);
    
    // Convertir les données en CSV
    const headers = [
      'timestamp',
      'platform',
      'model_name',
      'prompt_token_length',
      'response_token_length',
      'total_duration',
      'response_duration',
      'word_count',
      'reading_time',
      'energy_joules',
      'co2_grams'
    ];
    
    const csvRows = [headers.join(',')];
    
    batch.forEach(exchange => {
      const row = [
        exchange.timestamp || Date.now(),
        exchange.platform || '',
        exchange.model_name || exchange.model || '',
        exchange.prompt_token_length || exchange.promptTokens || 0,
        exchange.response_token_length || exchange.responseTokens || 0,
        exchange.total_duration || 0,
        exchange.response_duration || '',
        exchange.word_count || exchange.wordCount || 0,
        exchange.reading_time || exchange.readingTime || 0,
        exchange.energyJoules || 0,
        exchange.co2Grams || 0
      ];
      csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', blob, 'llm-inference-data.csv');
    formData.append('name', `llm-inference-${Date.now()}`);
    formData.append('description', 'Données de consommation énergétique LLM');
    
    // Créer un data asset dans Watsonx
    const token = await getAuthToken();
    const baseUrl = watsonxConfig.apiUrl || 'https://eu-de.ml.cloud.ibm.com';
    const region = baseUrl.match(/https:\/\/([^.]+)\.(ml|dataplatform)\.cloud\.ibm\.com/)?.[1] || 'eu-de';
    const dataPlatformUrl = `https://${region}.dataplatform.cloud.ibm.com`;
    
    // Essayer plusieurs endpoints pour créer un data asset
    const endpoints = [
      `${dataPlatformUrl}/v2/assets?project_id=${encodeURIComponent(watsonxConfig.projectId)}`,
      `${dataPlatformUrl}/api/v2/assets?project_id=${encodeURIComponent(watsonxConfig.projectId)}`,
      `${baseUrl}/ml/v4/data_assets?project_id=${encodeURIComponent(watsonxConfig.projectId)}`
    ];
    
    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          body: formData
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Données envoyées à Watsonx:', result);
          return { success: true, assetId: result.id || result.asset_id, message: `${batch.length} échanges envoyés` };
        } else {
          const errorText = await response.text();
          lastError = new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
        }
      } catch (error) {
        lastError = error;
      }
    }
    
    throw lastError || new Error('Aucun endpoint disponible pour l\'envoi de données');
    
  } catch (error) {
    console.error('❌ Erreur envoi données à Watsonx:', error);
    return { success: false, error: error.message };
  }
}

// Exposer le service globalement avec toutes les fonctions (après toutes les définitions)
try {
  const WatsonxService = {
    initWatsonxService,
    getAuthToken,
    watsonxRequest,
    findDatasets,
    findDataset,
    loadDatasetFromWatsonx,
    getModelStats,
    getHardwareStats,
    filterDataset,
    saveStatsToWatsonx,
    loadStatsFromWatsonx,
    sendDataToWatsonx,
    predictEnergyWithDeployedModel,
    updateConfig
  };

  // Pour Service Worker (global scope)
  if (typeof self !== 'undefined' && typeof window === 'undefined') {
    self.WatsonxService = WatsonxService;
    console.log('✓ WatsonxService exposé sur self (Service Worker)');
  }

  // Pour Window (dashboard)
  if (typeof window !== 'undefined') {
    window.WatsonxService = WatsonxService;
    console.log('✓ WatsonxService exposé sur window (Dashboard)');
    console.log('✓ Méthodes disponibles:', Object.keys(WatsonxService));
    // Vérification supplémentaire
    if (window.WatsonxService) {
      console.log('✓ Vérification: window.WatsonxService est défini');
    } else {
      console.error('❌ Erreur: window.WatsonxService n\'est pas défini après assignation');
    }
  }
  
  // Exposer aussi globalement pour être sûr
  if (typeof globalThis !== 'undefined') {
    globalThis.WatsonxService = WatsonxService;
    console.log('✓ WatsonxService exposé sur globalThis');
  }
} catch (error) {
  console.error('❌ Erreur lors de l\'exposition de WatsonxService:', error);
  console.error('Stack:', error.stack);
  // Essayer quand même d'exposer un service minimal
  if (typeof window !== 'undefined') {
    window.WatsonxService = {
      error: error.message,
      initWatsonxService: () => Promise.reject(error),
      getAuthToken: () => Promise.reject(error)
    };
  }
}

