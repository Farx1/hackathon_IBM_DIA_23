#!/usr/bin/env python3
"""
Script Python pour charger et utiliser le modèle MLPRegressorDeep
pour prédire la consommation énergétique
"""

import sys
import json
import pickle
import os
from pathlib import Path

# Chemin vers le modèle
MODEL_PATH = Path(__file__).parent.parent / "data&model" / "MLPRegressorDeep_model.pkl"

# Cache global pour le modèle (chargé une seule fois)
_model_cache = None

def load_model():
    """Charger le modèle MLPRegressorDeep depuis le fichier .pkl (avec cache)"""
    global _model_cache
    
    if _model_cache is not None:
        return _model_cache
    
    try:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Modèle non trouvé: {MODEL_PATH}")
        
        with open(MODEL_PATH, 'rb') as f:
            _model_cache = pickle.load(f)
        return _model_cache
    except FileNotFoundError as e:
        raise Exception(f"Fichier modèle introuvable: {str(e)}")
    except Exception as e:
        raise Exception(f"Erreur lors du chargement du modèle: {str(e)}")

def predict_energy(model, features):
    """
    Prédire la consommation énergétique
    
    Args:
        model: Modèle MLPRegressor chargé
        features: Dict avec les features suivantes:
            - total_duration: Durée totale (secondes)
            - prompt_token_length: Nombre de tokens du prompt
            - response_token_length: Nombre de tokens de la réponse
            - response_duration: Durée de la réponse (secondes)
            - word_count: Nombre de mots
            - reading_time: Temps de lecture (secondes)
    
    Returns:
        float: Énergie prédite en Joules
    """
    try:
        # Extraire les features dans l'ordre attendu par le modèle
        # Note: L'ordre peut varier selon l'entraînement, ajustez si nécessaire
        feature_array = [
            features.get('total_duration', 0),
            features.get('prompt_token_length', 0),
            features.get('response_token_length', 0),
            features.get('response_duration', 0),
            features.get('word_count', 0),
            features.get('reading_time', 0)
        ]
        
        # Faire la prédiction
        prediction = model.predict([feature_array])[0]
        
        # S'assurer que la prédiction est positive
        return max(0, float(prediction))
    except Exception as e:
        raise Exception(f"Erreur lors de la prédiction: {str(e)}")

def main():
    """Point d'entrée principal"""
    try:
        # Charger le modèle une seule fois
        model = load_model()
        
        # Lire les données depuis stdin (JSON)
        input_data = json.loads(sys.stdin.read())
        
        # Vérifier si c'est une prédiction unique ou batch
        if 'features' in input_data:
            # Prédiction unique
            energy = predict_energy(model, input_data['features'])
            result = {
                'success': True,
                'energy': energy
            }
        elif 'batch' in input_data:
            # Prédictions batch
            results = []
            for item in input_data['batch']:
                try:
                    energy = predict_energy(model, item)
                    results.append({
                        'success': True,
                        'energy': energy,
                        'input': item
                    })
                except Exception as e:
                    results.append({
                        'success': False,
                        'error': str(e),
                        'input': item
                    })
            
            result = {
                'success': True,
                'results': results
            }
        else:
            raise ValueError("Format invalide: 'features' ou 'batch' requis")
        
        # Écrire le résultat en JSON sur stdout
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    main()

