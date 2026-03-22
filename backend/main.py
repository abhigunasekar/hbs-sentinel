"""
HBS Sentinel — FastAPI Backend
Main application entry point with all API routes and WebSocket endpoints.
"""

import os
import asyncio
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from database import db
from websocket_manager import ws_manager
from ai_pipeline import (
    run_full_pipeline, monitor_news_for_crises,
    BANGKOK_TYPHOON_SCENARIO
)
from models import NewsItem, RiskStatus, BANGKOK_TYPHOON_SCENARIO as BANGKOK_SCENARIO

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="HBS Sentinel API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic Request Models ──────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class TriggerCrisisRequest(BaseModel):
    description: str
    source_headline: Optional[str] = None
    source_url: Optional[str] = None

class UpdateLocationRequest(BaseModel):
    student_id: str
    city: str
    lat: float
    lng: float

class TravelPlanRequest(BaseModel):
    student_id: str
    destination: str
    destination_lat: float
    destination_lng: float
    departure_date: str
    return_date: str
    purpose: str = "Personal Travel"

class ContactPrefsRequest(BaseModel):
    student_id: str
    email: bool = True
    sms: bool = True
    push: bool = True

class SafeConfirmRequest(BaseModel):
    student_id: str

class ManualStatusRequest(BaseModel):
    student_id: str
    status: str  # AFFECTED, AT_RISK, SAFE, UNCONFIRMED

# ─── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    user = db.authenticate(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"success": True, "user": user}

# ─── Students ─────────────────────────────────────────────────────────────────

@app.get("/api/students")
async def get_students():
    return {"students": db.get_all_students()}

@app.get("/api/students/{student_id}")
async def get_student(student_id: str):
    student = db.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@app.post("/api/students/location")
async def update_location(req: UpdateLocationRequest):
    db.update_student_location(req.student_id, req.city, req.lat, req.lng)
    student = db.get_student(req.student_id)
    # Broadcast to admins
    await ws_manager.broadcast_to_admins("student_location_updated", {"student": student})
    return {"success": True, "student": student}

@app.post("/api/students/travel-plan")
async def add_travel_plan(req: TravelPlanRequest):
    db.update_student_travel_plan(req.student_id, {
        "destination": req.destination,
        "destination_lat": req.destination_lat,
        "destination_lng": req.destination_lng,
        "departure_date": req.departure_date,
        "return_date": req.return_date,
        "purpose": req.purpose,
    })
    student = db.get_student(req.student_id)
    await ws_manager.broadcast_to_admins("student_travel_updated", {"student": student})
    return {"success": True, "student": student}

@app.post("/api/students/contact-prefs")
async def update_contact_prefs(req: ContactPrefsRequest):
    db.update_student_contacts(req.student_id, req.email, req.sms, req.push)
    return {"success": True}

@app.post("/api/students/safe")
async def confirm_safe(req: SafeConfirmRequest):
    success = db.confirm_student_safe(req.student_id)
    if not success:
        raise HTTPException(status_code=404, detail="Student not found")
    student = db.get_student(req.student_id)
    # Broadcast to admins
    await ws_manager.broadcast_to_admins("student_safe_confirmed", {
        "student_id": req.student_id,
        "student_name": student["name"],
        "student": student,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    # Notify the student too
    await ws_manager.send_to_student(req.student_id, "safe_confirmed", {
        "message": "Your safe status has been recorded. HBS has been notified.",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return {"success": True, "student": student}

@app.get("/api/students/{student_id}/alerts")
async def get_student_alerts(student_id: str):
    alerts = db.get_student_alerts(student_id)
    return {"alerts": alerts}

@app.post("/api/admin/students/status")
async def manual_status_update(req: ManualStatusRequest):
    try:
        status = RiskStatus(req.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")
    db.set_student_risk_status(req.student_id, status)
    student = db.get_student(req.student_id)
    await ws_manager.broadcast_to_admins("student_status_updated", {"student": student})
    await ws_manager.send_to_student(req.student_id, "status_updated", {"status": req.status})
    return {"success": True, "student": student}

# ─── Crisis ───────────────────────────────────────────────────────────────────

@app.get("/api/crisis/active")
async def get_active_crisis():
    return {"crisis": db.get_active_crisis()}

@app.get("/api/crisis/all")
async def get_all_crises():
    return {"crises": db.get_all_crises()}

@app.post("/api/crisis/trigger")
async def trigger_crisis(req: TriggerCrisisRequest, background_tasks: BackgroundTasks):
    if db.pipeline_running:
        raise HTTPException(status_code=409, detail="Pipeline already running")
    db.pipeline_running = True
    background_tasks.add_task(
        _run_pipeline_task,
        req.description,
        req.source_headline,
        req.source_url,
        "manual",
        None,
    )
    return {"success": True, "message": "AI pipeline started"}

@app.post("/api/crisis/trigger-bangkok")
async def trigger_bangkok(background_tasks: BackgroundTasks):
    """One-click Bangkok typhoon demo trigger."""
    if db.pipeline_running:
        raise HTTPException(status_code=409, detail="Pipeline already running")
    db.pipeline_running = True
    scenario = BANGKOK_SCENARIO
    preset = {
        "name": "Typhoon Haikui",
        "crisis_type": "Typhoon",
        "severity": 8,
        "center_lat": 13.7563,
        "center_lng": 100.5018,
        "radius_km": 80,
        "affected_area": "Bangkok Metropolitan Region, Thailand",
        "confidence": 0.97,
    }
    background_tasks.add_task(
        _run_pipeline_task,
        scenario["description"],
        "BREAKING: Category 4 Typhoon Haikui makes landfall near Bangkok — mass evacuations ordered",
        "https://www.bangkokpost.com/thailand/general/typhoon-haikui",
        "manual",
        preset,
    )
    return {"success": True, "message": "Bangkok typhoon scenario triggered"}

@app.post("/api/crisis/{crisis_id}/resolve")
async def resolve_crisis(crisis_id: str):
    db.resolve_crisis(crisis_id)
    students = db.get_all_students()
    await ws_manager.broadcast_to_admins("crisis_resolved", {
        "crisis_id": crisis_id,
        "students": students,
    })
    await ws_manager.broadcast_to_all_students("crisis_resolved", {
        "message": "The crisis event has been resolved. Thank you for your patience.",
    })
    return {"success": True}

# ─── Delivery Log ─────────────────────────────────────────────────────────────

@app.get("/api/delivery-log")
async def get_delivery_log(crisis_id: Optional[str] = None):
    return {"entries": db.get_delivery_log(crisis_id)}

# ─── News Feed ────────────────────────────────────────────────────────────────

@app.get("/api/news")
async def get_news():
    return {"news": db.get_news_feed()}

@app.post("/api/news/scan")
async def scan_news(background_tasks: BackgroundTasks):
    """Trigger a live news scan using Claude web search."""
    background_tasks.add_task(_scan_news_task)
    return {"success": True, "message": "News scan started"}

# ─── Admin ────────────────────────────────────────────────────────────────────

@app.get("/api/admin/dashboard")
async def get_dashboard():
    return {
        "students": db.get_all_students(),
        "active_crisis": db.get_active_crisis(),
        "delivery_log": db.get_delivery_log()[:20],
        "news": db.get_news_feed()[:10],
        "pipeline_running": db.pipeline_running,
        "online_students": list(ws_manager.get_online_student_ids()),
        "admin_count": ws_manager.get_admin_count(),
    }

@app.post("/api/admin/reset")
async def reset_demo():
    db.reset_demo()
    await ws_manager.broadcast_to_admins("demo_reset", {"message": "Demo reset complete"})
    await ws_manager.broadcast_to_all_students("demo_reset", {"message": "System reset"})
    return {"success": True}

# ─── WebSockets ───────────────────────────────────────────────────────────────

@app.websocket("/ws/admin/{user_id}")
async def admin_websocket(websocket: WebSocket, user_id: str):
    await ws_manager.connect_admin(websocket, user_id)
    try:
        # Send initial state
        await websocket.send_json({
            "type": "connected",
            "data": {
                "message": f"Connected to HBS Sentinel — Admin Dashboard",
                "students": db.get_all_students(),
                "active_crisis": db.get_active_crisis(),
                "news": db.get_news_feed()[:10],
                "pipeline_running": db.pipeline_running,
            }
        })
        while True:
            # Keep connection alive; client sends pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        logger.info(f"Admin {user_id} disconnected")

@app.websocket("/ws/student/{student_id}")
async def student_websocket(websocket: WebSocket, student_id: str):
    await ws_manager.connect_student(websocket, student_id)
    try:
        # Send initial state including any pending alerts
        student = db.get_student(student_id)
        alerts = db.get_student_alerts(student_id)
        active_crisis = db.get_active_crisis()
        await websocket.send_json({
            "type": "connected",
            "data": {
                "message": "Connected to HBS Sentinel",
                "student": student,
                "alerts": alerts,
                "active_crisis": active_crisis,
            }
        })
        # Notify admins this student came online
        await ws_manager.broadcast_to_admins("student_online", {
            "student_id": student_id,
            "student_name": student["name"] if student else student_id,
        })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        logger.info(f"Student {student_id} disconnected")
        await ws_manager.broadcast_to_admins("student_offline", {"student_id": student_id})

# ─── Background Tasks ─────────────────────────────────────────────────────────

async def _run_pipeline_task(
    description: str,
    source_headline: Optional[str],
    source_url: Optional[str],
    triggered_by: str,
    preset_crisis_data: Optional[dict],
):
    """Background task: runs the full AI pipeline and broadcasts updates."""
    try:
        students = db.get_all_students()

        async def progress_callback(stage: str, message: str):
            await ws_manager.broadcast_to_admins("pipeline_progress", {
                "stage": stage,
                "message": message,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

        # Run pipeline
        crisis, alerts, delivery_entries, risk_map = await run_full_pipeline(
            description,
            students,
            triggered_by=triggered_by,
            source_headline=source_headline,
            source_url=source_url,
            preset_crisis_data=preset_crisis_data,
            progress_callback=progress_callback,
        )

        # Persist to DB
        db.add_crisis(crisis)

        # Update student risk statuses
        for student in students:
            sid = student["id"]
            risk_info = risk_map.get(sid, {})
            status_str = risk_info.get("risk_status", "UNCONFIRMED")
            try:
                db.set_student_risk_status(sid, RiskStatus(status_str))
            except ValueError:
                db.set_student_risk_status(sid, RiskStatus.UNCONFIRMED)

        for alert in alerts:
            db.add_alert(alert)

        for entry in delivery_entries:
            db.add_delivery_entry(entry)

        # Stagger delivery log broadcast for dramatic effect
        affected_alerts = [a for a in alerts if a.risk_status in (RiskStatus.AFFECTED, RiskStatus.AT_RISK)]

        # Broadcast crisis event to all admins
        await ws_manager.broadcast_to_admins("crisis_detected", {
            "crisis": db.get_active_crisis(),
            "students": db.get_all_students(),
            "pipeline_status": "complete",
        })

        # Send personalized alerts to affected students (staggered)
        for i, alert in enumerate(affected_alerts):
            await asyncio.sleep(0.5 * i)  # Stagger for visual effect
            student_data = db.get_student(alert.student_id)
            await ws_manager.send_to_student(alert.student_id, "crisis_alert", {
                "alert": db._alert_to_dict(alert),
                "crisis": db.get_active_crisis(),
                "student": student_data,
            })
            # Also broadcast delivery to admins
            await ws_manager.broadcast_to_admins("alert_delivered", {
                "student_id": alert.student_id,
                "student_name": alert.student_name,
                "risk_status": alert.risk_status.value if hasattr(alert.risk_status, 'value') else alert.risk_status,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "delivery_log": db.get_delivery_log()[:30],
            })

    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)
        await ws_manager.broadcast_to_admins("pipeline_error", {
            "error": str(e),
            "message": "AI pipeline encountered an error. Please try again.",
        })
    finally:
        db.pipeline_running = False


async def _scan_news_task():
    """Background task: scans live news using Claude web search."""
    try:
        await ws_manager.broadcast_to_admins("news_scan_started", {
            "message": "Scanning live global news for crisis events...",
        })

        news_items = await monitor_news_for_crises()

        for item in news_items:
            news = NewsItem(
                id=str(uuid.uuid4())[:8],
                headline=item.get("headline", ""),
                source=item.get("source", "Unknown"),
                url=item.get("url", ""),
                detected_at=datetime.now(timezone.utc).isoformat(),
                severity_estimate=item.get("severity_estimate", 1),
                location_mentioned=item.get("location_mentioned", ""),
                is_crisis=item.get("is_crisis", False),
                crisis_type=item.get("crisis_type"),
                auto_triggered=False,
            )
            db.add_news_item(news)

        await ws_manager.broadcast_to_admins("news_scan_complete", {
            "news": db.get_news_feed()[:15],
            "new_count": len(news_items),
            "crisis_count": sum(1 for n in news_items if n.get("is_crisis")),
        })

    except Exception as e:
        logger.error(f"News scan error: {e}", exc_info=True)
        await ws_manager.broadcast_to_admins("news_scan_error", {
            "error": str(e),
        })


# ─── Serve Frontend ───────────────────────────────────────────────────────────

# Serve React build if it exists
frontend_build = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_build):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_build, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        index = os.path.join(frontend_build, "index.html")
        return FileResponse(index)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
