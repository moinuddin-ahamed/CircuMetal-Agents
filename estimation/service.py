"""
FastAPI Service for ML Estimation.

Provides REST API for:
- POST /estimate - Get ML-based estimation
- POST /estimate/batch - Batch estimation
- POST /train - Train or update models
- GET /models - List available models
- GET /health - Health check
"""

import time
import uuid
import logging
from datetime import datetime
from typing import Dict, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    EstimationRequest,
    EstimationResponse,
    EstimationResult as EstimationResultModel,
    ConfidenceInterval,
    EstimationType,
    BatchEstimationRequest,
    BatchEstimationResponse,
    TrainingRequest,
    TrainingResult,
    ModelInfo,
    HealthStatus,
)
from .estimators import (
    EmissionFactorEstimator,
    CircularityEstimator,
    EnergyIntensityEstimator,
    EstimatorConfig,
    create_estimator,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Service start time for uptime calculation
SERVICE_START_TIME = datetime.utcnow()


class EstimationService:
    """
    Main estimation service managing all estimators.
    """
    
    def __init__(self):
        """Initialize service with default estimators."""
        self.estimators: Dict[str, any] = {}
        self.model_info: Dict[str, ModelInfo] = {}
        self._initialize_estimators()
    
    def _initialize_estimators(self):
        """Initialize all estimators."""
        logger.info("Initializing estimation service...")
        
        # Create estimators for each type
        for est_type in ["emission_factor", "circularity_score", "energy_intensity"]:
            estimator = create_estimator(est_type)
            self.estimators[est_type] = estimator
            
            self.model_info[est_type] = ModelInfo(
                model_id=f"{est_type}_v1",
                model_type="rule_based" if not estimator.is_trained else "random_forest",
                estimation_type=EstimationType(est_type),
                version=estimator.model_version,
                trained_at=estimator.trained_at or datetime.utcnow(),
                metrics={},
                status="active"
            )
        
        logger.info(f"Initialized {len(self.estimators)} estimators")
    
    def estimate(self, request: EstimationRequest) -> EstimationResponse:
        """
        Perform estimation based on request.
        """
        start_time = time.time()
        
        # Get appropriate estimator
        est_type = request.estimation_type.value
        estimator = self.estimators.get(est_type)
        
        if not estimator:
            raise ValueError(f"Unknown estimation type: {est_type}")
        
        # Prepare input data
        input_data = {
            "metal_type": request.metal_type.value,
            "process_stage": request.process_stage.value,
            "production_volume": request.production_volume,
            "recycled_content": request.recycled_content,
            "energy_source": request.energy_source,
            "location": request.location,
            "ore_grade": request.ore_grade,
            "technology_level": request.technology_level,
            **(request.context or {})
        }
        
        # Perform estimation
        result = estimator.estimate(input_data)
        
        # Determine unit
        unit_map = {
            "emission_factor": "kgCO2e/tonne",
            "circularity_score": "score (0-1)",
            "energy_intensity": "GJ/tonne",
            "water_footprint": "m³/tonne",
        }
        unit = unit_map.get(est_type, "unit")
        
        # Build response
        request_id = request.request_id or f"est_{uuid.uuid4().hex[:8]}"
        processing_time = (time.time() - start_time) * 1000
        
        response = EstimationResponse(
            request_id=request_id,
            estimation_type=request.estimation_type,
            result=EstimationResultModel(
                value=round(result.value, 4),
                unit=unit,
                confidence=round(result.confidence, 3),
                confidence_interval=ConfidenceInterval(
                    lower=round(result.lower_bound, 4),
                    upper=round(result.upper_bound, 4),
                    confidence_level=0.95
                ) if request.include_uncertainty else None,
                method=result.method,
                data_quality="estimated"
            ),
            model_version=estimator.model_version,
            features_used=result.features_used,
            timestamp=datetime.utcnow(),
            processing_time_ms=round(processing_time, 2)
        )
        
        return response
    
    def batch_estimate(self, requests: List[EstimationRequest]) -> BatchEstimationResponse:
        """
        Perform batch estimation.
        """
        start_time = time.time()
        results = []
        successful = 0
        failed = 0
        
        for req in requests:
            try:
                result = self.estimate(req)
                results.append(result)
                successful += 1
            except Exception as e:
                logger.error(f"Batch estimation failed for request: {e}")
                failed += 1
        
        total_time = (time.time() - start_time) * 1000
        
        return BatchEstimationResponse(
            results=results,
            total_requests=len(requests),
            successful=successful,
            failed=failed,
            total_processing_time_ms=round(total_time, 2)
        )
    
    async def train_model(
        self, 
        request: TrainingRequest,
        training_data: Optional[List[Dict]] = None,
        targets: Optional[List[float]] = None
    ) -> TrainingResult:
        """
        Train or update a model.
        """
        est_type = request.estimation_type.value
        estimator = self.estimators.get(est_type)
        
        if not estimator:
            raise ValueError(f"Unknown estimation type: {est_type}")
        
        # Generate synthetic training data if none provided
        if training_data is None or targets is None:
            training_data, targets = self._generate_synthetic_data(est_type)
        
        # Configure and train
        config = EstimatorConfig(
            model_type=request.model_type,
            **(request.hyperparameters or {})
        )
        
        # Create new estimator with config
        new_estimator = create_estimator(est_type, config)
        metrics = new_estimator.train(training_data, targets)
        
        if "error" not in metrics:
            # Replace old estimator
            self.estimators[est_type] = new_estimator
            
            # Update model info
            self.model_info[est_type] = ModelInfo(
                model_id=f"{est_type}_v{int(time.time())}",
                model_type=request.model_type,
                estimation_type=request.estimation_type,
                version=new_estimator.model_version,
                trained_at=datetime.utcnow(),
                metrics=metrics,
                status="active"
            )
        
        return TrainingResult(
            model_id=self.model_info[est_type].model_id,
            model_type=request.model_type,
            estimation_type=request.estimation_type,
            metrics=metrics,
            feature_importance=metrics.get("feature_importance", {}),
            training_samples=int(metrics.get("training_samples", 0)),
            validation_samples=int(metrics.get("validation_samples", 0)),
            trained_at=datetime.utcnow()
        )
    
    def _generate_synthetic_data(self, est_type: str) -> tuple:
        """Generate synthetic training data for demo/testing."""
        import random
        
        data = []
        targets = []
        
        metals = ["iron_steel", "aluminium", "copper"]
        stages = ["extraction", "smelting", "refining", "rolling", "recycling"]
        
        for _ in range(500):
            metal = random.choice(metals)
            stage = random.choice(stages)
            recycled = random.random() * 0.9
            
            record = {
                "metal_type": metal,
                "process_stage": stage,
                "recycled_content": recycled,
                "production_volume": random.uniform(10000, 5000000),
                "energy_source": {
                    "coal": random.uniform(0.2, 0.8),
                    "renewable": random.uniform(0.0, 0.5),
                    "natural_gas": random.uniform(0.0, 0.3),
                },
                "location": random.choice(["IN-Odisha", "IN-Gujarat", "IN-Karnataka", "IN"]),
                "ore_grade": random.uniform(0.4, 0.7),
                "technology_level": random.choice(["conventional", "best_available", "advanced"]),
            }
            
            # Generate target based on rules
            estimator = self.estimators.get(est_type)
            if estimator:
                result = estimator.estimate(record)
                # Add noise
                noise = random.gauss(0, result.value * 0.1)
                target = max(0, result.value + noise)
            else:
                target = random.uniform(100, 2000)
            
            data.append(record)
            targets.append(target)
        
        return data, targets
    
    def get_health(self) -> HealthStatus:
        """Get service health status."""
        uptime = (datetime.utcnow() - SERVICE_START_TIME).total_seconds()
        
        models_loaded = {}
        last_training = None
        
        for est_type, info in self.model_info.items():
            models_loaded[est_type] = info.status == "active"
            if info.trained_at and (last_training is None or info.trained_at > last_training):
                last_training = info.trained_at
        
        return HealthStatus(
            status="healthy",
            version="1.0.0",
            models_loaded=models_loaded,
            uptime_seconds=uptime,
            last_training=last_training
        )


# Create service instance
estimation_service = EstimationService()


# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("Estimation service starting up...")
    yield
    logger.info("Estimation service shutting down...")


# Create FastAPI app
app = FastAPI(
    title="CircuMetal Estimation Service",
    description="ML-based estimation service for LCA emission factors, circularity scores, and energy intensity",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API Endpoints

@app.get("/health", response_model=HealthStatus, tags=["Health"])
async def health_check():
    """Check service health and status."""
    return estimation_service.get_health()


@app.post("/estimate", response_model=EstimationResponse, tags=["Estimation"])
async def estimate(request: EstimationRequest):
    """
    Get ML-based estimation for emission factor, circularity, or energy intensity.
    
    The service uses trained ML models when available, with rule-based fallback.
    Includes uncertainty quantification with confidence intervals.
    """
    try:
        return estimation_service.estimate(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Estimation error: {e}")
        raise HTTPException(status_code=500, detail="Estimation failed")


@app.post("/estimate/batch", response_model=BatchEstimationResponse, tags=["Estimation"])
async def batch_estimate(request: BatchEstimationRequest):
    """
    Perform batch estimation for multiple requests.
    
    Maximum 100 requests per batch.
    """
    if len(request.requests) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 requests per batch")
    
    return estimation_service.batch_estimate(request.requests)


@app.post("/train", response_model=TrainingResult, tags=["Training"])
async def train_model(
    request: TrainingRequest,
    background_tasks: BackgroundTasks
):
    """
    Train or update ML model.
    
    Uses synthetic data if no training data provided.
    Training runs in background for production use.
    """
    try:
        result = await estimation_service.train_model(request)
        return result
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/models", response_model=List[ModelInfo], tags=["Models"])
async def list_models():
    """List all available models and their status."""
    return list(estimation_service.model_info.values())


@app.get("/models/{estimation_type}", response_model=ModelInfo, tags=["Models"])
async def get_model(estimation_type: EstimationType):
    """Get information about a specific model."""
    info = estimation_service.model_info.get(estimation_type.value)
    if not info:
        raise HTTPException(status_code=404, detail="Model not found")
    return info


# Run with: uvicorn estimation.service:app --reload --port 8001
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
