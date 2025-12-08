"""
ML Estimators for CircuMetal LCA Platform.

Provides ensemble models for estimating:
- Emission factors (GWP, water, energy)
- Circularity scores
- Energy intensity

Uses RandomForest and GradientBoosting with uncertainty quantification.
"""

import numpy as np
import pickle
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Try to import sklearn, provide fallback for missing dependency
try:
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
    from sklearn.preprocessing import LabelEncoder, StandardScaler
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("scikit-learn not installed. ML estimation will use rule-based fallback.")


@dataclass
class EstimatorConfig:
    """Configuration for estimators."""
    model_type: str = "random_forest"
    n_estimators: int = 100
    max_depth: int = 10
    min_samples_split: int = 5
    random_state: int = 42
    quantile_alpha: float = 0.05  # For 90% confidence interval


@dataclass 
class EstimationResult:
    """Result from estimator."""
    value: float
    confidence: float
    lower_bound: float
    upper_bound: float
    method: str
    features_used: List[str] = field(default_factory=list)


class BaseEstimator:
    """Base class for all estimators."""
    
    # Default emission factors for fallback
    DEFAULT_EMISSION_FACTORS = {
        ("iron_steel", "extraction"): 50.0,
        ("iron_steel", "smelting"): 1800.0,
        ("iron_steel", "refining"): 200.0,
        ("iron_steel", "rolling"): 150.0,
        ("iron_steel", "recycling"): 300.0,
        ("aluminium", "extraction"): 35.0,
        ("aluminium", "refining"): 850.0,
        ("aluminium", "smelting"): 12500.0,
        ("aluminium", "recycling"): 450.0,
        ("copper", "extraction"): 40.0,
        ("copper", "smelting"): 3500.0,
        ("copper", "recycling"): 600.0,
    }
    
    # Location-based grid carbon intensity (kg CO2/kWh)
    GRID_INTENSITY = {
        "IN-Odisha": 0.85,
        "IN-Chhattisgarh": 0.92,
        "IN-Karnataka": 0.58,
        "IN-Gujarat": 0.62,
        "IN-Maharashtra": 0.72,
        "IN-Jharkhand": 0.88,
        "IN-Tamil Nadu": 0.48,
        "IN": 0.71,  # India average
        "GLO": 0.50,  # Global average
    }

    def __init__(self, config: Optional[EstimatorConfig] = None):
        """Initialize estimator."""
        self.config = config or EstimatorConfig()
        self.model = None
        self.scaler = None
        self.encoders: Dict[str, Any] = {}
        self.feature_names: List[str] = []
        self.is_trained = False
        self.model_version = "1.0.0"
        self.trained_at: Optional[datetime] = None

    def _encode_categorical(self, value: str, feature_name: str) -> int:
        """Encode categorical feature."""
        if feature_name not in self.encoders:
            self.encoders[feature_name] = {}
        
        encoder = self.encoders[feature_name]
        if value not in encoder:
            encoder[value] = len(encoder)
        
        return encoder[value]

    def _prepare_features(self, data: Dict[str, Any]) -> np.ndarray:
        """Prepare feature vector from input data."""
        features = []
        feature_names = []
        
        # Metal type (encoded)
        metal = data.get("metal_type", "iron_steel")
        features.append(self._encode_categorical(metal, "metal_type"))
        feature_names.append("metal_type")
        
        # Process stage (encoded)
        stage = data.get("process_stage", "smelting")
        features.append(self._encode_categorical(stage, "process_stage"))
        feature_names.append("process_stage")
        
        # Recycled content
        recycled = data.get("recycled_content", 0.0) or 0.0
        features.append(recycled)
        feature_names.append("recycled_content")
        
        # Production volume (log scale)
        volume = data.get("production_volume", 100000) or 100000
        features.append(np.log10(max(volume, 1)))
        feature_names.append("log_production_volume")
        
        # Energy mix features
        energy = data.get("energy_source", {}) or {}
        features.append(energy.get("coal", 0.5))
        feature_names.append("coal_share")
        features.append(energy.get("renewable", 0.1))
        feature_names.append("renewable_share")
        features.append(energy.get("natural_gas", 0.2))
        feature_names.append("gas_share")
        
        # Grid carbon intensity
        location = data.get("location", "IN")
        grid_intensity = self.GRID_INTENSITY.get(location, 0.71)
        features.append(grid_intensity)
        feature_names.append("grid_intensity")
        
        # Ore grade
        grade = data.get("ore_grade", 0.6) or 0.6
        features.append(grade)
        feature_names.append("ore_grade")
        
        # Technology level
        tech = data.get("technology_level", "conventional")
        tech_score = {"conventional": 0.0, "best_available": 0.5, "advanced": 1.0}.get(tech, 0.0)
        features.append(tech_score)
        feature_names.append("technology_score")
        
        self.feature_names = feature_names
        return np.array(features).reshape(1, -1)

    def _get_fallback_estimate(self, data: Dict[str, Any]) -> Tuple[float, float]:
        """Get rule-based fallback estimate."""
        metal = data.get("metal_type", "iron_steel")
        stage = data.get("process_stage", "smelting")
        recycled = data.get("recycled_content", 0.0) or 0.0
        
        # Get base emission factor
        key = (metal, stage)
        base_ef = self.DEFAULT_EMISSION_FACTORS.get(key, 1000.0)
        
        # Adjust for recycled content (recycling saves ~70-95% of emissions)
        recycled_savings = recycled * 0.8  # 80% savings per unit recycled content
        adjusted_ef = base_ef * (1 - recycled_savings)
        
        # Adjust for energy mix
        energy = data.get("energy_source", {}) or {}
        renewable_share = energy.get("renewable", 0.1)
        coal_share = energy.get("coal", 0.5)
        
        # More coal = higher emissions, more renewable = lower
        energy_factor = 1.0 + (coal_share - 0.5) * 0.3 - renewable_share * 0.2
        adjusted_ef *= energy_factor
        
        # Adjust for technology
        tech = data.get("technology_level", "conventional")
        tech_factor = {"conventional": 1.0, "best_available": 0.85, "advanced": 0.7}.get(tech, 1.0)
        adjusted_ef *= tech_factor
        
        # Estimate uncertainty (higher for less data)
        uncertainty = 0.25  # 25% uncertainty for rule-based
        
        return adjusted_ef, uncertainty


class EmissionFactorEstimator(BaseEstimator):
    """Estimator for emission factors (kg CO2e per tonne)."""
    
    def __init__(self, config: Optional[EstimatorConfig] = None):
        super().__init__(config)
        self.estimation_type = "emission_factor"

    def estimate(self, data: Dict[str, Any]) -> EstimationResult:
        """
        Estimate emission factor for given parameters.
        
        Args:
            data: Dictionary with process parameters
            
        Returns:
            EstimationResult with value and uncertainty
        """
        if self.is_trained and SKLEARN_AVAILABLE and self.model is not None:
            return self._ml_estimate(data)
        else:
            return self._rule_based_estimate(data)

    def _ml_estimate(self, data: Dict[str, Any]) -> EstimationResult:
        """ML-based estimation with uncertainty quantification."""
        features = self._prepare_features(data)
        
        if self.scaler is not None:
            features = self.scaler.transform(features)
        
        # Get prediction
        prediction = self.model.predict(features)[0]
        
        # Get uncertainty from tree variance (for RandomForest)
        if hasattr(self.model, 'estimators_'):
            tree_predictions = np.array([tree.predict(features)[0] for tree in self.model.estimators_])
            std = np.std(tree_predictions)
            lower = prediction - 1.96 * std
            upper = prediction + 1.96 * std
            confidence = max(0.5, 1.0 - (std / prediction) if prediction > 0 else 0.5)
        else:
            # GradientBoosting doesn't have individual trees for variance
            std = prediction * 0.15  # Assume 15% uncertainty
            lower = prediction - 1.96 * std
            upper = prediction + 1.96 * std
            confidence = 0.80
        
        return EstimationResult(
            value=max(0, prediction),
            confidence=min(1.0, confidence),
            lower_bound=max(0, lower),
            upper_bound=max(0, upper),
            method="random_forest" if hasattr(self.model, 'estimators_') else "gradient_boosting",
            features_used=self.feature_names
        )

    def _rule_based_estimate(self, data: Dict[str, Any]) -> EstimationResult:
        """Rule-based fallback estimation."""
        value, uncertainty = self._get_fallback_estimate(data)
        
        lower = value * (1 - uncertainty)
        upper = value * (1 + uncertainty)
        confidence = 0.7  # Lower confidence for rule-based
        
        return EstimationResult(
            value=value,
            confidence=confidence,
            lower_bound=lower,
            upper_bound=upper,
            method="rule_based",
            features_used=["metal_type", "process_stage", "recycled_content", "energy_source"]
        )

    def train(self, training_data: List[Dict[str, Any]], targets: List[float]) -> Dict[str, float]:
        """
        Train the estimation model.
        
        Args:
            training_data: List of feature dictionaries
            targets: List of target emission factors
            
        Returns:
            Dictionary of training metrics
        """
        if not SKLEARN_AVAILABLE:
            logger.warning("scikit-learn not available. Cannot train model.")
            return {"error": "sklearn not installed"}
        
        # Prepare features
        X = np.vstack([self._prepare_features(d) for d in training_data])
        y = np.array(targets)
        
        # Split data
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, random_state=self.config.random_state
        )
        
        # Scale features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)
        
        # Train model
        if self.config.model_type == "gradient_boosting":
            self.model = GradientBoostingRegressor(
                n_estimators=self.config.n_estimators,
                max_depth=self.config.max_depth,
                random_state=self.config.random_state
            )
        else:
            self.model = RandomForestRegressor(
                n_estimators=self.config.n_estimators,
                max_depth=self.config.max_depth,
                min_samples_split=self.config.min_samples_split,
                random_state=self.config.random_state
            )
        
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_val_scaled)
        
        metrics = {
            "rmse": float(np.sqrt(mean_squared_error(y_val, y_pred))),
            "mae": float(mean_absolute_error(y_val, y_pred)),
            "r2": float(r2_score(y_val, y_pred)),
            "training_samples": len(X_train),
            "validation_samples": len(X_val),
        }
        
        # Feature importance
        if hasattr(self.model, 'feature_importances_'):
            metrics["feature_importance"] = dict(zip(
                self.feature_names, 
                self.model.feature_importances_.tolist()
            ))
        
        self.is_trained = True
        self.trained_at = datetime.utcnow()
        
        logger.info(f"Model trained. R2: {metrics['r2']:.3f}, RMSE: {metrics['rmse']:.1f}")
        
        return metrics

    def save(self, path: str):
        """Save model to disk."""
        model_data = {
            "model": self.model,
            "scaler": self.scaler,
            "encoders": self.encoders,
            "feature_names": self.feature_names,
            "config": self.config,
            "is_trained": self.is_trained,
            "trained_at": self.trained_at,
            "model_version": self.model_version,
        }
        with open(path, 'wb') as f:
            pickle.dump(model_data, f)
        logger.info(f"Model saved to {path}")

    def load(self, path: str):
        """Load model from disk."""
        with open(path, 'rb') as f:
            model_data = pickle.load(f)
        
        self.model = model_data["model"]
        self.scaler = model_data["scaler"]
        self.encoders = model_data["encoders"]
        self.feature_names = model_data["feature_names"]
        self.config = model_data.get("config", EstimatorConfig())
        self.is_trained = model_data.get("is_trained", True)
        self.trained_at = model_data.get("trained_at")
        self.model_version = model_data.get("model_version", "1.0.0")
        
        logger.info(f"Model loaded from {path}")


class CircularityEstimator(BaseEstimator):
    """Estimator for circularity scores (0-1)."""
    
    def __init__(self, config: Optional[EstimatorConfig] = None):
        super().__init__(config)
        self.estimation_type = "circularity_score"

    def estimate(self, data: Dict[str, Any]) -> EstimationResult:
        """
        Estimate circularity score based on process parameters.
        
        Circularity is based on:
        - Recycled content input
        - Product recyclability
        - Waste recovery rate
        - Byproduct utilization
        """
        # Extract circularity factors
        recycled_content = data.get("recycled_content", 0.0) or 0.0
        recyclability = data.get("recyclability", 1.0) or 1.0
        waste_recovery = data.get("waste_recovery_rate", 0.5) or 0.5
        byproduct_utilization = data.get("byproduct_utilization", 0.3) or 0.3
        
        # Calculate Material Circularity Indicator (MCI) inspired score
        # Weight factors
        w1, w2, w3, w4 = 0.35, 0.30, 0.20, 0.15
        
        circularity = (
            w1 * recycled_content +
            w2 * recyclability +
            w3 * waste_recovery +
            w4 * byproduct_utilization
        )
        
        # Clamp to [0, 1]
        circularity = max(0.0, min(1.0, circularity))
        
        # Uncertainty is lower for this calculation-based method
        uncertainty = 0.05
        
        return EstimationResult(
            value=circularity,
            confidence=0.90,
            lower_bound=max(0, circularity - uncertainty),
            upper_bound=min(1, circularity + uncertainty),
            method="mci_inspired",
            features_used=["recycled_content", "recyclability", "waste_recovery_rate", "byproduct_utilization"]
        )


class EnergyIntensityEstimator(BaseEstimator):
    """Estimator for energy intensity (GJ per tonne)."""
    
    # Base energy intensities by process
    BASE_ENERGY_INTENSITY = {
        ("iron_steel", "extraction"): 0.5,
        ("iron_steel", "smelting"): 18.0,
        ("iron_steel", "refining"): 2.0,
        ("iron_steel", "rolling"): 2.5,
        ("iron_steel", "recycling"): 6.0,
        ("aluminium", "extraction"): 0.3,
        ("aluminium", "refining"): 12.0,
        ("aluminium", "smelting"): 55.0,  # Very electricity intensive
        ("aluminium", "recycling"): 3.0,
    }

    def __init__(self, config: Optional[EstimatorConfig] = None):
        super().__init__(config)
        self.estimation_type = "energy_intensity"

    def estimate(self, data: Dict[str, Any]) -> EstimationResult:
        """
        Estimate energy intensity for given parameters.
        """
        metal = data.get("metal_type", "iron_steel")
        stage = data.get("process_stage", "smelting")
        recycled = data.get("recycled_content", 0.0) or 0.0
        tech = data.get("technology_level", "conventional")
        
        # Get base energy intensity
        key = (metal, stage)
        base_ei = self.BASE_ENERGY_INTENSITY.get(key, 10.0)
        
        # Adjust for recycling (significant energy savings)
        if stage == "recycling":
            # Already low for recycling
            adjusted_ei = base_ei
        else:
            # Recycled content reduces energy needs
            recycled_savings = recycled * 0.6  # 60% savings potential from recycled
            adjusted_ei = base_ei * (1 - recycled_savings)
        
        # Technology adjustment
        tech_factor = {"conventional": 1.0, "best_available": 0.85, "advanced": 0.70}.get(tech, 1.0)
        adjusted_ei *= tech_factor
        
        # Uncertainty
        uncertainty = adjusted_ei * 0.15
        
        return EstimationResult(
            value=adjusted_ei,
            confidence=0.80,
            lower_bound=adjusted_ei - uncertainty,
            upper_bound=adjusted_ei + uncertainty,
            method="rule_based_energy",
            features_used=["metal_type", "process_stage", "recycled_content", "technology_level"]
        )


# Factory function
def create_estimator(
    estimation_type: str,
    config: Optional[EstimatorConfig] = None
) -> BaseEstimator:
    """
    Create an estimator for the specified type.
    
    Args:
        estimation_type: Type of estimation ('emission_factor', 'circularity_score', 'energy_intensity')
        config: Optional configuration
        
    Returns:
        Appropriate estimator instance
    """
    estimators = {
        "emission_factor": EmissionFactorEstimator,
        "circularity_score": CircularityEstimator,
        "energy_intensity": EnergyIntensityEstimator,
    }
    
    estimator_class = estimators.get(estimation_type, EmissionFactorEstimator)
    return estimator_class(config)
