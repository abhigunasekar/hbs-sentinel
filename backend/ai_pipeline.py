"""
HBS Sentinel — AI Pipeline
Three-stage AI pipeline:
  Stage 1: Crisis Detector — classifies crisis events from news/description
  Stage 2: Risk Scorer — determines which students are affected or at-risk
  Stage 3: Alert Composer — writes personalized alerts per student

Uses OpenAI-compatible API (configured for claude-sonnet via proxy, or real Anthropic key).
To use real Anthropic Claude: set ANTHROPIC_API_KEY env var and the client auto-switches.
"""

import os
import json
import asyncio
import math
import uuid
import logging
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple

from openai import OpenAI

from models import (
    Student, CrisisEvent, Alert, DeliveryLogEntry, NewsItem,
    RiskStatus, CrisisType, AlertStatus, BANGKOK_TYPHOON_SCENARIO
)

logger = logging.getLogger(__name__)

# ── AI Client Configuration ───────────────────────────────────────────────────
# Uses OpenAI-compatible proxy. Swap OPENAI_BASE_URL + OPENAI_API_KEY for real Claude.
_client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY", ""),
    base_url=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
)

# Model: gemini-2.5-flash via proxy (strong reasoning, fast).
# For real Claude: set MODEL = "claude-sonnet-4-5" and use Anthropic client.
MODEL = os.environ.get("SENTINEL_MODEL", "gemini-2.5-flash")


def _chat(messages: list, max_tokens: int = 2048) -> str:
    """Synchronous chat completion wrapper."""
    response = _client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()


def _parse_json(raw: str) -> any:
    """Strip markdown code fences and parse JSON."""
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


# ─── UTILITY ──────────────────────────────────────────────────────────────────

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in km between two lat/lng points."""
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── STAGE 1: CRISIS DETECTOR ─────────────────────────────────────────────────

async def detect_crisis(description: str, source_headline: Optional[str] = None) -> dict:
    """
    Stage 1: AI classifies a crisis event from a description.
    Returns structured crisis data: type, severity, coordinates, radius, confidence.
    """
    prompt = f"""You are the Crisis Detector for HBS Sentinel, a student safety platform for Harvard Business School.

Analyze the following crisis description and return a structured JSON assessment.

Crisis Description:
{description}

{f'Source Headline: {source_headline}' if source_headline else ''}

Return ONLY valid JSON with this exact structure:
{{
  "name": "Short crisis name (e.g. 'Typhoon Haikui')",
  "crisis_type": "One of: Typhoon, Hurricane, Earthquake, Terrorist Attack, Civil Unrest, Flood, Wildfire, Other",
  "severity": <integer 1-10, where 10 is catastrophic>,
  "center_lat": <decimal latitude of crisis epicenter>,
  "center_lng": <decimal longitude of crisis epicenter>,
  "radius_km": <estimated affected radius in kilometers>,
  "affected_area": "Human-readable description of affected geography",
  "confidence": <float 0.0-1.0 representing your confidence in this assessment>,
  "reasoning": "2-3 sentences explaining your severity and geographic assessment"
}}

Be precise with coordinates. For Bangkok, Thailand: lat=13.7563, lng=100.5018.
Severity guide: 1-3=minor incident, 4-6=significant event requiring monitoring, 7-8=major crisis requiring evacuation, 9-10=catastrophic/mass casualty."""

    loop = asyncio.get_event_loop()
    raw = await loop.run_in_executor(None, lambda: _chat([
        {"role": "system", "content": "You are a crisis intelligence analyst. Always respond with valid JSON only."},
        {"role": "user", "content": prompt}
    ], 1024))

    result = _parse_json(raw)
    logger.info(f"Crisis Detector: {result['name']} | Severity: {result['severity']} | Confidence: {result['confidence']}")
    return result


# ─── STAGE 2: RISK SCORER ─────────────────────────────────────────────────────

async def score_student_risks(crisis: dict, students: List[dict]) -> List[dict]:
    """
    Stage 2: AI determines risk tier for each student.
    Returns list of {student_id, risk_status, rationale} objects.
    """
    student_distances = []
    for s in students:
        dist = haversine_distance(
            crisis["center_lat"], crisis["center_lng"],
            s["current_lat"], s["current_lng"]
        )
        student_distances.append({
            "id": s["id"],
            "name": s["name"],
            "current_city": s["current_city"],
            "current_lat": s["current_lat"],
            "current_lng": s["current_lng"],
            "bio": s["bio"],
            "travel_plans": s.get("travel_plans", []),
            "distance_km": round(dist, 1),
        })

    students_json = json.dumps(student_distances, indent=2)

    prompt = f"""You are the Risk Scorer for HBS Sentinel, a student safety platform for Harvard Business School.

Active Crisis:
- Name: {crisis['name']}
- Type: {crisis['crisis_type']}
- Severity: {crisis['severity']}/10
- Location: {crisis['affected_area']} (lat: {crisis['center_lat']}, lng: {crisis['center_lng']})
- Affected Radius: {crisis['radius_km']} km
- Description: {crisis.get('description', crisis.get('reasoning', ''))}

Student Roster with distances from crisis epicenter:
{students_json}

Assign a risk tier to each student and write a brief rationale.

Risk Tiers:
- AFFECTED: Student is currently within or very near the crisis zone (within ~1.5x the radius)
- AT_RISK: Student has travel plans that would bring them into the zone within 48 hours
- SAFE: Student is clearly outside the affected region with no travel plans toward it
- UNCONFIRMED: Insufficient location data to determine

Return ONLY valid JSON array:
[
  {{
    "student_id": "s001",
    "risk_status": "AFFECTED",
    "rationale": "Priya is currently in Bangkok's Sukhumvit district, approximately 2km from the typhoon's projected landfall zone. Immediate evacuation guidance required."
  }},
  ...
]

Include ALL {len(students)} students in your response."""

    loop = asyncio.get_event_loop()
    raw = await loop.run_in_executor(None, lambda: _chat([
        {"role": "system", "content": "You are a risk assessment analyst. Always respond with valid JSON array only."},
        {"role": "user", "content": prompt}
    ], 2048))

    results = _parse_json(raw)
    logger.info(f"Risk Scorer: {len(results)} students scored")
    return results


# ─── STAGE 3: ALERT COMPOSER ──────────────────────────────────────────────────

async def compose_alert(student: dict, crisis: dict, risk_status: str, risk_rationale: str) -> str:
    """
    Stage 3: AI composes a personalized alert message for one student.
    """
    prompt = f"""You are the Alert Composer for HBS Sentinel, Harvard Business School's student safety platform.

Write a personalized safety alert for the following HBS student. The message will appear as a real-time alert banner on their HBS Sentinel portal.

STUDENT PROFILE:
- Name: {student['name']}
- Year: {student['year']}
- Current Location: {student['current_city']}
- Background: {student['bio']}

CRISIS DETAILS:
- Event: {crisis['name']}
- Type: {crisis['crisis_type']}
- Severity: {crisis['severity']}/10
- Affected Area: {crisis['affected_area']}
- Description: {crisis.get('description', '')}

RISK ASSESSMENT:
- Status: {risk_status}
- Rationale: {risk_rationale}

INSTRUCTIONS:
- Write directly to the student by first name
- Be calm, clear, and authoritative — not alarmist
- Include: (1) what is happening, (2) their specific situation, (3) what they should do right now
- For AFFECTED students: provide specific evacuation/shelter guidance
- For AT_RISK students: provide travel advisory and precautionary steps
- End with HBS emergency contact: +1-617-495-1000 (24/7 Operations) and a note that they can mark themselves safe in this portal
- Keep it under 200 words
- Do NOT use bullet points — write in clear, direct paragraphs
- Tone: like a trusted advisor who takes this seriously but doesn't panic"""

    loop = asyncio.get_event_loop()
    message = await loop.run_in_executor(None, lambda: _chat([
        {"role": "system", "content": "You are a student safety communications expert at Harvard Business School. Write clear, calm, personalized safety alerts."},
        {"role": "user", "content": prompt}
    ], 512))

    logger.info(f"Alert composed for {student['name']} ({risk_status}): {len(message)} chars")
    return message


# ─── GDELT NEWS FETCHER ───────────────────────────────────────────────────────

def _fetch_gdelt_articles(query: str, timespan: str = "72h", max_records: int = 20) -> List[dict]:
    """
    Fetch real news articles from the GDELT Project API.
    Returns list of article dicts with url, title, seendate, sourcecountry, language.
    Rate limit: 1 request per 5 seconds.
    """
    encoded_query = urllib.parse.quote(query)
    url = (
        f"https://api.gdeltproject.org/api/v2/doc/doc"
        f"?query={encoded_query}"
        f"&mode=artlist"
        f"&maxrecords={max_records}"
        f"&format=json"
        f"&timespan={timespan}"
        f"&sourcelang=english"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "HBS-Sentinel/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
        if not raw.strip().startswith("{"):
            logger.warning(f"GDELT non-JSON response: {raw[:100]}")
            return []
        data = json.loads(raw)
        articles = data.get("articles", [])
        # Filter to English only
        english = [a for a in articles if a.get("language", "").lower() == "english"]
        logger.info(f"GDELT fetched {len(english)} English articles for query: {query[:50]}")
        return english
    except Exception as e:
        logger.error(f"GDELT fetch error: {e}")
        return []


# ─── NEWS MONITOR ─────────────────────────────────────────────────────────────

async def monitor_news_for_crises() -> List[dict]:
    """
    Fetches REAL live news from GDELT, then uses AI to classify each article
    for crisis relevance, severity, and geographic location.
    """
    student_locations = [
        "Bangkok Thailand", "London UK", "São Paulo Brazil",
        "Berlin Germany", "Dubai UAE", "Paris France", "Seoul South Korea"
    ]

    # Fetch real articles from GDELT
    loop = asyncio.get_event_loop()
    gdelt_articles = await loop.run_in_executor(
        None,
        lambda: _fetch_gdelt_articles(
            "(hurricane OR typhoon OR earthquake OR flood OR wildfire OR tsunami OR disaster OR explosion OR attack OR civil unrest OR evacuation OR emergency)",
            timespan="72h",
            max_records=25,
        )
    )

    if not gdelt_articles:
        logger.warning("GDELT returned no articles — falling back to AI-generated intelligence")
        # Fallback: AI-generated items if GDELT is unavailable
        return await _ai_fallback_news(student_locations)

    # Prepare article summaries for Claude to classify
    articles_text = "\n".join([
        f"- [{a.get('sourcecountry', 'Unknown')}] {a.get('title', 'No title')} (seen: {a.get('seendate', '')})"
        for a in gdelt_articles[:20]
    ])

    locations_str = ", ".join(student_locations)

    prompt = f"""You are the Crisis Monitor for HBS Sentinel, a student safety intelligence platform for Harvard Business School.

The following are REAL news headlines fetched live from the GDELT global news database in the last 72 hours:

{articles_text}

HBS students are currently located in: {locations_str}

For each headline that represents a genuine safety concern for international travelers or students, classify it. Focus on:
- Natural disasters (hurricanes, typhoons, earthquakes, floods, wildfires)
- Civil unrest, protests, or political violence
- Terrorist attacks or security incidents
- Infrastructure failures (dam collapses, power grid failures)
- Public health emergencies

Return ONLY a JSON array of the relevant items (skip irrelevant headlines):
[
  {{
    "headline": "Exact or paraphrased headline",
    "source": "GDELT / [source country]",
    "url": "",
    "severity_estimate": <1-10>,
    "location_mentioned": "City/Country",
    "is_crisis": <true if this warrants student safety attention>,
    "crisis_type": "Typhoon/Hurricane/Earthquake/Terrorist Attack/Civil Unrest/Flood/Wildfire/Other or null",
    "data_source": "GDELT Live Feed"
  }}
]

Include 3-8 items. Only include items with genuine safety relevance. If a headline is clearly not safety-related, skip it."""

    try:
        raw = await loop.run_in_executor(None, lambda: _chat([
            {"role": "system", "content": "You are a global safety intelligence analyst. Classify real news headlines for crisis relevance. Return valid JSON array only."},
            {"role": "user", "content": prompt}
        ], 2048))

        results = _parse_json(raw)

        # Attach real URLs from GDELT articles where possible
        for item in results:
            for article in gdelt_articles:
                title_lower = article.get("title", "").lower()
                headline_lower = item.get("headline", "").lower()
                # Match on first 4 words
                first_words = " ".join(headline_lower.split()[:4])
                if first_words and first_words in title_lower:
                    item["url"] = article.get("url", "")
                    item["source"] = f"GDELT / {article.get('sourcecountry', 'Live Feed')}"
                    break

        logger.info(f"News monitor: {len(results)} crisis items classified from {len(gdelt_articles)} GDELT articles")
        return results
    except Exception as e:
        logger.error(f"News monitor AI classification error: {e}")
        return await _ai_fallback_news(student_locations)


async def _ai_fallback_news(student_locations: List[str]) -> List[dict]:
    """Fallback: AI-generated safety intelligence when GDELT is unavailable."""
    locations_str = ", ".join(student_locations)
    prompt = f"""You are the Crisis Monitor for HBS Sentinel. GDELT news feed is temporarily unavailable.

Generate 3-5 realistic safety intelligence items for HBS students in: {locations_str}

Return ONLY a JSON array:
[
  {{
    "headline": "Descriptive headline",
    "source": "AI Safety Intelligence (GDELT unavailable)",
    "url": "",
    "severity_estimate": <1-10>,
    "location_mentioned": "City/Country",
    "is_crisis": <true/false>,
    "crisis_type": "type or null",
    "data_source": "AI Fallback"
  }}
]"""
    loop = asyncio.get_event_loop()
    try:
        raw = await loop.run_in_executor(None, lambda: _chat([
            {"role": "system", "content": "You are a safety intelligence analyst. Return valid JSON array only."},
            {"role": "user", "content": prompt}
        ], 1024))
        return _parse_json(raw)
    except Exception as e:
        logger.error(f"AI fallback news error: {e}")
        return []


# ─── FULL PIPELINE ORCHESTRATOR ───────────────────────────────────────────────

async def run_full_pipeline(
    crisis_description: str,
    students: List[dict],
    triggered_by: str = "manual",
    source_headline: Optional[str] = None,
    source_url: Optional[str] = None,
    preset_crisis_data: Optional[dict] = None,
    progress_callback=None,
) -> Tuple[CrisisEvent, List[Alert], List[DeliveryLogEntry], Dict]:
    """
    Runs the full 3-stage AI pipeline.
    Returns (crisis_event, alerts, delivery_log_entries, risk_map).
    """

    async def progress(stage: str, message: str):
        if progress_callback:
            await progress_callback(stage, message)
        logger.info(f"[Pipeline] {stage}: {message}")

    # ── Stage 1: Crisis Detection ──────────────────────────────────────────
    await progress("detecting", "Stage 1/3 — Crisis Detector analyzing event...")

    if preset_crisis_data:
        crisis_data = preset_crisis_data
        crisis_data["reasoning"] = crisis_description
        crisis_data["description"] = crisis_description
    else:
        crisis_data = await detect_crisis(crisis_description, source_headline)
        crisis_data["description"] = crisis_description

    crisis_id = str(uuid.uuid4())[:8]
    crisis = CrisisEvent(
        id=crisis_id,
        name=crisis_data["name"],
        crisis_type=crisis_data.get("crisis_type", "Other"),
        description=crisis_description,
        severity=crisis_data["severity"],
        center_lat=crisis_data["center_lat"],
        center_lng=crisis_data["center_lng"],
        radius_km=crisis_data["radius_km"],
        affected_area=crisis_data["affected_area"],
        triggered_at=now_iso(),
        triggered_by=triggered_by,
        confidence=crisis_data.get("confidence", 0.95),
        source_headline=source_headline,
        source_url=source_url,
        pipeline_status="scoring",
    )

    await progress("scoring", f"Stage 2/3 — Risk Scorer evaluating {len(students)} students...")

    # ── Stage 2: Risk Scoring ──────────────────────────────────────────────
    risk_scores = await score_student_risks(crisis_data, students)
    risk_map: Dict[str, dict] = {r["student_id"]: r for r in risk_scores}

    affected_ids = [r["student_id"] for r in risk_scores if r["risk_status"] == "AFFECTED"]
    at_risk_ids = [r["student_id"] for r in risk_scores if r["risk_status"] == "AT_RISK"]

    crisis.affected_students = affected_ids
    crisis.at_risk_students = at_risk_ids
    crisis.pipeline_status = "composing"

    await progress("composing", f"Stage 3/3 — Alert Composer writing personalized messages for {len(affected_ids + at_risk_ids)} students...")

    # ── Stage 3: Alert Composition ────────────────────────────────────────
    alerts: List[Alert] = []
    delivery_entries: List[DeliveryLogEntry] = []

    students_needing_alerts = [
        s for s in students
        if s["id"] in affected_ids or s["id"] in at_risk_ids
    ]

    crisis_dict = {
        "name": crisis.name,
        "crisis_type": crisis.crisis_type if isinstance(crisis.crisis_type, str) else crisis.crisis_type.value,
        "severity": crisis.severity,
        "affected_area": crisis.affected_area,
        "description": crisis.description,
    }

    # Compose alerts concurrently for speed
    async def compose_one(student: dict):
        sid = student["id"]
        risk_info = risk_map.get(sid, {})
        risk_status = risk_info.get("risk_status", "UNCONFIRMED")
        risk_rationale = risk_info.get("rationale", "")
        message = await compose_alert(student, crisis_dict, risk_status, risk_rationale)
        return sid, risk_status, risk_rationale, message

    composed = await asyncio.gather(*[compose_one(s) for s in students_needing_alerts])

    for sid, risk_status, risk_rationale, message in composed:
        student = next(s for s in students if s["id"] == sid)
        alert = Alert(
            id=str(uuid.uuid4())[:8],
            crisis_id=crisis_id,
            student_id=sid,
            student_name=student["name"],
            risk_status=RiskStatus(risk_status),
            message=message,
            risk_rationale=risk_rationale,
            created_at=now_iso(),
            status=AlertStatus.DELIVERED,
        )
        alerts.append(alert)
        delivery_entries.append(DeliveryLogEntry(
            id=str(uuid.uuid4())[:8],
            crisis_id=crisis_id,
            student_id=sid,
            student_name=student["name"],
            channel="Portal",
            status="Delivered",
            timestamp=now_iso(),
            message_preview=message[:80] + "..." if len(message) > 80 else message,
        ))

    # Add SAFE entries for non-affected students
    for student in students:
        sid = student["id"]
        if sid not in affected_ids and sid not in at_risk_ids:
            delivery_entries.append(DeliveryLogEntry(
                id=str(uuid.uuid4())[:8],
                crisis_id=crisis_id,
                student_id=sid,
                student_name=student["name"],
                channel="Portal",
                status="No Alert — Safe",
                timestamp=now_iso(),
                message_preview="Student confirmed outside affected zone. No alert sent.",
            ))

    crisis.pipeline_status = "complete"

    await progress("complete", f"Pipeline complete — {len(affected_ids)} affected, {len(at_risk_ids)} at-risk, {len(alerts)} alerts composed")

    return crisis, alerts, delivery_entries, risk_map
