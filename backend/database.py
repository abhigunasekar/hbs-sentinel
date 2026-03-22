"""
HBS Sentinel — In-Memory State Store
Manages all application state: students, crises, alerts, delivery log, news feed.
Version: v3.0 — Added crisis_history seeding, news deduplication, reports data
"""

from typing import Dict, List, Optional
from models import (
    Student, AdminUser, CrisisEvent, Alert, DeliveryLogEntry, NewsItem,
    MOCK_STUDENTS, MOCK_ADMIN, RiskStatus
)
import copy
from datetime import datetime, timezone


# ── Seeded crisis history records ─────────────────────────────────────────────

SEEDED_CRISIS_HISTORY = [
    {
        "id": "hist-001",
        "name": "Typhoon Haikui",
        "crisis_type": "Typhoon",
        "severity": 5,
        "location": "Bangkok, Thailand",
        "center_lat": 13.7563,
        "center_lng": 100.5018,
        "triggered_at": "2026-02-14T09:23:00Z",
        "students_affected": 4,
        "avg_response_time_minutes": 8,
        "fastest_response_minutes": 4,
        "status": "Resolved",
        "affected_students": ["Priya Mehta", "James Okafor", "Sofia Reyes", "Kenji Tanaka"],
        "confirmed_safe": 3,
        "source_headline": "BREAKING: Category 4 Typhoon Haikui makes landfall near Bangkok",
    },
    {
        "id": "hist-002",
        "name": "Sao Paulo Flash Flooding",
        "crisis_type": "Flood",
        "severity": 3,
        "location": "Sao Paulo, Brazil",
        "center_lat": -23.5505,
        "center_lng": -46.6333,
        "triggered_at": "2026-01-28T14:05:00Z",
        "students_affected": 1,
        "avg_response_time_minutes": 22,
        "fastest_response_minutes": 22,
        "status": "Resolved",
        "affected_students": ["Marcus Webb"],
        "confirmed_safe": 1,
        "source_headline": "Severe flash flooding shuts down Paulista Avenue and central districts",
    },
    {
        "id": "hist-003",
        "name": "London Transit Strike",
        "crisis_type": "Civil Unrest",
        "severity": 2,
        "location": "London, United Kingdom",
        "center_lat": 51.5074,
        "center_lng": -0.1278,
        "triggered_at": "2026-01-15T07:45:00Z",
        "students_affected": 2,
        "avg_response_time_minutes": 45,
        "fastest_response_minutes": 31,
        "status": "Resolved",
        "affected_students": ["Aisha Patel", "Claire Dubois"],
        "confirmed_safe": 2,
        "source_headline": "London Underground strike enters third day; Heathrow links disrupted",
    },
    {
        "id": "hist-004",
        "name": "Dubai Sandstorm",
        "crisis_type": "Other",
        "severity": 2,
        "location": "Dubai, UAE",
        "center_lat": 25.2048,
        "center_lng": 55.2708,
        "triggered_at": "2026-03-02T11:30:00Z",
        "students_affected": 1,
        "avg_response_time_minutes": 12,
        "fastest_response_minutes": 12,
        "status": "Resolved",
        "affected_students": ["Yusuf Al-Rashid"],
        "confirmed_safe": 1,
        "source_headline": "Severe sandstorm grounds flights at Dubai International Airport",
    },
    {
        "id": "hist-005",
        "name": "Seoul Earthquake Warning",
        "crisis_type": "Earthquake",
        "severity": 4,
        "location": "Seoul, South Korea",
        "center_lat": 37.5665,
        "center_lng": 126.9780,
        "triggered_at": "2026-03-10T03:17:00Z",
        "students_affected": 1,
        "avg_response_time_minutes": 6,
        "fastest_response_minutes": 6,
        "status": "Resolved",
        "affected_students": ["Daniel Park"],
        "confirmed_safe": 1,
        "source_headline": "5.8 magnitude earthquake strikes near Seoul; aftershocks expected",
    },
]


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
        # Crisis history (seeded + live)
        self.crisis_history: List[dict] = copy.deepcopy(SEEDED_CRISIS_HISTORY)

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
        if student_id in self.students:
            self.students[student_id].risk_status = RiskStatus.SAFE
            self.students[student_id].safe_confirmed_at = datetime.now(timezone.utc).isoformat()
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
        for student in self.students.values():
            student.risk_status = RiskStatus.UNCONFIRMED
            student.alert_message = None
            student.alert_id = None

    # ── Crisis History ────────────────────────────────────────────────────────

    def get_crisis_history(self) -> List[dict]:
        """Return seeded + live crisis history, most recent first."""
        live = []
        for c in self.crises.values():
            affected_count = len(c.affected_students) + len(c.at_risk_students)
            response_times = []
            for alert in self.alerts.values():
                if alert.crisis_id == c.id and alert.acknowledged_at:
                    try:
                        sent = datetime.fromisoformat(alert.created_at.replace("Z", "+00:00"))
                        ack = datetime.fromisoformat(alert.acknowledged_at.replace("Z", "+00:00"))
                        diff_minutes = (ack - sent).total_seconds() / 60
                        response_times.append(diff_minutes)
                    except Exception:
                        pass
            avg_rt = round(sum(response_times) / len(response_times), 1) if response_times else None
            fastest = round(min(response_times), 1) if response_times else None
            live.append({
                "id": c.id,
                "name": c.name,
                "crisis_type": c.crisis_type.value if hasattr(c.crisis_type, "value") else c.crisis_type,
                "severity": c.severity,
                "location": c.affected_area,
                "center_lat": c.center_lat,
                "center_lng": c.center_lng,
                "triggered_at": c.triggered_at,
                "students_affected": affected_count,
                "avg_response_time_minutes": avg_rt,
                "fastest_response_minutes": fastest,
                "status": "Active" if c.is_active else "Resolved",
                "affected_students": [
                    self.students[sid].name for sid in c.affected_students if sid in self.students
                ],
                "confirmed_safe": sum(
                    1 for sid in (c.affected_students + c.at_risk_students)
                    if sid in self.students and self.students[sid].risk_status == RiskStatus.SAFE
                ),
                "source_headline": c.source_headline,
            })
        live_names = {e["name"] for e in live}
        seeded = [e for e in self.crisis_history if e["name"] not in live_names]
        combined = live + seeded
        combined.sort(key=lambda x: x.get("triggered_at", ""), reverse=True)
        return combined

    def get_reports_summary(self) -> dict:
        """Aggregate stats for the Reports tab."""
        history = self.get_crisis_history()
        total = len(history)
        response_times = [
            h["avg_response_time_minutes"]
            for h in history
            if h.get("avg_response_time_minutes") is not None
        ]
        avg_rt = round(sum(response_times) / len(response_times), 1) if response_times else 0
        fastest = round(min(response_times), 1) if response_times else 0

        region_map = {
            "Southeast Asia": ["Bangkok", "Thailand", "Vietnam", "Indonesia", "Singapore", "Malaysia", "Philippines"],
            "Europe": ["London", "Berlin", "Paris", "Munich", "Lyon", "Rome", "Madrid", "Amsterdam", "United Kingdom", "Germany", "France"],
            "South America": ["Sao Paulo", "Brazil", "Buenos Aires", "Lima", "Bogota"],
            "Middle East": ["Dubai", "UAE", "Riyadh", "Saudi", "Doha", "Qatar", "Abu Dhabi"],
            "East Asia": ["Seoul", "South Korea", "Tokyo", "Japan", "Beijing", "Shanghai", "China"],
            "North America": ["New York", "Boston", "Atlanta", "Chicago", "Los Angeles", "USA", "Canada"],
            "Africa": ["Lagos", "Nigeria", "Nairobi", "Kenya", "Cairo", "Egypt"],
            "South Asia": ["Mumbai", "India", "Delhi", "Karachi", "Pakistan"],
        }
        region_counts: Dict[str, int] = {r: 0 for r in region_map}
        for h in history:
            loc = h.get("location", "")
            for region, keywords in region_map.items():
                if any(kw.lower() in loc.lower() for kw in keywords):
                    region_counts[region] += 1
                    break

        student_concentration: Dict[str, int] = {r: 0 for r in region_map}
        for s in self.students.values():
            city = s.current_city
            for region, keywords in region_map.items():
                if any(kw.lower() in city.lower() for kw in keywords):
                    student_concentration[region] += 1
                    break

        all_response_times = []
        for alert in self.alerts.values():
            if alert.acknowledged_at:
                try:
                    sent = datetime.fromisoformat(alert.created_at.replace("Z", "+00:00"))
                    ack = datetime.fromisoformat(alert.acknowledged_at.replace("Z", "+00:00"))
                    diff_minutes = (ack - sent).total_seconds() / 60
                    all_response_times.append(diff_minutes)
                except Exception:
                    pass
        for h in self.crisis_history:
            rt = h.get("avg_response_time_minutes")
            if rt is not None:
                all_response_times.append(rt)

        buckets = {
            "Under 5 min": sum(1 for t in all_response_times if t < 5),
            "5-15 min": sum(1 for t in all_response_times if 5 <= t < 15),
            "15-30 min": sum(1 for t in all_response_times if 15 <= t < 30),
            "30-60 min": sum(1 for t in all_response_times if 30 <= t < 60),
            "Over 60 min": sum(1 for t in all_response_times if t >= 60),
        }

        total_affected = sum(h.get("students_affected", 0) for h in history)
        total_confirmed = sum(h.get("confirmed_safe", 0) for h in history)
        no_response = max(0, total_affected - total_confirmed)

        student_stats = []
        for s in self.students.values():
            student_alerts = [a for a in self.alerts.values() if a.student_id == s.id]
            resp_times = []
            for a in student_alerts:
                if a.acknowledged_at:
                    try:
                        sent = datetime.fromisoformat(a.created_at.replace("Z", "+00:00"))
                        ack = datetime.fromisoformat(a.acknowledged_at.replace("Z", "+00:00"))
                        resp_times.append((ack - sent).total_seconds() / 60)
                    except Exception:
                        pass
            crises_involved = len(student_alerts)
            for h in self.crisis_history:
                if s.name in h.get("affected_students", []):
                    crises_involved += 1
                    rt = h.get("avg_response_time_minutes")
                    if rt is not None:
                        resp_times.append(rt)
            avg_student_rt = round(sum(resp_times) / len(resp_times), 1) if resp_times else None
            student_stats.append({
                "id": s.id,
                "name": s.name,
                "current_city": s.current_city,
                "crises_involved": crises_involved,
                "avg_response_time": avg_student_rt,
                "risk_status": s.risk_status.value if hasattr(s.risk_status, "value") else s.risk_status,
            })
        student_stats.sort(key=lambda x: x["crises_involved"], reverse=True)

        return {
            "summary": {
                "total_crises": total,
                "avg_response_time": avg_rt,
                "fastest_response": fastest,
            },
            "crisis_history": history,
            "region_counts": region_counts,
            "student_concentration": student_concentration,
            "response_buckets": buckets,
            "response_rate": {
                "confirmed_safe": total_confirmed,
                "no_response": no_response,
                "total": total_affected,
            },
            "student_stats": student_stats,
        }

    # ── Alerts ────────────────────────────────────────────────────────────────

    def add_alert(self, alert: Alert):
        self.alerts[alert.id] = alert
        if alert.student_id in self.students:
            self.students[alert.student_id].alert_message = alert.message
            self.students[alert.student_id].alert_id = alert.id

    def mark_alert_read(self, alert_id: str):
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
        # Deduplicate by URL and headline (bug fix #1)
        existing_urls = {n.url for n in self.news_feed if n.url}
        existing_headlines = {n.headline.lower().strip() for n in self.news_feed}
        if item.url and item.url in existing_urls:
            return
        if item.headline.lower().strip() in existing_headlines:
            return
        self.news_feed.insert(0, item)
        if len(self.news_feed) > 50:
            self.news_feed = self.news_feed[:50]

    def get_news_feed(self) -> List[dict]:
        return [self._news_to_dict(n) for n in self.news_feed]

    # ── Registration ──────────────────────────────────────────────────────────

    def register_student(self, name: str, email: str, password: str, year: str,
                          program: str, hometown: str, phone: str,
                          current_city: str, current_lat: float, current_lng: float) -> dict:
        """Register a new student account and return the user dict."""
        from models import Student, RiskStatus
        import uuid as _uuid
        if email == self.admin.email:
            return None
        for s in self.students.values():
            if s.email == email:
                return None
        new_id = f"s{str(len(self.students) + 1).zfill(3)}"
        while new_id in self.students:
            new_id = f"s{str(_uuid.uuid4())[:6]}"
        student = Student(
            id=new_id,
            name=name,
            email=email,
            password=password,
            year=year,
            program=program,
            hometown=hometown,
            phone=phone,
            current_city=current_city,
            current_lat=current_lat,
            current_lng=current_lng,
            bio=f"{name} is an HBS {program} student from {hometown}, currently based in {current_city}.",
            risk_status=RiskStatus.UNCONFIRMED,
        )
        self.students[new_id] = student
        return self._student_to_dict(student)

    # ── Reset ─────────────────────────────────────────────────────────────────

    def reset_demo(self):
        """Reset all state for a fresh demo run."""
        self.students = {s.id: copy.deepcopy(s) for s in MOCK_STUDENTS}
        self.crises = {}
        self.alerts = {}
        self.delivery_log = []
        self.active_crisis_id = None
        self.pipeline_running = False
        # Keep news feed and seeded crisis history

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
