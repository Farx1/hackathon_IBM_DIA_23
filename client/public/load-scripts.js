/**
 * Charger les scripts Watsonx dans le bon ordre
 * Ce fichier est chargé directement depuis dashboard.html pour éviter les violations CSP
 */

(function() {
  // Vérifier que chrome.runtime est disponible
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    console.log('🔵 load-scripts.js: Démarrage du chargement des scripts');
    
    const watsonxConfigScript = document.createElement('script');
    watsonxConfigScript.src = chrome.runtime.getURL('watsonx-config.js');
    watsonxConfigScript.onload = () => {
      console.log('✓ watsonx-config.js chargé');
      
      const watsonxServiceScript = document.createElement('script');
      watsonxServiceScript.src = chrome.runtime.getURL('watsonx-service.js');
      watsonxServiceScript.onload = () => {
        console.log('✓ watsonx-service.js chargé');
        
        // Attendre un peu pour que le script s'exécute
        setTimeout(() => {
          if (window.WatsonxService) {
            console.log('✓ WatsonxService disponible');
          } else {
            console.warn('⚠️ WatsonxService non disponible après chargement');
          }
          
          // Charger dashboard.js maintenant
          const dashboardScript = document.createElement('script');
          dashboardScript.src = chrome.runtime.getURL('dashboard.js');
          dashboardScript.onload = () => {
            console.log('✓ dashboard.js chargé');
          };
          dashboardScript.onerror = (error) => {
            console.error('❌ Erreur chargement dashboard.js:', error);
          };
          document.head.appendChild(dashboardScript);
        }, 500);
      };
      watsonxServiceScript.onerror = (error) => {
        console.error('❌ Erreur chargement watsonx-service.js:', error);
        // Charger dashboard.js quand même
        const dashboardScript = document.createElement('script');
        dashboardScript.src = chrome.runtime.getURL('dashboard.js');
        document.head.appendChild(dashboardScript);
      };
      document.head.appendChild(watsonxServiceScript);
    };
    watsonxConfigScript.onerror = (error) => {
      console.error('❌ Erreur chargement watsonx-config.js:', error);
      // Essayer de charger watsonx-service.js quand même
      const watsonxServiceScript = document.createElement('script');
      watsonxServiceScript.src = chrome.runtime.getURL('watsonx-service.js');
      watsonxServiceScript.onload = () => {
        const dashboardScript = document.createElement('script');
        dashboardScript.src = chrome.runtime.getURL('dashboard.js');
        document.head.appendChild(dashboardScript);
      };
      document.head.appendChild(watsonxServiceScript);
    };
    document.head.appendChild(watsonxConfigScript);
  } else {
    console.error('❌ chrome.runtime.getURL non disponible');
    // Charger dashboard.js quand même
    const dashboardScript = document.createElement('script');
    dashboardScript.src = 'dashboard.js';
    document.head.appendChild(dashboardScript);
  }
})();

