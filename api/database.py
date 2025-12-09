"""
MongoDB Database Module for CircuMetal API

Provides async MongoDB operations using motor (async MongoDB driver).
"""

import os
import asyncio
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from bson import ObjectId
from dotenv import load_dotenv
from contextvars import ContextVar

load_dotenv()

# Use context variables to store per-context (per-loop) client references
_client_context: ContextVar[Optional[AsyncIOMotorClient]] = ContextVar('mongo_client', default=None)


def get_mongo_uri() -> str:
    """Get MongoDB URI from environment"""
    return os.getenv("MONGODB_URI", "mongodb://localhost:27017")


def get_db_name() -> str:
    """Get database name from environment"""
    return os.getenv("MONGO_DB_NAME", "circumetal")


def _get_or_create_client() -> AsyncIOMotorClient:
    """
    Get or create a MongoDB client for the current context.
    Each asyncio event loop will get its own client.
    """
    client = _client_context.get()
    if client is None:
        client = AsyncIOMotorClient(get_mongo_uri())
        _client_context.set(client)
    return client


async def get_database() -> AsyncIOMotorDatabase:
    """Get MongoDB database connection for the current context"""
    client = _get_or_create_client()
    return client[get_db_name()]


async def close_database():
    """Close MongoDB connection for current context"""
    client = _client_context.get()
    if client:
        client.close()
        _client_context.set(None)


async def initialize_indexes():
    """Create indexes for all collections"""
    db = await get_database()
    
    # Inventories indexes
    await db.inventories.create_index("project_id")
    await db.inventories.create_index("created_at")
    await db.inventories.create_index([("name", 1), ("project_id", 1)], unique=True)
    
    # Runs indexes
    await db.runs.create_index("inventory_id")
    await db.runs.create_index("project_id")
    await db.runs.create_index("status")
    await db.runs.create_index("created_at")
    
    # Projects indexes
    await db.projects.create_index("user_id")
    await db.projects.create_index("created_at")
    
    # Logs indexes
    await db.logs.create_index("run_id")
    await db.logs.create_index([("run_id", 1), ("timestamp", 1)])
    
    # Reports indexes
    await db.reports.create_index("run_id", unique=True)
    await db.reports.create_index("created_at")
    await db.reports.create_index("material")
    
    print("MongoDB indexes initialized")


# ============================================================================
# Collection Helpers
# ============================================================================

async def get_collection(name: str) -> AsyncIOMotorCollection:
    """Get a collection by name"""
    db = await get_database()
    return db[name]


def serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Serialize MongoDB document for JSON response"""
    if doc is None:
        return None
    
    result = dict(doc)
    
    # Convert ObjectId to string
    if "_id" in result:
        result["id"] = str(result.pop("_id"))
    
    # Convert datetime objects
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, ObjectId):
            result[key] = str(value)
    
    return result


# ============================================================================
# Inventory Operations
# ============================================================================

async def create_inventory(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new inventory"""
    collection = await get_collection("inventories")
    
    data["created_at"] = datetime.utcnow()
    data["updated_at"] = datetime.utcnow()
    
    result = await collection.insert_one(data)
    data["_id"] = result.inserted_id
    
    return serialize_doc(data)


async def get_inventory(inventory_id: str) -> Optional[Dict[str, Any]]:
    """Get inventory by ID"""
    collection = await get_collection("inventories")
    doc = await collection.find_one({"_id": ObjectId(inventory_id)})
    return serialize_doc(doc) if doc else None


async def get_inventories_by_project(project_id: str) -> List[Dict[str, Any]]:
    """Get all inventories for a project"""
    collection = await get_collection("inventories")
    cursor = collection.find({"project_id": project_id}).sort("created_at", -1)
    return [serialize_doc(doc) async for doc in cursor]


async def update_inventory(inventory_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update an inventory"""
    collection = await get_collection("inventories")
    
    data["updated_at"] = datetime.utcnow()
    
    result = await collection.find_one_and_update(
        {"_id": ObjectId(inventory_id)},
        {"$set": data},
        return_document=True
    )
    
    return serialize_doc(result) if result else None


async def delete_inventory(inventory_id: str) -> bool:
    """Delete an inventory"""
    collection = await get_collection("inventories")
    result = await collection.delete_one({"_id": ObjectId(inventory_id)})
    return result.deleted_count > 0


# ============================================================================
# Run Operations
# ============================================================================

async def create_run(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new run"""
    collection = await get_collection("runs")
    
    data["created_at"] = datetime.utcnow()
    data["updated_at"] = datetime.utcnow()
    data["status"] = "pending"
    data["progress"] = 0
    data["logs"] = []
    
    result = await collection.insert_one(data)
    data["_id"] = result.inserted_id
    
    return serialize_doc(data)


async def get_run(run_id: str) -> Optional[Dict[str, Any]]:
    """Get run by ID"""
    collection = await get_collection("runs")
    doc = await collection.find_one({"_id": ObjectId(run_id)})
    return serialize_doc(doc) if doc else None


async def update_run(run_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update a run"""
    collection = await get_collection("runs")
    
    data["updated_at"] = datetime.utcnow()
    
    result = await collection.find_one_and_update(
        {"_id": ObjectId(run_id)},
        {"$set": data},
        return_document=True
    )
    
    return serialize_doc(result) if result else None


async def update_run_status(
    run_id: str, 
    status: str, 
    progress: int = None,
    current_agent: str = None,
    error: str = None
) -> Optional[Dict[str, Any]]:
    """Update run status and progress"""
    update_data = {
        "status": status,
        "updated_at": datetime.utcnow()
    }
    
    if progress is not None:
        update_data["progress"] = progress
    
    if current_agent is not None:
        update_data["current_agent"] = current_agent
    
    if error is not None:
        update_data["error"] = error
    
    if status == "completed" or status == "failed":
        update_data["completed_at"] = datetime.utcnow()
    
    return await update_run(run_id, update_data)


async def add_run_log(run_id: str, agent: str, level: str, message: str, data: Dict = None):
    """Add a log entry to a run"""
    collection = await get_collection("runs")
    
    log_entry = {
        "timestamp": datetime.utcnow(),
        "agent": agent,
        "level": level,
        "message": message,
        "data": data
    }
    
    await collection.update_one(
        {"_id": ObjectId(run_id)},
        {
            "$push": {"logs": log_entry},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )


async def set_run_result(run_id: str, result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Set the final result of a run"""
    return await update_run(run_id, {
        "result": result,
        "status": "completed",
        "progress": 100,
        "completed_at": datetime.utcnow()
    })


async def get_runs_by_project(project_id: str) -> List[Dict[str, Any]]:
    """Get all runs for a project"""
    collection = await get_collection("runs")
    cursor = collection.find({"project_id": project_id}).sort("created_at", -1)
    return [serialize_doc(doc) async for doc in cursor]


async def get_recent_runs(limit: int = 10) -> List[Dict[str, Any]]:
    """Get recent runs"""
    collection = await get_collection("runs")
    cursor = collection.find().sort("created_at", -1).limit(limit)
    return [serialize_doc(doc) async for doc in cursor]


# ============================================================================
# Project Operations
# ============================================================================

async def create_project(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new project"""
    collection = await get_collection("projects")
    
    data["created_at"] = datetime.utcnow()
    data["updated_at"] = datetime.utcnow()
    data["inventories"] = []
    data["runs"] = []
    
    result = await collection.insert_one(data)
    data["_id"] = result.inserted_id
    
    return serialize_doc(data)


async def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    """Get project by ID"""
    collection = await get_collection("projects")
    doc = await collection.find_one({"_id": ObjectId(project_id)})
    return serialize_doc(doc) if doc else None


async def get_projects(user_id: str = None) -> List[Dict[str, Any]]:
    """Get all projects, optionally filtered by user"""
    collection = await get_collection("projects")
    
    query = {}
    if user_id:
        query["user_id"] = user_id
    
    cursor = collection.find(query).sort("created_at", -1)
    return [serialize_doc(doc) async for doc in cursor]


async def update_project(project_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update a project"""
    collection = await get_collection("projects")
    
    data["updated_at"] = datetime.utcnow()
    
    result = await collection.find_one_and_update(
        {"_id": ObjectId(project_id)},
        {"$set": data},
        return_document=True
    )
    
    return serialize_doc(result) if result else None


async def add_scenario(project_id: str, scenario_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Add a scenario to a project"""
    collection = await get_collection("projects")
    
    # Generate ID for scenario if not present
    if "id" not in scenario_data:
        scenario_data["id"] = str(uuid.uuid4())
    
    # Ensure status is set
    if "status" not in scenario_data:
        scenario_data["status"] = "draft"
        
    # Ensure stages are initialized
    if "stages" not in scenario_data:
        scenario_data["stages"] = [] 
        
    result = await collection.find_one_and_update(
        {"_id": ObjectId(project_id)},
        {"$push": {"scenarios": scenario_data}, "$set": {"updated_at": datetime.utcnow()}},
        return_document=True
    )
    
    return serialize_doc(result) if result else None


async def delete_project(project_id: str) -> bool:
    """Delete a project and associated data"""
    # Delete inventories
    inv_collection = await get_collection("inventories")
    await inv_collection.delete_many({"project_id": project_id})
    
    # Delete runs
    runs_collection = await get_collection("runs")
    await runs_collection.delete_many({"project_id": project_id})
    
    # Delete project
    collection = await get_collection("projects")
    result = await collection.delete_one({"_id": ObjectId(project_id)})
    
    return result.deleted_count > 0


# ============================================================================
# Report Operations
# ============================================================================

async def create_report(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new report from ExplainAgent"""
    collection = await get_collection("reports")
    
    data["created_at"] = datetime.utcnow()
    data["updated_at"] = datetime.utcnow()
    
    result = await collection.insert_one(data)
    data["_id"] = result.inserted_id
    
    return serialize_doc(data)


async def get_report(report_id: str) -> Optional[Dict[str, Any]]:
    """Get report by ID"""
    collection = await get_collection("reports")
    doc = await collection.find_one({"_id": ObjectId(report_id)})
    return serialize_doc(doc) if doc else None


async def get_report_by_run_id(run_id: str) -> Optional[Dict[str, Any]]:
    """Get report by orchestration run ID"""
    collection = await get_collection("reports")
    doc = await collection.find_one({"run_id": run_id})
    return serialize_doc(doc) if doc else None


async def get_reports(limit: int = 50, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get all reports, sorted by creation date"""
    collection = await get_collection("reports")
    query = {}
    if project_id:
        query["project_id"] = project_id
        
    cursor = collection.find(query).sort("created_at", -1).limit(limit)
    return [serialize_doc(doc) async for doc in cursor]


async def update_report(report_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update a report"""
    collection = await get_collection("reports")
    
    data["updated_at"] = datetime.utcnow()
    
    result = await collection.find_one_and_update(
        {"_id": ObjectId(report_id)},
        {"$set": data},
        return_document=True
    )
    
    return serialize_doc(result) if result else None


async def delete_report(report_id: str) -> bool:
    """Delete a report"""
    collection = await get_collection("reports")
    result = await collection.delete_one({"_id": ObjectId(report_id)})
    return result.deleted_count > 0


async def get_reports_by_project(project_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Get all reports for a specific project, sorted by creation date (newest first)"""
    collection = await get_collection("reports")
    cursor = collection.find({"project_id": project_id}).sort("created_at", -1).limit(limit)
    return [serialize_doc(doc) async for doc in cursor]


# ============================================================================
# Visualization Operations
# ============================================================================

async def save_visualization(data: Dict[str, Any]) -> Dict[str, Any]:
    """Save a generated visualization"""
    collection = await get_collection("visualizations")
    
    # Ensure timestamp
    if "timestamp" not in data:
        data["timestamp"] = datetime.utcnow()
        
    result = await collection.insert_one(data)
    data["_id"] = result.inserted_id
    
    return serialize_doc(data)


async def get_visualizations(
    project_id: Optional[str] = None,
    diagram_type: Optional[str] = None,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """Get visualizations with filtering"""
    collection = await get_collection("visualizations")
    
    query = {}
    if project_id:
        query["project_id"] = project_id
    if diagram_type:
        query["diagram_type"] = diagram_type
        
    # Sort by timestamp descending (newest first)
    cursor = collection.find(query).sort("timestamp", -1).limit(limit)
    return [serialize_doc(doc) async for doc in cursor]


async def get_latest_visualization(
    project_id: str,
    diagram_type: str
) -> Optional[Dict[str, Any]]:
    """Get the most recent visualization for a project and type"""
    collection = await get_collection("visualizations")
    
    query = {
        "project_id": project_id,
        "diagram_type": diagram_type
    }
    
    doc = await collection.find_one(query, sort=[("timestamp", -1)])
    return serialize_doc(doc) if doc else None
