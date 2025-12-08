"""
Database Seeding Script for CircuMetal LCA Platform.

Loads seed data into MongoDB for demo and development purposes.
Run this script after initial database setup.

Usage:
    python seed_database.py [--clear] [--env production|development]
"""

import asyncio
import json
import argparse
import os
from pathlib import Path
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Paths
SEED_DIR = Path(__file__).parent
DATA_DIR = SEED_DIR.parent

# Seed files mapping
SEED_FILES = {
    "projects": "seed_projects.json",
    "scenarios": "seed_scenarios.json",
    "processes": "seed_processes.json",
    "flows": "seed_flows.json",
    "digital_product_passports": "seed_digital_product_passports.json",
}


async def get_database():
    """Get MongoDB database connection."""
    mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.environ.get("MONGO_DB_NAME", "circumetal_lca")
    
    client = AsyncIOMotorClient(mongo_uri)
    return client[db_name], client


async def load_json_file(filename: str) -> list:
    """Load JSON seed file."""
    file_path = SEED_DIR / filename
    if not file_path.exists():
        print(f"  ⚠️  File not found: {filename}")
        return []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Add timestamps if not present
    now = datetime.utcnow().isoformat() + "Z"
    for record in data:
        if "created_at" not in record:
            record["created_at"] = now
        if "updated_at" not in record:
            record["updated_at"] = now
    
    return data


async def clear_collection(db, collection_name: str):
    """Clear all documents from a collection."""
    result = await db[collection_name].delete_many({})
    return result.deleted_count


async def seed_collection(db, collection_name: str, filename: str, clear_first: bool = False):
    """Seed a single collection."""
    print(f"\n📦 Seeding {collection_name}...")
    
    if clear_first:
        deleted = await clear_collection(db, collection_name)
        print(f"  🗑️  Cleared {deleted} existing documents")
    
    data = await load_json_file(filename)
    if not data:
        print(f"  ⏭️  Skipping (no data)")
        return 0
    
    # Check for existing documents to avoid duplicates
    existing_ids = set()
    async for doc in db[collection_name].find({}, {"_id": 1}):
        existing_ids.add(doc["_id"])
    
    # Filter out existing documents
    new_data = [d for d in data if d.get("_id") not in existing_ids]
    
    if not new_data:
        print(f"  ✓ All {len(data)} documents already exist")
        return 0
    
    # Insert new documents
    result = await db[collection_name].insert_many(new_data)
    print(f"  ✓ Inserted {len(result.inserted_ids)} new documents")
    
    if len(data) != len(new_data):
        print(f"  ℹ️  Skipped {len(data) - len(new_data)} existing documents")
    
    return len(result.inserted_ids)


async def create_indexes(db):
    """Create database indexes for performance."""
    print("\n🔧 Creating indexes...")
    
    indexes = [
        ("projects", [("metal_type", 1), ("region", 1)]),
        ("projects", [("status", 1)]),
        ("scenarios", [("project_id", 1)]),
        ("scenarios", [("scenario_type", 1)]),
        ("processes", [("stage", 1), ("metal_type", 1)]),
        ("processes", [("code", 1)], {"unique": True}),
        ("flows", [("category", 1), ("metal_type", 1)]),
        ("flows", [("code", 1)], {"unique": True}),
        ("digital_product_passports", [("product_code", 1)], {"unique": True}),
        ("digital_product_passports", [("metal_type", 1)]),
        ("digital_product_passports", [("manufacturing_date", -1)]),
    ]
    
    for index_def in indexes:
        collection_name = index_def[0]
        index_fields = index_def[1]
        options = index_def[2] if len(index_def) > 2 else {}
        
        try:
            await db[collection_name].create_index(index_fields, **options)
            print(f"  ✓ Index on {collection_name}: {index_fields}")
        except Exception as e:
            print(f"  ⚠️  Index on {collection_name}: {e}")


async def seed_database(clear: bool = False, env: str = "development"):
    """Main seeding function."""
    print("=" * 60)
    print("🌱 CircuMetal LCA Database Seeder")
    print("=" * 60)
    print(f"Environment: {env}")
    print(f"Clear existing: {clear}")
    
    db, client = await get_database()
    print(f"Database: {db.name}")
    
    total_inserted = 0
    
    try:
        # Seed each collection
        for collection_name, filename in SEED_FILES.items():
            inserted = await seed_collection(db, collection_name, filename, clear)
            total_inserted += inserted
        
        # Create indexes
        await create_indexes(db)
        
        print("\n" + "=" * 60)
        print(f"✅ Seeding complete! Inserted {total_inserted} total documents")
        print("=" * 60)
        
        # Print summary
        print("\n📊 Collection Summary:")
        for collection_name in SEED_FILES.keys():
            count = await db[collection_name].count_documents({})
            print(f"  • {collection_name}: {count} documents")
        
    finally:
        client.close()


async def verify_seed_data(db):
    """Verify seed data integrity."""
    print("\n🔍 Verifying seed data...")
    
    # Check project-scenario relationships
    projects = await db.projects.find({}).to_list(None)
    for project in projects:
        scenario_count = await db.scenarios.count_documents({"project_id": project["_id"]})
        print(f"  • Project '{project['name']}': {scenario_count} scenarios")
    
    # Check process coverage
    for metal_type in ["iron_steel", "aluminium"]:
        process_count = await db.processes.count_documents({"metal_type": metal_type})
        print(f"  • {metal_type} processes: {process_count}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed CircuMetal database")
    parser.add_argument("--clear", action="store_true", help="Clear existing data before seeding")
    parser.add_argument("--env", choices=["development", "production"], default="development",
                        help="Environment (default: development)")
    parser.add_argument("--verify", action="store_true", help="Verify seed data after loading")
    
    args = parser.parse_args()
    
    asyncio.run(seed_database(clear=args.clear, env=args.env))
