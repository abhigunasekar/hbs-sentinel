"""
HBS Sentinel — In-Memory State Store
Manages all application state: students, crises, alerts, delivery log, news feed.
"""

from typing import Dict, List, Optional
from models import (
    Student, AdminUser, CrisisEvent, Alert, DeliveryLogEntry, NewsItem,
    MOCK_STUDENTS, MOCK_ADMIN, RiskStatus
)
import copy


class Database:
    def __init__(self):
        # Deep copy mock data so we can mutate it during demo
        self.students: Dict[str, Student] = {s.id: copy.deepcopy(s) for s in MOCK_STUDENTS}
        self.admin: AdminUser = MOCK_ADMIN
        self.crises: Dict[str, CrisisEvent] = {}
        self.alerts: Dict[str, Alert] = {}  # keyed by alert.id
        self.delivery_log: List[DeliveryLogEntry] = []
        self.news_feed: List[NewsItem] = []
        self.active_crisis_id: Optional[str] = None
        self.pipeline_running: bool = False

    # ── Auth ──────────────────────────────────────────────────────────────────

    def authenticate(self, email: str, password: str) -> Optional[dict]:
        """Returns user dict with role if credentials match."""
        if email == self.admin.email and password == self.admin.password:
            return {
                "id": self.admin.id,
                "name": self.admin.name,
                "email": self.admin.email,
                "role": "admin",
                "title": self.admin.title,
            }
        for student in self.students.values():
            if student.email == email and student.password == password:
                return {
                    "id": student.id,
                    "name": student.name,
                    "email": student.email,
                    "role": "student",
                    "year": student.year,
                    "current_city": student.current_city,
                }
        return None

    # ── Students ──────────────────────────────────────────────────────────────

    def get_all_students(self) -> List[dict]:
        return [self._student_to_dict(s) for s in self.students.values()]

    def get_student(self, student_id: str) -> Optional[dict]:
        s = self.students.get(student_id)
        return self._student_to_dict(s) if s else None

    def get_student_by_email(self, email: str) -> Optional[Student]:
        for s in self.students.values():
            if s.email == email:
                return s
        return None

    def update_student_location(self, student_id: str, city: str, lat: float, lng: float):
        if student_id in self.students:
            self.students[student_id].current_city = city
            self.students[student_id].current_lat = lat
            self.students[student_id].current_lng = lng

    def update_student_travel_plan(self, student_id: str, travel_plan: dict):
        from models import TravelPlan
        if student_id in self.students:
            tp = TravelPlan(**travel_plan)
            # Replace or add travel plan for same destination
            plans = self.students[student_id].travel_plans
            plans = [p for p in plans if p.destination != tp.destination]
            plans.append(tp)
            self.students[student_id].travel_plans = plans

    def update_student_contacts(self, student_id: str, email: bool, sms: bool, push: bool):
        if student_id in self.students:
            self.students[student_id].contact_email = email
            self.students[student_id].contact_sms = sms
            self.students[student_id].contact_push = push

    def set_student_risk_status(self, student_id: str, status: RiskStatus):
        if student_id in self.students:
            self.students[student_id].risk_status = status

    def confirm_student_safe(self, student_id: str) -> bool:
        from datetime import datetime, timezone
        if student_id in self.students:
            self.students[student_id].risk_status = RiskStatus.SAFE
            self.students[student_id].safe_confirmed_at = datetime.now(timezone.utc).isoformat()
            # Update alert status
            for alert in self.alerts.values():
                if alert.student_id == student_id:
                    alert.status = "ACKNOWLEDGED"
                    alert.acknowledged_at = datetime.now(timezone.utc).isoformat()
            return True
        return False

    def get_student_alerts(self, student_id: str) -> List[dict]:
        return [
            self._alert_to_dict(a)
            for a in self.alerts.values()
            if a.student_id == student_id
        ]

    # ── Crises ────────────────────────────────────────────────────────────────

    def add_crisis(self, crisis: CrisisEvent):
        self.crises[crisis.id] = crisis
        self.active_crisis_id = crisis.id

    def get_active_crisis(self) -> Optional[dict]:
        if self.active_crisis_id and self.active_crisis_id in self.crises:
            return self._crisis_to_dict(self.crises[self.active_crisis_id])
        return None

    def get_all_crises(self) -> List[dict]:
        return [self._crisis_to_dict(c) for c in self.crises.values()]

    def update_crisis_pipeline_status(self, crisis_id: str, status: str):
        if crisis_id in self.crises:
            self.crises[crisis_id].pipeline_status = status

    def resolve_crisis(self, crisis_id: str):
        if crisis_id in self.crises:
            self.crises[crisis_id].is_active = False
        if self.active_crisis_id == crisis_id:
            self.active_crisis_id = None
        # Reset student statuses
        for student in self.students.values():
            student.risk_status = RiskStatus.UNCONFIRMED
            student.alert_message = None
            student.alert_id = None

    # ── Alerts ────────────────────────────────────────────────────────────────

    def add_alert(self, alert: Alert):
        self.alerts[alert.id] = alert
        # Attach to student
        if alert.student_id in self.students:
            self.students[alert.student_id].alert_message = alert.message
            self.students[alert.student_id].alert_id = alert.id

    def mark_alert_read(self, alert_id: str):
        from datetime import datetime, timezone
        if alert_id in self.alerts:
            self.alerts[alert_id].status = "READ"
            self.alerts[alert_id].read_at = datetime.now(timezone.utc).isoformat()

    # ── Delivery Log ──────────────────────────────────────────────────────────

    def add_delivery_entry(self, entry: DeliveryLogEntry):
        self.delivery_log.append(entry)

    def get_delivery_log(self, crisis_id: Optional[str] = None) -> List[dict]:
        entries = self.delivery_log
        if crisis_id:
            entries = [e for e in entries if e.crisis_id == crisis_id]
        return [self._delivery_to_dict(e) for e in reversed(entries)]

    # ── News Feed ─────────────────────────────────────────────────────────────

    def add_news_item(self, item: NewsItem):
        self.news_feed.insert(0, item)
        if len(self.news_feed) > 50:
            self.news_feed = self.news_feed[:50]

    def get_news_feed(self) -> List[dict]:
        return [self._news_to_dict(n) for n in self.news_feed]

    # ── Reset ─────────────────────────────────────────────────────────────────

    def reset_demo(self):
        """Reset all state for a fresh demo run."""
        self.students = {s.id: copy.deepcopy(s) for s in MOCK_STUDENTS}
        self.crises = {}
        self.alerts = {}
        self.delivery_log = []
        self.active_crisis_id = None
        self.pipeline_running = False
        # Keep news feed

    # ── Serializers ───────────────────────────────────────────────────────────

    def _student_to_dict(self, s: Student) -> dict:
        return {
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "year": s.year,
            "program": s.program,
            "hometown": s.hometown,
            "phone": s.phone,
            "current_city": s.current_city,
            "current_lat": s.current_lat,
            "current_lng": s.current_lng,
            "bio": s.bio,
            "risk_status": s.risk_status.value if hasattr(s.risk_status, 'value') else s.risk_status,
            "alert_message": s.alert_message,
            "alert_id": s.alert_id,
            "safe_confirmed_at": s.safe_confirmed_at,
            "contact_email": s.contact_email,
            "contact_sms": s.contact_sms,
            "contact_push": s.contact_push,
            "travel_plans": [
                {
                    "destination": tp.destination,
                    "destination_lat": tp.destination_lat,
                    "destination_lng": tp.destination_lng,
                    "departure_date": tp.departure_date,
                    "return_date": tp.return_date,
                    "purpose": tp.purpose,
                }
                for tp in s.travel_plans
            ],
        }

    def _crisis_to_dict(self, c: CrisisEvent) -> dict:
        return {
            "id": c.id,
            "name": c.name,
            "crisis_type": c.crisis_type.value if hasattr(c.crisis_type, 'value') else c.crisis_type,
            "description": c.description,
            "severity": c.severity,
            "center_lat": c.center_lat,
            "center_lng": c.center_lng,
            "radius_km": c.radius_km,
            "affected_area": c.affected_area,
            "triggered_at": c.triggered_at,
            "triggered_by": c.triggered_by,
            "confidence": c.confidence,
            "source_headline": c.source_headline,
            "source_url": c.source_url,
            "is_active": c.is_active,
            "affected_students": c.affected_students,
            "at_risk_students": c.at_risk_students,
            "pipeline_status": c.pipeline_status,
        }

    def _alert_to_dict(self, a: Alert) -> dict:
        return {
            "id": a.id,
            "crisis_id": a.crisis_id,
            "student_id": a.student_id,
            "student_name": a.student_name,
            "risk_status": a.risk_status.value if hasattr(a.risk_status, 'value') else a.risk_status,
            "message": a.message,
            "risk_rationale": a.risk_rationale,
            "created_at": a.created_at,
            "status": a.status.value if hasattr(a.status, 'value') else a.status,
            "read_at": a.read_at,
            "acknowledged_at": a.acknowledged_at,
        }

    def _delivery_to_dict(self, e: DeliveryLogEntry) -> dict:
        return {
            "id": e.id,
            "crisis_id": e.crisis_id,
            "student_id": e.student_id,
            "student_name": e.student_name,
            "channel": e.channel,
            "status": e.status,
            "timestamp": e.timestamp,
            "message_preview": e.message_preview,
        }

    def _news_to_dict(self, n: NewsItem) -> dict:
        return {
            "id": n.id,
            "headline": n.headline,
            "source": n.source,
            "url": n.url,
            "detected_at": n.detected_at,
            "severity_estimate": n.severity_estimate,
            "location_mentioned": n.location_mentioned,
            "is_crisis": n.is_crisis,
            "crisis_type": n.crisis_type,
            "auto_triggered": n.auto_triggered,
        }


# Global singleton
db = Database()
