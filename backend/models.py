"""
HBS Sentinel — Core Data Models
All data is mock/simulated for demo purposes.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime
import uuid


class RiskStatus(str, Enum):
    AFFECTED = "AFFECTED"
    AT_RISK = "AT_RISK"
    SAFE = "SAFE"
    UNCONFIRMED = "UNCONFIRMED"


class CrisisType(str, Enum):
    TYPHOON = "Typhoon"
    HURRICANE = "Hurricane"
    EARTHQUAKE = "Earthquake"
    TERRORIST_ATTACK = "Terrorist Attack"
    CIVIL_UNREST = "Civil Unrest"
    FLOOD = "Flood"
    WILDFIRE = "Wildfire"
    OTHER = "Other"


class AlertStatus(str, Enum):
    PENDING = "PENDING"
    DELIVERED = "DELIVERED"
    READ = "READ"
    ACKNOWLEDGED = "ACKNOWLEDGED"


class UserRole(str, Enum):
    STUDENT = "student"
    ADMIN = "admin"


@dataclass
class TravelPlan:
    destination: str
    destination_lat: float
    destination_lng: float
    departure_date: str
    return_date: str
    purpose: str = "Personal Travel"


@dataclass
class Student:
    id: str
    name: str
    email: str
    password: str
    year: str
    program: str
    hometown: str
    phone: str
    current_city: str
    current_lat: float
    current_lng: float
    bio: str
    risk_status: RiskStatus = RiskStatus.UNCONFIRMED
    travel_plans: List[TravelPlan] = field(default_factory=list)
    alert_message: Optional[str] = None
    alert_id: Optional[str] = None
    safe_confirmed_at: Optional[str] = None
    last_seen: Optional[str] = None
    contact_email: bool = True
    contact_sms: bool = True
    contact_push: bool = True


@dataclass
class AdminUser:
    id: str
    name: str
    email: str
    password: str
    role: str = "admin"
    title: str = "Dean of Students"


@dataclass
class CrisisEvent:
    id: str
    name: str
    crisis_type: CrisisType
    description: str
    severity: int  # 1-10
    center_lat: float
    center_lng: float
    radius_km: float
    affected_area: str
    triggered_at: str
    triggered_by: str  # "auto" or "manual"
    confidence: float  # 0-1
    source_headline: Optional[str] = None
    source_url: Optional[str] = None
    is_active: bool = True
    affected_students: List[str] = field(default_factory=list)
    at_risk_students: List[str] = field(default_factory=list)
    pipeline_status: str = "pending"  # pending, running, complete


@dataclass
class Alert:
    id: str
    crisis_id: str
    student_id: str
    student_name: str
    risk_status: RiskStatus
    message: str
    risk_rationale: str
    created_at: str
    status: AlertStatus = AlertStatus.DELIVERED
    read_at: Optional[str] = None
    acknowledged_at: Optional[str] = None


@dataclass
class DeliveryLogEntry:
    id: str
    crisis_id: str
    student_id: str
    student_name: str
    channel: str  # "Portal", "In-App", "WebSocket"
    status: str  # "Delivered", "Pending", "Read"
    timestamp: str
    message_preview: str


@dataclass
class NewsItem:
    id: str
    headline: str
    source: str
    url: str
    detected_at: str
    severity_estimate: int
    location_mentioned: str
    is_crisis: bool
    crisis_type: Optional[str] = None
    auto_triggered: bool = False


# ─── MOCK DATA ───────────────────────────────────────────────────────────────

MOCK_STUDENTS: List[Student] = [
    Student(
        id="s001",
        name="Priya Mehta",
        email="priya.mehta@hbs.edu",
        password="hbs2026",
        year="MBA '26",
        program="MBA",
        hometown="Mumbai, India",
        phone="+1-617-555-0101",
        current_city="Bangkok, Thailand",
        current_lat=13.7563,
        current_lng=100.5018,
        bio="Second-year MBA student focusing on emerging markets finance. Currently on a self-directed immersion in Southeast Asia studying fintech ecosystems. Staying at the Sukhumvit area near BTS Asok station.",
    ),
    Student(
        id="s002",
        name="James Okafor",
        email="james.okafor@hbs.edu",
        password="hbs2026",
        year="MBA '26",
        program="MBA",
        hometown="Lagos, Nigeria",
        phone="+1-617-555-0102",
        current_city="Bangkok, Thailand",
        current_lat=13.7469,
        current_lng=100.5349,
        bio="First-year MBA with a background in infrastructure investment across Sub-Saharan Africa. Attending a regional development finance conference in Bangkok's Silom district this week.",
    ),
    Student(
        id="s003",
        name="Sofia Reyes",
        email="sofia.reyes@hbs.edu",
        password="hbs2026",
        year="MBA '25",
        program="MBA",
        hometown="Mexico City, Mexico",
        phone="+1-617-555-0103",
        current_city="Bangkok, Thailand",
        current_lat=13.7308,
        current_lng=100.5418,
        bio="HBS MBA '25 alumna now working on a social enterprise in Southeast Asia. Based in Bangkok's Sathorn neighborhood for the next three months, working with local NGOs on microfinance.",
    ),
    Student(
        id="s004",
        name="Kenji Tanaka",
        email="kenji.tanaka@hbs.edu",
        password="hbs2026",
        year="MBA '26",
        program="MBA",
        hometown="Tokyo, Japan",
        phone="+1-617-555-0104",
        current_city="Bangkok, Thailand",
        current_lat=13.7650,
        current_lng=100.5380,
        bio="MBA student with prior experience at MUFG. Conducting field research on ASEAN banking integration. Currently staying near Chatuchak district in northern Bangkok.",
    ),
    Student(
        id="s005",
        name="Aisha Patel",
        email="aisha.patel@hbs.edu",
        password="hbs2026",
        year="MBA '26",
        program="MBA",
        hometown="Nairobi, Kenya",
        phone="+1-617-555-0105",
        current_city="London, United Kingdom",
        current_lat=51.5074,
        current_lng=-0.1278,
        bio="MBA student with a background in healthcare consulting. Currently on a London trek visiting NHS digital transformation initiatives and meeting with UK-based health tech investors.",
    ),
    Student(
        id="s006",
        name="Marcus Webb",
        email="marcus.webb@hbs.edu",
        password="hbs2026",
        year="MBA '26",
        program="MBA",
        hometown="Atlanta, Georgia, USA",
        phone="+1-617-555-0106",
        current_city="São Paulo, Brazil",
        current_lat=-23.5505,
        current_lng=-46.6333,
        bio="First-year MBA focusing on consumer goods and retail. Spending a semester at FGV in São Paulo as part of an exchange program, studying Brazilian consumer market dynamics.",
    ),
    Student(
        id="s007",
        name="Lena Fischer",
        email="lena.fischer@hbs.edu",
        password="hbs2026",
        year="MBA '26",
        program="MBA",
        hometown="Munich, Germany",
        phone="+1-617-555-0107",
        current_city="Berlin, Germany",
        current_lat=52.5200,
        current_lng=13.4050,
        bio="MBA student with a background in European venture capital. Currently back home in Berlin for spring break, meeting with portfolio companies and attending a startup conference.",
    ),
    Student(
        id="s008",
        name="Yusuf Al-Rashid",
        email="yusuf.alrashid@hbs.edu",
        password="hbs2026",
        year="MBA '25",
        program="MBA",
        hometown="Riyadh, Saudi Arabia",
        phone="+1-617-555-0108",
        current_city="Dubai, UAE",
        current_lat=25.2048,
        current_lng=55.2708,
        bio="HBS MBA '25 now working at a sovereign wealth fund in Dubai. Attended a MENA investment summit this week at the Dubai World Trade Centre.",
    ),
    Student(
        id="s009",
        name="Claire Dubois",
        email="claire.dubois@hbs.edu",
        password="hbs2026",
        year="MBA '26",
        program="MBA",
        hometown="Lyon, France",
        phone="+1-617-555-0109",
        current_city="Paris, France",
        current_lat=48.8566,
        current_lng=2.3522,
        bio="MBA student focusing on luxury goods and brand strategy. Currently in Paris for a field study with LVMH and Kering, exploring sustainability initiatives in the luxury sector.",
    ),
    Student(
        id="s010",
        name="Daniel Park",
        email="daniel.park@hbs.edu",
        password="hbs2026",
        year="MBA '26",
        program="MBA",
        hometown="Seoul, South Korea",
        phone="+1-617-555-0110",
        current_city="Seoul, South Korea",
        current_lat=37.5665,
        current_lng=126.9780,
        bio="MBA student with prior experience at Samsung Electronics. Currently back in Seoul visiting family and meeting with Korean tech founders for a research project on chaebols.",
    ),
]

MOCK_ADMIN: AdminUser = AdminUser(
    id="a001",
    name="Angela Crispi",
    email="admin@hbs.edu",
    password="sentinel2026",
    title="Dean of Students, Harvard Business School",
)

# Pre-defined demo crisis scenario
BANGKOK_TYPHOON_SCENARIO = {
    "name": "Typhoon Haikui",
    "crisis_type": CrisisType.TYPHOON,
    "description": "Category 4 Typhoon Haikui has made landfall near the Gulf of Thailand and is tracking directly toward Bangkok. Sustained winds of 210 km/h with storm surge warnings issued for coastal and low-lying areas. Thai Meteorological Department has issued its highest-level alert. Mass evacuations ordered in Samut Prakan and Bang Na districts.",
    "severity": 8,
    "center_lat": 13.7563,
    "center_lng": 100.5018,
    "radius_km": 80,
    "affected_area": "Bangkok Metropolitan Region, Thailand",
}
