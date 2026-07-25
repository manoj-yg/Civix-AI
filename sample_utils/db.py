import os
import json
import datetime
from pathlib import Path
from pymongo import MongoClient
import streamlit as st

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
JSON_FILE = DATA_DIR / "incidents.json"

SAMPLE_INCIDENTS = []

def init_local_json_if_needed():
    if not JSON_FILE.exists() or JSON_FILE.stat().st_size == 0:
        with open(JSON_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)

def save_incident_to_storage(
    mongo_uri=None,
    db_name="road_damage_db",
    collection_name="incidents",
    damage_items=[],
    lat=None,
    lon=None,
    location_desc="",
    source_type="Image Detection"
):
    """
    Saves incident to MongoDB Atlas (if URI configured) and also to local incidents JSON store.
    """
    timestamp_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    inc_id = f"INC-{int(datetime.datetime.now().timestamp() * 1000) % 100000}"

    new_doc = {
        "id": inc_id,
        "timestamp": timestamp_str,
        "source": source_type,
        "damage_types": list(damage_items),
        "latitude": lat,
        "longitude": lon,
        "location_desc": location_desc,
        "google_maps_url": f"https://www.google.com/maps?q={lat},{lon}" if lat and lon else None,
        "status": "Reported"
    }

    # 1. Save to local JSON
    init_local_json_if_needed()
    try:
        with open(JSON_FILE, "r", encoding="utf-8") as f:
            incidents = json.load(f)
        incidents.insert(0, new_doc)
        with open(JSON_FILE, "w", encoding="utf-8") as f:
            json.dump(incidents, f, indent=2)
    except Exception as e:
        pass

    # 2. Save to MongoDB Atlas if URI provided
    mongo_success = False
    mongo_msg = ""
    if mongo_uri:
        try:
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=4000)
            db = client[db_name]
            collection = db[collection_name]
            mongo_doc = dict(new_doc)
            mongo_doc["created_at"] = datetime.datetime.utcnow()
            res = collection.insert_one(mongo_doc)
            client.close()
            mongo_success = True
            mongo_msg = f" & synced to MongoDB Atlas (ID: {res.inserted_id})"
        except Exception as e:
            mongo_msg = f" (MongoDB notice: {str(e)})"

    return True, f"Incident {inc_id} recorded successfully{mongo_msg}!"

# Backward compatibility alias
save_incident_to_mongodb = save_incident_to_storage

def get_all_incidents(mongo_uri=None, db_name="road_damage_db", collection_name="incidents"):
    """
    Fetches all incidents from MongoDB Atlas if URI available, otherwise from local JSON store.
    """
    if mongo_uri:
        try:
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=4000)
            db = client[db_name]
            collection = db[collection_name]
            docs = list(collection.find({}, {"_id": 0}).sort("timestamp", -1))
            client.close()
            if docs:
                return docs
        except Exception:
            pass

    init_local_json_if_needed()
    try:
        with open(JSON_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return SAMPLE_INCIDENTS

def update_incident_status(inc_id, new_status, mongo_uri=None, db_name="road_damage_db", collection_name="incidents"):
    """
    Updates the status of an incident ('Reported', 'In Progress', 'Resolved').
    """
    # 1. Update local JSON
    init_local_json_if_needed()
    try:
        with open(JSON_FILE, "r", encoding="utf-8") as f:
            incidents = json.load(f)
        for inc in incidents:
            if inc.get("id") == inc_id or str(inc.get("_id")) == str(inc_id):
                inc["status"] = new_status
        with open(JSON_FILE, "w", encoding="utf-8") as f:
            json.dump(incidents, f, indent=2)
    except Exception:
        pass

    # 2. Update MongoDB if connected
    if mongo_uri:
        try:
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=4000)
            db = client[db_name]
            collection = db[collection_name]
            collection.update_one({"id": inc_id}, {"$set": {"status": new_status}})
            client.close()
        except Exception:
            pass
    return True
