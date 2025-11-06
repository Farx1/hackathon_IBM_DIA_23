/**
 * Configuration Watsonx
 * Variables d'environnement à définir dans .env ou chrome.storage.local
 */

const WATSONX_CONFIG = {
  // Configuration par défaut (sera remplacée par les valeurs du storage)
  apiKey: null,
  apiUrl: 'https://us-south.ml.cloud.ibm.com', // ou eu-de, jp-tok, etc.
  projectId: null,
  deploymentId: null,
  
  // Endpoints
  endpoints: {
    dataAssets: '/ml/v4/data_assets',
    projects: '/ml/v4/projects',
    datasets: '/ml/v4/datasets',
    analytics: '/ml/v4/analytics'
  },
  
  // Cache
  cacheEnabled: true,
  cacheExpiry: 3600000, // 1 heure en ms
};

/**
 * Charger la configuration depuis chrome.storage.local
 */
async function loadWatsonxConfig() {
  try {
    const result = await chrome.storage.local.get(['watsonxConfig']);
    
    if (result.watsonxConfig) {
      Object.assign(WATSONX_CONFIG, result.watsonxConfig);
      console.log('✓ Configuration Watsonx chargée');
      return true;
    } else {
      console.warn('⚠️ Configuration Watsonx non trouvée. Utilisez le popup pour configurer.');
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur chargement config:', error);
    return false;
  }
}

/**
 * Sauvegarder la configuration
 */
async function saveWatsonxConfig(config) {
  try {
    await chrome.storage.local.set({ watsonxConfig: config });
    Object.assign(WATSONX_CONFIG, config);
    console.log('✓ Configuration Watsonx sauvegardée');
    return true;
  } catch (error) {
    console.error('❌ Erreur sauvegarde config:', error);
    return false;
  }
}

// Export pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WATSONX_CONFIG, loadWatsonxConfig, saveWatsonxConfig };
}

