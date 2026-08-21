import sys
import uuid
import datetime
import random
from pathlib import Path

# Ensure python path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.db.session import SessionLocal, Base, engine
from app.models.models import (
    User, RoleEnum, Asset, AssetTypeEnum,
    Inspection, InspectionStatusEnum, SeverityLevelEnum,
    SeverityAssessment, Defect, Detection, Media,
    Recommendation, Prediction, MaintenanceRecord
)
from app.core.security import get_password_hash

def seed_database():
    print("=" * 70)
    print("SEEDING REAL MUNICIPAL INFRASTRUCTURE & AUTHENTICATION DATA (ACID)")
    print("=" * 70)

    db = SessionLocal()
    try:
        # 1. Standard Seed Users
        print("\n1. Ensuring Standard Municipal Users...")
        standard_users = [
            {
                "email": "admin@civix.gov",
                "full_name": "Chief Executive Engineer - BBMP",
                "role": RoleEnum.ADMIN,
                "password": "admin123"
            },
            {
                "email": "engineer@civix.gov",
                "full_name": "Principal Infrastructure Engineer",
                "role": RoleEnum.ENGINEER,
                "password": "admin123"
            },
            {
                "email": "inspector@civix.gov",
                "full_name": "Senior Field Road Safety Inspector",
                "role": RoleEnum.INSPECTOR,
                "password": "inspector123"
            },
            {
                "email": "citizen@civix.gov",
                "full_name": "Bengaluru Resident Citizen",
                "role": RoleEnum.CITIZEN,
                "password": "citizen123"
            },
            {
                "email": "citizen.guest@civix.gov",
                "full_name": "Public Citizen Reporter",
                "role": RoleEnum.CITIZEN,
                "password": "guest"
            }
        ]

        created_users = {}
        for u_data in standard_users:
            user = db.query(User).filter(User.email == u_data["email"]).first()
            if not user:
                user = User(
                    email=u_data["email"],
                    hashed_password=get_password_hash(u_data["password"]),
                    full_name=u_data["full_name"],
                    role=u_data["role"],
                    is_active=True
                )
                db.add(user)
                db.flush()
                print(f"   [+] Created User: {user.email} ({user.role})")
            else:
                user.hashed_password = get_password_hash(u_data["password"])
                user.full_name = u_data["full_name"]
                user.role = u_data["role"]
                user.is_active = True
                print(f"   [*] Updated User: {user.email} ({user.role})")
            created_users[u_data["email"]] = user

        db.commit()

        # 2. Real BBMP Infrastructure Assets (Bengaluru)
        print("\n2. Seeding Real Municipal Infrastructure Assets...")
        real_assets_data = [
            {
                "name": "Outer Ring Road - Marathahalli to Silk Board Stretch",
                "asset_type": AssetTypeEnum.ROAD,
                "description": "High-density 6-lane arterial corridor connecting tech parks, under heavy bus and multi-axle freight load.",
                "ward": "Ward 150 - Bellandur",
                "zone": "Mahadevapura Zone",
                "latitude": 12.9352,
                "longitude": 77.6853
            },
            {
                "name": "MG Road Urban Commercial Corridor",
                "asset_type": AssetTypeEnum.ROAD,
                "description": "Core commercial district thoroughfare between Trinity Circle and Anil Kumble Circle with heavy metro feeder traffic.",
                "ward": "Ward 111 - Shantala Nagar",
                "zone": "East Zone",
                "latitude": 12.9756,
                "longitude": 77.6067
            },
            {
                "name": "Indiranagar 100 Feet Road Commercial Corridor",
                "asset_type": AssetTypeEnum.ROAD,
                "description": "Major urban retail and dining thoroughfare connecting Old Airport Road and CMH Road.",
                "ward": "Ward 80 - Hoysala Nagar",
                "zone": "East Zone",
                "latitude": 12.9698,
                "longitude": 77.6415
            },
            {
                "name": "Hebbal Multi-Level Flyover Grade Separator",
                "asset_type": AssetTypeEnum.FLYOVER,
                "description": "Critical multi-tier pre-stressed concrete flyover linking Bengaluru International Airport Highway with ORR.",
                "ward": "Ward 7 - Byatarayanapura",
                "zone": "North Zone",
                "latitude": 13.0358,
                "longitude": 77.5970
            },
            {
                "name": "Silk Board Junction Elevated Ramp",
                "asset_type": AssetTypeEnum.FLYOVER,
                "description": "Heavy transit elevated highway connecting Hosur Road with BTM Layout and HSR Layout.",
                "ward": "Ward 174 - HSR Layout",
                "zone": "South Zone",
                "latitude": 12.9176,
                "longitude": 77.6238
            },
            {
                "name": "Richmond Circle Multi-Directional Flyover",
                "asset_type": AssetTypeEnum.FLYOVER,
                "description": "Bi-directional cloverleaf concrete overpass managing central CBD vehicular exchange.",
                "ward": "Ward 111 - Shantala Nagar",
                "zone": "East Zone",
                "latitude": 12.9664,
                "longitude": 77.5978
            },
            {
                "name": "Whitefield Main Road - ITPL Corridor",
                "asset_type": AssetTypeEnum.ROAD,
                "description": "Dense tech-corridor road spanning Hope Farm Junction to Big Bazaar / ITPL entrance.",
                "ward": "Ward 84 - Hagadur",
                "zone": "Mahadevapura Zone",
                "latitude": 12.9854,
                "longitude": 77.7312
            },
            {
                "name": "Bannerghatta Arterial Road - Jayadeva to Dairy Circle",
                "asset_type": AssetTypeEnum.ROAD,
                "description": "Critical arterial road hosting hospital clusters and metro yellow-line construction zones.",
                "ward": "Ward 152 - Sarakki",
                "zone": "South Zone",
                "latitude": 12.9234,
                "longitude": 77.5991
            },
            {
                "name": "Commercial Street Pedestrian Walkway",
                "asset_type": AssetTypeEnum.FOOTPATH,
                "description": "High-footfall pedestrianized shopping promenade with cobblestone and interlocking paver tiles.",
                "ward": "Ward 111 - Shantala Nagar",
                "zone": "East Zone",
                "latitude": 12.9818,
                "longitude": 77.6082
            },
            {
                "name": "Brigade Road Commercial Walkway",
                "asset_type": AssetTypeEnum.FOOTPATH,
                "description": "Paved walkway with handicap ramps and drainage covers connecting MG Road to Residency Road.",
                "ward": "Ward 111 - Shantala Nagar",
                "zone": "East Zone",
                "latitude": 12.9723,
                "longitude": 77.6074
            },
            {
                "name": "Outer Ring Road Smart LED Mast #402",
                "asset_type": AssetTypeEnum.STREETLIGHT,
                "description": "Smart telemetry connected high-lumen LED luminaire cluster with ambient lux sensing.",
                "ward": "Ward 150 - Bellandur",
                "zone": "Mahadevapura Zone",
                "latitude": 12.9360,
                "longitude": 77.6870
            },
            {
                "name": "Airport Expressway High-Mast Luminaire",
                "asset_type": AssetTypeEnum.STREETLIGHT,
                "description": "30-meter high-mast sodium-vapor / LED hybrid array at Hebbal junction approach.",
                "ward": "Ward 7 - Byatarayanapura",
                "zone": "North Zone",
                "latitude": 13.0410,
                "longitude": 77.5985
            }
        ]

        seeded_assets = []
        for a_data in real_assets_data:
            asset = db.query(Asset).filter(Asset.name == a_data["name"]).first()
            if not asset:
                asset = Asset(
                    name=a_data["name"],
                    asset_type=a_data["asset_type"],
                    description=a_data["description"],
                    ward=a_data["ward"],
                    zone=a_data["zone"],
                    latitude=a_data["latitude"],
                    longitude=a_data["longitude"]
                )
                db.add(asset)
                db.flush()
                print(f"   [+] Seeded Asset: {asset.name} ({asset.asset_type})")
            else:
                print(f"   [*] Existing Asset: {asset.name}")
            seeded_assets.append(asset)

        db.commit()

        # 3. Associate Inspections, Defects & Severity Assessments
        print("\n3. Seeding Live Inspections & AI Defect Detections...")
        defect_profiles = [
            {
                "defect": "Potholes",
                "sev_score": 88.5,
                "sev_level": SeverityLevelEnum.CRITICAL,
                "rec": "Immediate emergency cold-mix patching and structural binder overlay.",
                "est_cost": 45000.0,
                "status": InspectionStatusEnum.IN_PROGRESS
            },
            {
                "defect": "Alligator Crack",
                "sev_score": 72.0,
                "sev_level": SeverityLevelEnum.HIGH,
                "rec": "Mill surface layer and apply high-tensile geotextile asphalt grid.",
                "est_cost": 120000.0,
                "status": InspectionStatusEnum.WORK_DONE
            },
            {
                "defect": "Longitudinal Crack",
                "sev_score": 48.0,
                "sev_level": SeverityLevelEnum.MEDIUM,
                "rec": "Polymer bitumen crack seal injection before monsoon onset.",
                "est_cost": 18000.0,
                "status": InspectionStatusEnum.COMPLETED
            },
            {
                "defect": "Transverse Crack",
                "sev_score": 35.0,
                "sev_level": SeverityLevelEnum.LOW,
                "rec": "Routine monitoring during quarterly maintenance cycle.",
                "est_cost": 8500.0,
                "status": InspectionStatusEnum.COMPLETED
            }
        ]

        admin_user = created_users["admin@civix.gov"]
        inspector_user = created_users["inspector@civix.gov"]
        citizen_user = created_users["citizen@civix.gov"]

        # Ensure at least 1-2 inspections per asset
        existing_inspections = db.query(Inspection).all()
        if len(existing_inspections) == 0:
            for idx, asset in enumerate(seeded_assets):
                prof = defect_profiles[idx % len(defect_profiles)]
                u = inspector_user if idx % 2 == 0 else citizen_user
                lat = asset.latitude + random.uniform(-0.003, 0.003)
                lon = asset.longitude + random.uniform(-0.003, 0.003)

                ins = Inspection(
                    asset_id=asset.id,
                    user_id=u.id,
                    asset_type=asset.asset_type,
                    latitude=lat,
                    longitude=lon,
                    status=prof["status"],
                    ai_status=InspectionStatusEnum.COMPLETED,
                    assigned_engineer="Chief Infrastructure Engineer - BBMP",
                    work_notes=f"Inspection carried out at {asset.name}. Verified by {u.full_name}.",
                    resolution_notes="Work order dispatched to zonal municipal contractor." if prof["status"] in (InspectionStatusEnum.WORK_DONE, InspectionStatusEnum.COMPLETED) else None
                )
                db.add(ins)
                db.flush()

                # Add Severity Assessment
                sev = SeverityAssessment(
                    inspection_id=ins.id,
                    overall_score=prof["sev_score"],
                    severity_level=prof["sev_level"],
                    details={
                        "risk_score": prof["sev_score"],
                        "total_defects": 2,
                        "recommendation": prof["rec"]
                    }
                )
                db.add(sev)

                # Add Detections & Defect
                det = Detection(
                    inspection_id=ins.id,
                    class_name=prof["defect"],
                    confidence=round(random.uniform(0.85, 0.98), 3),
                    bbox={"x1": 120.0, "y1": 180.0, "x2": 420.0, "y2": 490.0},
                    area_sq_m=round(random.uniform(0.5, 3.2), 2)
                )
                db.add(det)

                defect = Defect(
                    asset_id=asset.id,
                    inspection_id=ins.id,
                    defect_type=prof["defect"],
                    severity_score=prof["sev_score"]
                )
                db.add(defect)

                print(f"   [+] Seeded Inspection for {asset.name} -> {prof['defect']} ({prof['sev_level']})")
        else:
            for idx, ins in enumerate(existing_inspections):
                chosen_asset = seeded_assets[idx % len(seeded_assets)]
                ins.asset_id = chosen_asset.id
                ins.asset_type = chosen_asset.asset_type
                if not ins.user_id:
                    ins.user_id = inspector_user.id if idx % 2 == 0 else citizen_user.id
                if ins.latitude == 0.0 or ins.latitude is None:
                    ins.latitude = chosen_asset.latitude + random.uniform(-0.005, 0.005)
                    ins.longitude = chosen_asset.longitude + random.uniform(-0.005, 0.005)
                
                # Ensure severity assessment exists
                if not ins.severity_assessment:
                    prof = defect_profiles[idx % len(defect_profiles)]
                    sev = SeverityAssessment(
                        inspection_id=ins.id,
                        overall_score=prof["sev_score"],
                        severity_level=prof["sev_level"],
                        details={
                            "risk_score": prof["sev_score"],
                            "total_defects": random.randint(1, 4),
                            "recommendation": prof["rec"]
                        }
                    )
                    db.add(sev)

                # Ensure defect records exist
                if len(ins.detections) == 0:
                    prof = defect_profiles[idx % len(defect_profiles)]
                    det = Detection(
                        inspection_id=ins.id,
                        class_name=prof["defect"],
                        confidence=round(random.uniform(0.78, 0.96), 3),
                        bbox={"x1": 150.0, "y1": 200.0, "x2": 450.0, "y2": 520.0},
                        area_sq_m=round(random.uniform(0.4, 2.8), 2)
                    )
                    db.add(det)

                    defect = Defect(
                        asset_id=chosen_asset.id,
                        inspection_id=ins.id,
                        defect_type=prof["defect"],
                        severity_score=prof["sev_score"]
                    )
                    db.add(defect)

        db.commit()

        # 4. Predictions & Recommendations for Assets
        print("\n4. Ensuring Predictive Maintenance & Recommendations for Assets...")
        for asset in seeded_assets:
            pred = db.query(Prediction).filter(Prediction.asset_id == asset.id).first()
            if not pred:
                db.add(Prediction(
                    asset_id=asset.id,
                    degradation_score=round(random.uniform(0.25, 0.85), 2),
                    predicted_failure_date=datetime.datetime.utcnow() + datetime.timedelta(days=random.randint(60, 240))
                ))

            rec = db.query(Recommendation).filter(Recommendation.asset_id == asset.id).first()
            if not rec:
                db.add(Recommendation(
                    asset_id=asset.id,
                    action_required=f"Proactive surface resurfacing and micro-surfacing on {asset.name}.",
                    priority=random.choice(["HIGH", "CRITICAL", "MEDIUM"]),
                    estimated_cost=round(random.uniform(25000, 250000), 2)
                ))

        db.commit()

        # Verification counts
        print("\n" + "=" * 70)
        print("SEEDING COMPLETE. LIVE DATABASE TOTALS:")
        print(f"  • Total Users:       {db.query(User).count()}")
        print(f"  • Total Assets:      {db.query(Asset).count()}")
        print(f"  • Total Inspections: {db.query(Inspection).count()}")
        print(f"  • Total Defects:     {db.query(Defect).count()}")
        print(f"  • Total Detections:  {db.query(Detection).count()}")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Seeding failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
