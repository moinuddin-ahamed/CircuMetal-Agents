"""
Training pipeline for ML estimation models.

Handles:
- Data preparation from MongoDB
- Model training with hyperparameter tuning
- Cross-validation
- Model serialization and versioning
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import os

from .estimators import (
    EmissionFactorEstimator,
    CircularityEstimator,
    EnergyIntensityEstimator,
    EstimatorConfig,
    create_estimator,
)

logger = logging.getLogger(__name__)

# Model storage directory
MODELS_DIR = Path(__file__).parent / "trained_models"
MODELS_DIR.mkdir(exist_ok=True)


class TrainingPipeline:
    """
    Pipeline for training and managing ML models.
    """
    
    def __init__(self, mongo_uri: Optional[str] = None):
        """
        Initialize training pipeline.
        
        Args:
            mongo_uri: MongoDB connection URI (defaults to env var)
        """
        self.mongo_uri = mongo_uri or os.environ.get("MONGO_URI", "mongodb://localhost:27017")
        self.db_name = os.environ.get("MONGO_DB_NAME", "circumetal_lca")
    
    async def load_training_data(
        self,
        estimation_type: str,
        limit: int = 10000
    ) -> Tuple[List[Dict], List[float]]:
        """
        Load training data from MongoDB.
        
        Args:
            estimation_type: Type of estimation (emission_factor, circularity_score, energy_intensity)
            limit: Maximum records to load
            
        Returns:
            Tuple of (feature_dicts, targets)
        """
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
        except ImportError:
            logger.warning("Motor not installed. Using synthetic data.")
            return self._generate_synthetic_data(estimation_type, 500)
        
        client = AsyncIOMotorClient(self.mongo_uri)
        db = client[self.db_name]
        
        training_data = []
        targets = []
        
        try:
            # Load from processes collection
            cursor = db.processes.find({}).limit(limit)
            
            async for process in cursor:
                # Extract features
                features = {
                    "metal_type": process.get("metal_type", "iron_steel"),
                    "process_stage": process.get("stage", "smelting"),
                    "recycled_content": process.get("circular_attributes", {}).get("recycled_input_fraction", 0.0),
                    "production_volume": 100000,  # Default
                    "energy_source": self._extract_energy_source(process),
                    "location": process.get("location", "IN"),
                    "ore_grade": 0.6,  # Default
                    "technology_level": "conventional",
                }
                
                # Extract target
                if estimation_type == "emission_factor":
                    ef = process.get("emission_factors", {})
                    target = ef.get("gwp", ef.get("total_gwp"))
                elif estimation_type == "circularity_score":
                    ca = process.get("circular_attributes", {})
                    target = ca.get("circularity_score", 0.3)
                elif estimation_type == "energy_intensity":
                    # Calculate from inputs
                    inputs = process.get("inputs", [])
                    energy_gj = sum(
                        inp.get("amount", 0) * 0.0036  # kWh to GJ
                        for inp in inputs 
                        if inp.get("category") == "energy"
                    )
                    target = energy_gj
                else:
                    target = None
                
                if target is not None and target > 0:
                    training_data.append(features)
                    targets.append(float(target))
            
            logger.info(f"Loaded {len(training_data)} training samples from database")
            
        finally:
            client.close()
        
        # If not enough data, augment with synthetic
        if len(training_data) < 100:
            logger.info("Augmenting with synthetic data")
            syn_data, syn_targets = self._generate_synthetic_data(estimation_type, 500 - len(training_data))
            training_data.extend(syn_data)
            targets.extend(syn_targets)
        
        return training_data, targets
    
    def _extract_energy_source(self, process: Dict) -> Dict[str, float]:
        """Extract energy source mix from process inputs."""
        inputs = process.get("inputs", [])
        
        energy_inputs = [inp for inp in inputs if inp.get("category") == "energy"]
        if not energy_inputs:
            return {"coal": 0.5, "renewable": 0.1, "natural_gas": 0.2}
        
        energy_mix = {}
        total = 0
        
        for inp in energy_inputs:
            name = inp.get("name", "").lower()
            amount = inp.get("amount", 0)
            
            if "coal" in name or "coking" in name:
                energy_mix["coal"] = energy_mix.get("coal", 0) + amount
            elif "gas" in name:
                energy_mix["natural_gas"] = energy_mix.get("natural_gas", 0) + amount
            elif "electric" in name:
                energy_mix["electricity"] = energy_mix.get("electricity", 0) + amount
            elif "renewable" in name or "solar" in name or "wind" in name:
                energy_mix["renewable"] = energy_mix.get("renewable", 0) + amount
            
            total += amount
        
        # Normalize
        if total > 0:
            energy_mix = {k: v / total for k, v in energy_mix.items()}
        
        return energy_mix
    
    def _generate_synthetic_data(
        self, 
        estimation_type: str, 
        n_samples: int
    ) -> Tuple[List[Dict], List[float]]:
        """Generate synthetic training data."""
        import random
        
        data = []
        targets = []
        
        metals = ["iron_steel", "aluminium", "copper"]
        stages = ["extraction", "smelting", "refining", "rolling", "recycling"]
        
        # Base emission factors
        base_ef = {
            ("iron_steel", "extraction"): 50,
            ("iron_steel", "smelting"): 1800,
            ("iron_steel", "refining"): 200,
            ("iron_steel", "rolling"): 150,
            ("iron_steel", "recycling"): 300,
            ("aluminium", "extraction"): 35,
            ("aluminium", "smelting"): 12500,
            ("aluminium", "refining"): 850,
            ("aluminium", "rolling"): 200,
            ("aluminium", "recycling"): 450,
            ("copper", "extraction"): 40,
            ("copper", "smelting"): 3500,
            ("copper", "refining"): 500,
            ("copper", "rolling"): 180,
            ("copper", "recycling"): 600,
        }
        
        for _ in range(n_samples):
            metal = random.choice(metals)
            stage = random.choice(stages)
            recycled = random.random() * 0.9
            coal = random.uniform(0.2, 0.8)
            renewable = random.uniform(0.0, 0.5)
            tech = random.choice(["conventional", "best_available", "advanced"])
            
            record = {
                "metal_type": metal,
                "process_stage": stage,
                "recycled_content": recycled,
                "production_volume": random.uniform(10000, 5000000),
                "energy_source": {
                    "coal": coal,
                    "renewable": renewable,
                    "natural_gas": 1 - coal - renewable,
                },
                "location": random.choice(["IN-Odisha", "IN-Gujarat", "IN-Karnataka", "IN"]),
                "ore_grade": random.uniform(0.4, 0.7),
                "technology_level": tech,
            }
            
            # Generate target
            if estimation_type == "emission_factor":
                base = base_ef.get((metal, stage), 1000)
                # Apply adjustments
                target = base * (1 - recycled * 0.7)  # Recycling saves emissions
                target *= (1 + coal * 0.2 - renewable * 0.3)  # Energy mix effect
                target *= {"conventional": 1.0, "best_available": 0.85, "advanced": 0.7}[tech]
                target *= random.uniform(0.9, 1.1)  # Noise
                
            elif estimation_type == "circularity_score":
                target = 0.3 * recycled + 0.3 * random.uniform(0.7, 1.0) + 0.2 * random.uniform(0.3, 0.8)
                target = min(1.0, max(0.0, target + random.gauss(0, 0.05)))
                
            elif estimation_type == "energy_intensity":
                base_energy = {
                    ("iron_steel", "smelting"): 18,
                    ("iron_steel", "recycling"): 6,
                    ("aluminium", "smelting"): 55,
                    ("aluminium", "recycling"): 3,
                }.get((metal, stage), 10)
                target = base_energy * (1 - recycled * 0.5)
                target *= random.uniform(0.85, 1.15)
            else:
                target = random.uniform(100, 2000)
            
            data.append(record)
            targets.append(max(0, target))
        
        return data, targets
    
    async def train_all_models(
        self,
        model_type: str = "random_forest",
        save_models: bool = True
    ) -> Dict[str, Dict[str, Any]]:
        """
        Train all estimation models.
        
        Args:
            model_type: Type of model to train
            save_models: Whether to save models to disk
            
        Returns:
            Dictionary of training results by estimation type
        """
        results = {}
        
        estimation_types = ["emission_factor", "circularity_score", "energy_intensity"]
        
        for est_type in estimation_types:
            logger.info(f"Training {est_type} model...")
            
            try:
                # Load data
                training_data, targets = await self.load_training_data(est_type)
                
                # Configure model
                config = EstimatorConfig(
                    model_type=model_type,
                    n_estimators=100,
                    max_depth=10,
                )
                
                # Create and train estimator
                estimator = create_estimator(est_type, config)
                metrics = estimator.train(training_data, targets)
                
                if "error" not in metrics:
                    results[est_type] = {
                        "status": "success",
                        "metrics": metrics,
                        "samples": len(training_data),
                    }
                    
                    if save_models:
                        model_path = MODELS_DIR / f"{est_type}_{model_type}.pkl"
                        estimator.save(str(model_path))
                        results[est_type]["model_path"] = str(model_path)
                else:
                    results[est_type] = {
                        "status": "failed",
                        "error": metrics.get("error", "Unknown error"),
                    }
                    
            except Exception as e:
                logger.error(f"Error training {est_type}: {e}")
                results[est_type] = {
                    "status": "error",
                    "error": str(e),
                }
        
        return results
    
    def load_trained_model(self, estimation_type: str, model_type: str = "random_forest"):
        """Load a trained model from disk."""
        model_path = MODELS_DIR / f"{estimation_type}_{model_type}.pkl"
        
        if not model_path.exists():
            logger.warning(f"Model not found: {model_path}")
            return None
        
        estimator = create_estimator(estimation_type)
        estimator.load(str(model_path))
        
        return estimator


async def main():
    """Run training pipeline."""
    logging.basicConfig(level=logging.INFO)
    
    pipeline = TrainingPipeline()
    
    print("=" * 60)
    print("CircuMetal ML Training Pipeline")
    print("=" * 60)
    
    results = await pipeline.train_all_models(
        model_type="random_forest",
        save_models=True
    )
    
    print("\nTraining Results:")
    print("-" * 40)
    
    for est_type, result in results.items():
        status = result.get("status", "unknown")
        print(f"\n{est_type}:")
        print(f"  Status: {status}")
        
        if status == "success":
            metrics = result.get("metrics", {})
            print(f"  R²: {metrics.get('r2', 0):.4f}")
            print(f"  RMSE: {metrics.get('rmse', 0):.2f}")
            print(f"  Samples: {result.get('samples', 0)}")
            if "model_path" in result:
                print(f"  Saved to: {result['model_path']}")
        else:
            print(f"  Error: {result.get('error', 'Unknown')}")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
