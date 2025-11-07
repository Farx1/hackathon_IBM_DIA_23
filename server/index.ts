import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";
import { config } from "dotenv";
import { spawn } from "child_process";

// Charger les variables d'environnement depuis .env
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Variables d'environnement
const IBM_API_KEY = process.env.IBM_API_KEY;
const IBM_PROJECT_ID = process.env.IBM_PROJECT_ID;
const IBM_DEPLOYMENT_ID = process.env.IBM_DEPLOYMENT_ID || "hckt23";
const IBM_REGION = process.env.IBM_REGION || "eu-de";

// Cache pour le token IAM (valide 50 minutes)
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Obtenir un token IAM depuis IBM Cloud
 */
async function getIAMToken(): Promise<string> {
  // Vérifier le cache
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  if (!IBM_API_KEY) {
    throw new Error("IBM_API_KEY non configurée dans les variables d'environnement");
  }

  return new Promise((resolve, reject) => {
    const requestBody = `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(IBM_API_KEY)}`;
    
    const options = {
      hostname: "iam.cloud.ibm.com",
      path: "/identity/token",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "Content-Length": Buffer.byteLength(requestBody)
      },
      timeout: 10000
    };
    
    const req = https.request(options, (res) => {
      let data = "";
      
      res.on("data", (chunk) => {
        data += chunk;
      });
      
      res.on("end", () => {
        try {
          if (res.statusCode !== 200) {
            const errorText = data || `HTTP ${res.statusCode}`;
            reject(new Error(`Erreur HTTP ${res.statusCode}: ${errorText.substring(0, 200)}`));
            return;
          }
          
          const tokenResponse = JSON.parse(data);
          const accessToken = tokenResponse.access_token;
          
          if (!accessToken) {
            reject(new Error("Token IAM non reçu dans la réponse"));
            return;
          }
          
          // Mettre en cache (expire dans 50 minutes)
          cachedToken = accessToken;
          tokenExpiry = Date.now() + (50 * 60 * 1000);
          
          console.log("✅ Token IAM obtenu avec succès");
          resolve(accessToken);
        } catch (ex) {
          reject(new Error("Erreur parsing token response: " + (ex instanceof Error ? ex.message : String(ex))));
        }
      });
    });
    
    req.on("error", (error) => {
      reject(new Error("Erreur réseau lors de l'obtention du token IAM: " + error.message));
    });
    
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout lors de l'obtention du token IAM"));
    });
    
    req.setTimeout(10000);
    req.write(requestBody);
    req.end();
  });
}

/**
 * Faire une prédiction avec le modèle déployé sur Watsonx
 */
async function predictEnergy(params: {
  totalDuration: number;
  promptTokens: number;
  responseTokens: number;
  responseDuration: number;
  wordCount: number;
  readingTime: number;
}): Promise<number> {
  if (!IBM_DEPLOYMENT_ID) {
    throw new Error("IBM_DEPLOYMENT_ID non configuré dans les variables d'environnement");
  }

  const token = await getIAMToken();
  
  // Construire l'URL de scoring (essayer privé d'abord, puis public)
  const privateUrl = `https://private.${IBM_REGION}.ml.cloud.ibm.com/ml/v4/deployments/${IBM_DEPLOYMENT_ID}/predictions?version=2021-05-01`;
  const publicUrl = `https://${IBM_REGION}.ml.cloud.ibm.com/ml/v4/deployments/${IBM_DEPLOYMENT_ID}/predictions?version=2021-05-01`;
  
  const endpoints = [privateUrl, publicUrl];
  
  // Préparer le payload
  const inputFields = [
    "total_duration",
    "prompt_token_length",
    "response_token_length",
    "response_duration",
    "word_count",
    "reading_time"
  ];
  
  // S'assurer que toutes les valeurs sont des nombres
  const inputValues = [
    typeof params.totalDuration === 'number' ? params.totalDuration : (parseFloat(params.totalDuration) || 0),
    typeof params.promptTokens === 'number' ? params.promptTokens : (parseInt(params.promptTokens) || 0),
    typeof params.responseTokens === 'number' ? params.responseTokens : (parseInt(params.responseTokens) || 0),
    typeof params.responseDuration === 'number' ? params.responseDuration : (parseFloat(params.responseDuration) || 0),
    typeof params.wordCount === 'number' ? params.wordCount : (parseInt(params.wordCount) || 0),
    typeof params.readingTime === 'number' ? params.readingTime : (parseFloat(params.readingTime) || 0)
  ];
  
  // Log pour debug
  console.log('📦 Payload pour Watsonx:', {
    fields: inputFields,
    values: inputValues
  });
  
  const payload = {
    input_data: [{
      fields: inputFields,
      values: [inputValues]
    }]
  };
  
  // Essayer chaque endpoint
  let lastError: Error | null = null;
  
  for (const endpoint of endpoints) {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        const url = new URL(endpoint);
        const isHttps = url.protocol === "https:";
        const client = isHttps ? https : http;
        
        const payloadString = JSON.stringify(payload);
        
        const options = {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json;charset=UTF-8",
            "Content-Length": Buffer.byteLength(payloadString)
          },
          timeout: 30000
        };
        
        const req = client.request(options, (res) => {
          let data = "";
          
          res.on("data", (chunk) => {
            data += chunk;
          });
          
          res.on("end", () => {
            try {
              if (res.statusCode !== 200) {
                const errorText = data || `HTTP ${res.statusCode}`;
                reject(new Error(`Erreur HTTP ${res.statusCode}: ${errorText.substring(0, 200)}`));
                return;
              }
              
              const parsedResponse = JSON.parse(data);
              resolve(parsedResponse);
            } catch (ex) {
              reject(new Error("Erreur parsing response: " + (ex instanceof Error ? ex.message : String(ex))));
            }
          });
        });
        
        req.on("error", (error) => {
          reject(new Error("Erreur réseau: " + error.message));
        });
        
        req.on("timeout", () => {
          req.destroy();
          reject(new Error("Timeout lors de la prédiction après 60 secondes"));
        });
        
        req.setTimeout(60000); // 60 secondes (augmenté pour les requêtes lentes)
        req.write(payloadString);
        req.end();
      });
      
      // Extraire la prédiction d'énergie
      let energyJoules: number | null = null;
      
      if (result.predictions && result.predictions.length > 0) {
        const prediction = result.predictions[0];
        if (Array.isArray(prediction.values) && prediction.values.length > 0) {
          energyJoules = prediction.values[0];
        } else if (typeof prediction === "number") {
          energyJoules = prediction;
        } else if (prediction.energy_joules) {
          energyJoules = prediction.energy_joules;
        } else if (prediction.energy) {
          energyJoules = prediction.energy;
        }
      } else if (result.values && Array.isArray(result.values) && result.values.length > 0) {
        energyJoules = result.values[0];
      } else if (typeof result === "number") {
        energyJoules = result;
      }
      
      if (energyJoules !== null && typeof energyJoules === "number" && energyJoules >= 0) {
        console.log(`✅ Prédiction réussie: ${energyJoules.toFixed(8)} J`);
        return energyJoules;
      } else {
        lastError = new Error("Format de réponse inattendu");
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`⚠️ Erreur avec endpoint ${endpoint}:`, lastError.message);
      continue;
    }
  }
  
  throw lastError || new Error("Aucun endpoint disponible pour les prédictions");
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Middleware pour parser JSON
  app.use(express.json());
  
  // CORS pour permettre les requêtes depuis l'extension
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Endpoint de santé
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok",
      hasConfig: !!IBM_API_KEY && !!IBM_PROJECT_ID && !!IBM_DEPLOYMENT_ID,
      region: IBM_REGION
    });
  });

  // Endpoint pour tester l'authentification
  app.get("/api/test-auth", async (_req, res) => {
    try {
      const token = await getIAMToken();
      res.json({ 
        success: true,
        message: "Authentification réussie",
        hasToken: !!token,
        deploymentId: IBM_DEPLOYMENT_ID,
        region: IBM_REGION
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint pour prédiction avec MLPRegressorDeep (modèle Python local)
  app.post("/api/predict-mlp", async (req, res) => {
    try {
      const { totalDuration, promptTokens, responseTokens, responseDuration, wordCount, readingTime } = req.body;
      
      // Vérifier que toutes les données nécessaires sont présentes
      if (
        totalDuration === undefined ||
        promptTokens === undefined ||
        responseTokens === undefined ||
        responseDuration === undefined ||
        wordCount === undefined ||
        readingTime === undefined
      ) {
        return res.status(400).json({
          success: false,
          error: "Données incomplètes. Requis: totalDuration, promptTokens, responseTokens, responseDuration, wordCount, readingTime"
        });
      }

      // Préparer les données pour le script Python
      const features = {
        total_duration: totalDuration,
        prompt_token_length: promptTokens,
        response_token_length: responseTokens,
        response_duration: responseDuration,
        word_count: wordCount,
        reading_time: readingTime
      };

      const inputData = JSON.stringify({ features });

      // Chemin vers le script Python
      const pythonScriptPath = path.resolve(__dirname, "mlp_predictor.py");
      
      // Vérifier que le fichier existe
      const fs = await import("fs/promises");
      try {
        await fs.access(pythonScriptPath);
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: `Script Python introuvable: ${pythonScriptPath}`
        });
      }
      
      // Détecter la commande Python (python3 sur Linux/Mac, python sur Windows)
      const pythonCommand = process.platform === "win32" ? "python" : "python3";
      
      // Exécuter le script Python
      const pythonProcess = spawn(pythonCommand, [pythonScriptPath], {
        cwd: path.dirname(pythonScriptPath),
        env: { ...process.env, PYTHONUNBUFFERED: "1" } // Désactiver le buffering Python
      });

      let stdout = "";
      let stderr = "";

      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      // Envoyer les données au script Python
      pythonProcess.stdin.write(inputData);
      pythonProcess.stdin.end();

      // Attendre la fin du processus avec timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          pythonProcess.kill();
          reject(new Error(`Timeout: Script Python n'a pas répondu dans les 30 secondes`));
        }, 30000); // 30 secondes timeout

        pythonProcess.on("close", (code) => {
          clearTimeout(timeout);
          if (code !== 0) {
            reject(new Error(`Script Python terminé avec code ${code}: ${stderr || 'Aucune sortie d\'erreur'}`));
          } else {
            resolve();
          }
        });

        pythonProcess.on("error", (error) => {
          clearTimeout(timeout);
          reject(new Error(`Erreur exécution script Python: ${error.message}. Vérifiez que Python est installé et dans le PATH.`));
        });
      });

      // Vérifier que stdout n'est pas vide
      if (!stdout || stdout.trim() === "") {
        return res.status(500).json({
          success: false,
          error: `Script Python n'a retourné aucune sortie. Erreurs: ${stderr || 'Aucune'}`,
          stderr: stderr
        });
      }

      // Parser la réponse JSON
      let result;
      try {
        result = JSON.parse(stdout);
      } catch (parseError) {
        return res.status(500).json({
          success: false,
          error: `Erreur parsing réponse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Sortie: ${stdout.substring(0, 200)}`,
          stdout: stdout.substring(0, 500),
          stderr: stderr
        });
      }

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || "Erreur lors de la prédiction MLP",
          stderr: stderr
        });
      }

      res.json({
        success: true,
        energy: result.energy
      });
    } catch (error) {
      console.error("❌ Erreur prédiction MLP:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint pour prédictions batch avec MLPRegressorDeep
  app.post("/api/predict-mlp-batch", async (req, res) => {
    try {
      const { data } = req.body;

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Données invalides: un tableau non vide est requis"
        });
      }

      // Préparer les données batch pour le script Python
      const batch = data.map((item: any) => ({
        total_duration: item.totalDuration || item.total_duration || 0,
        prompt_token_length: item.promptTokens || item.prompt_token_length || 0,
        response_token_length: item.responseTokens || item.response_token_length || 0,
        response_duration: item.responseDuration || item.response_duration || 0,
        word_count: item.wordCount || item.word_count || 0,
        reading_time: item.readingTime || item.reading_time || 0
      }));

      const inputData = JSON.stringify({ batch });

      // Chemin vers le script Python
      const pythonScriptPath = path.resolve(__dirname, "mlp_predictor.py");
      
      // Vérifier que le fichier existe
      const fsBatch = await import("fs/promises");
      try {
        await fsBatch.access(pythonScriptPath);
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: `Script Python introuvable: ${pythonScriptPath}`
        });
      }
      
      // Détecter la commande Python (python3 sur Linux/Mac, python sur Windows)
      const pythonCommand = process.platform === "win32" ? "python" : "python3";
      
      // Exécuter le script Python
      const pythonProcess = spawn(pythonCommand, [pythonScriptPath], {
        cwd: path.dirname(pythonScriptPath),
        env: { ...process.env, PYTHONUNBUFFERED: "1" } // Désactiver le buffering Python
      });

      let stdout = "";
      let stderr = "";

      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      // Envoyer les données au script Python
      pythonProcess.stdin.write(inputData);
      pythonProcess.stdin.end();

      // Attendre la fin du processus avec timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          pythonProcess.kill();
          reject(new Error(`Timeout: Script Python n'a pas répondu dans les 60 secondes`));
        }, 60000); // 60 secondes timeout pour batch

        pythonProcess.on("close", (code) => {
          clearTimeout(timeout);
          if (code !== 0) {
            reject(new Error(`Script Python terminé avec code ${code}: ${stderr || 'Aucune sortie d\'erreur'}`));
          } else {
            resolve();
          }
        });

        pythonProcess.on("error", (error) => {
          clearTimeout(timeout);
          reject(new Error(`Erreur exécution script Python: ${error.message}. Vérifiez que Python est installé et dans le PATH.`));
        });
      });

      // Vérifier que stdout n'est pas vide
      if (!stdout || stdout.trim() === "") {
        return res.status(500).json({
          success: false,
          error: `Script Python n'a retourné aucune sortie. Erreurs: ${stderr || 'Aucune'}`,
          stderr: stderr
        });
      }

      // Parser la réponse JSON
      let result;
      try {
        result = JSON.parse(stdout);
      } catch (parseError) {
        return res.status(500).json({
          success: false,
          error: `Erreur parsing réponse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Sortie: ${stdout.substring(0, 200)}`,
          stdout: stdout.substring(0, 500),
          stderr: stderr
        });
      }

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || "Erreur lors des prédictions MLP batch"
        });
      }

      // Transformer les résultats pour correspondre au format attendu
      const results = result.results.map((item: any) => ({
        ...item.input,
        energyJoules: item.success ? item.energy : null,
        success: item.success,
        error: item.error || null,
        source: "mlp-regressor"
      }));

      res.json({
        success: true,
        results,
        stats: {
          total: results.length,
          success: results.filter((r: any) => r.success).length,
          errors: results.filter((r: any) => !r.success).length
        }
      });
    } catch (error) {
      console.error("❌ Erreur prédiction MLP batch:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint pour les prédictions
  app.post("/api/predict", async (req, res) => {
    try {
      let { totalDuration, promptTokens, responseTokens, responseDuration, wordCount, readingTime } = req.body;
      
      // Normaliser les paramètres en nombres (gérer les strings, null, undefined)
      totalDuration = typeof totalDuration === 'number' ? totalDuration : (parseFloat(totalDuration) || 0);
      promptTokens = typeof promptTokens === 'number' ? promptTokens : (parseInt(promptTokens) || 0);
      responseTokens = typeof responseTokens === 'number' ? responseTokens : (parseInt(responseTokens) || 0);
      responseDuration = typeof responseDuration === 'number' ? responseDuration : (parseFloat(responseDuration) || 0);
      wordCount = typeof wordCount === 'number' ? wordCount : (parseInt(wordCount) || 0);
      readingTime = typeof readingTime === 'number' ? readingTime : (parseFloat(readingTime) || 0);
      
      // Log pour debug
      console.log('📥 Données reçues:', {
        totalDuration,
        promptTokens,
        responseTokens,
        responseDuration,
        wordCount,
        readingTime
      });
      
      // Valider que les paramètres essentiels sont présents
      if (isNaN(totalDuration) || isNaN(promptTokens) || isNaN(responseTokens)) {
        res.status(400).json({ 
          success: false,
          error: "Paramètres invalides. totalDuration, promptTokens et responseTokens sont requis."
        });
        return;
      }
      
      const energyJoules = await predictEnergy({
        totalDuration,
        promptTokens,
        responseTokens,
        responseDuration,
        wordCount,
        readingTime
      });
      
      res.json({
        success: true,
        energyJoules,
        source: "watsonx-deployed"
      });
    } catch (error) {
      console.error("❌ Erreur prédiction:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint pour les prédictions en batch
  app.post("/api/predict-batch", async (req, res) => {
    try {
      const { data } = req.body;
      
      if (!Array.isArray(data) || data.length === 0) {
        res.status(400).json({ 
          success: false,
          error: "Paramètre 'data' doit être un tableau non vide"
        });
        return;
      }
      
      const results = [];
      let successCount = 0;
      let errorCount = 0;
      
      for (const item of data) {
        try {
          const { total_duration, prompt_token_length, response_token_length, response_duration, word_count, reading_time } = item;
          
          if (typeof total_duration !== "number" || 
              typeof prompt_token_length !== "number" || 
              typeof response_token_length !== "number") {
            results.push({
              ...item,
              success: false,
              error: "Paramètres invalides"
            });
            errorCount++;
            continue;
          }
          
          const energyJoules = await predictEnergy({
            totalDuration: total_duration || 0,
            promptTokens: prompt_token_length || 0,
            responseTokens: response_token_length || 0,
            responseDuration: response_duration || 0,
            wordCount: word_count || 0,
            readingTime: reading_time || 0
          });
          
          results.push({
            ...item,
            success: true,
            energyJoules,
            source: "watsonx-deployed"
          });
          successCount++;
        } catch (error) {
          results.push({
            ...item,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
          errorCount++;
        }
      }
      
      res.json({
        success: true,
        results,
        stats: {
          total: data.length,
          success: successCount,
          errors: errorCount
        }
      });
    } catch (error) {
      console.error("❌ Erreur prédiction batch:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}/`);
    console.log(`📊 API endpoints:`);
    console.log(`   GET  /api/health - Vérifier l'état du serveur`);
    console.log(`   GET  /api/test-auth - Tester l'authentification`);
    console.log(`   POST /api/predict - Prédiction unique (Watsonx)`);
    console.log(`   POST /api/predict-batch - Prédictions en batch (Watsonx)`);
    console.log(`   POST /api/predict-mlp - Prédiction unique (MLP Regressor Deep)`);
    console.log(`   POST /api/predict-mlp-batch - Prédictions en batch (MLP Regressor Deep)`);
    
    if (!IBM_API_KEY || !IBM_PROJECT_ID || !IBM_DEPLOYMENT_ID) {
      console.warn(`⚠️  Variables d'environnement manquantes:`);
      if (!IBM_API_KEY) console.warn(`   - IBM_API_KEY`);
      if (!IBM_PROJECT_ID) console.warn(`   - IBM_PROJECT_ID`);
      if (!IBM_DEPLOYMENT_ID) console.warn(`   - IBM_DEPLOYMENT_ID`);
      console.warn(`   Créez un fichier .env avec ces variables`);
    } else {
      console.log(`✅ Configuration Watsonx chargée`);
      console.log(`   Région: ${IBM_REGION}`);
      console.log(`   Deployment ID: ${IBM_DEPLOYMENT_ID}`);
    }
  });
}

startServer().catch(console.error);

