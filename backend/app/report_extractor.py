import re
from ipaddress import ip_address


PHONE_PATTERN = re.compile(
    r"(?<!\d)(?:\+91[\s-]?|0[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)"
)
VEHICLE_PATTERN = re.compile(
    r"(?<![A-Z0-9])[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{1,3}[\s-]?\d{4}(?![A-Z0-9])",
    re.IGNORECASE,
)
IP_PATTERN = re.compile(r"(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])")
DATE_PATTERN = re.compile(
    r"\b(?:"
    r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}"
    r"|\d{4}[/-]\d{1,2}[/-]\d{1,2}"
    r"|\d{1,2}(?:st|nd|rd|th)?\s+"
    r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|"
    r"Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|"
    r"Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}"
    r")\b",
    re.IGNORECASE,
)
AMOUNT_PATTERN = re.compile(
    r"(?<!\w)(?:₹|Rs\.?|INR)\s*\d+(?:,\d+)*(?:\.\d{1,2})?(?!\w)",
    re.IGNORECASE,
)
PERSON_PATTERN = re.compile(r"\b[A-Z][a-z]{1,30}(?:(?:\s+|-)[A-Z][a-z]{1,30}){1,5}\b")

LOCATION_NAMES = {
    "Amritsar", "Bengaluru", "Chandigarh", "Chennai", "Delhi", "Gurugram",
    "Hyderabad", "Jaipur", "Kolkata", "Lucknow", "Mumbai", "New Delhi",
    "Pune", "Punjab", "Rajasthan", "Uttar Pradesh", "West Bengal",
}
PERSON_STOPWORDS = {
    "Amount", "Case", "Date", "FIR", "Officer", "Report", "Station",
    "Vehicle", "Witness",
}
INSTITUTIONAL_KEYWORDS = {
    "authority", "bank", "branch", "court", "department", "force",
    "cell", "lab", "laboratory", "ministry", "office", "police",
    "station", "unit",
}
ROLE_PREFIXES = (
    "Investigating Officer",
    "Sub-Inspector",
    "Sub Inspector",
    "Witness",
    "Complainant",
    "Suspect",
    "Officer",
    "Victim",
    "Accused",
)


def _matches(pattern: re.Pattern[str], text: str, entity_type: str) -> list[dict]:
    entities = []
    for match in pattern.finditer(text):
        value = match.group(0)
        if entity_type == "ip":
            try:
                ip_address(value)
            except ValueError:
                continue
        entities.append({
            "type": entity_type,
            "value": value,
            "confidence": "high",
            "offset": match.start(),
        })
    return entities


def _heuristic_entities(text: str) -> list[dict]:
    entities = []
    occupied = {item["value"] for item in _matches(DATE_PATTERN, text, "date")}
    institutional_spans = []
    for match in PERSON_PATTERN.finditer(text):
        value = match.group(0)
        words = {word.casefold() for word in value.split()}
        if words & INSTITUTIONAL_KEYWORDS:
            institutional_spans.append(match.span())
            continue
        if value in PERSON_STOPWORDS or value in LOCATION_NAMES or value in occupied:
            continue
        role_prefix = next(
            (prefix for prefix in ROLE_PREFIXES
             if value.casefold().startswith(prefix.casefold() + " ")),
            None,
        )
        if role_prefix:
            value = value[len(role_prefix) + 1:]
            offset = match.start() + len(role_prefix) + 1
        else:
            offset = match.start()
        if not value:
            continue
        entities.append({
            "type": "person",
            "value": value,
            "confidence": "ambiguous",
            "offset": offset,
        })
    for location in sorted(LOCATION_NAMES, key=len, reverse=True):
        for match in re.finditer(rf"\b{re.escape(location)}\b", text, re.IGNORECASE):
            if any(start <= match.start() and match.end() <= end for start, end in institutional_spans):
                continue
            entities.append({
                "type": "location",
                "value": match.group(0),
                "confidence": "ambiguous",
                "offset": match.start(),
            })
    return entities


def extract_entities(raw_text: str) -> list[dict]:
    entities = []
    for pattern, entity_type in (
        (PHONE_PATTERN, "phone"),
        (VEHICLE_PATTERN, "vehicle"),
        (IP_PATTERN, "ip"),
        (DATE_PATTERN, "date"),
        (AMOUNT_PATTERN, "amount"),
    ):
        entities.extend(_matches(pattern, raw_text, entity_type))
    entities.extend(_heuristic_entities(raw_text))

    unique = {}
    for entity in entities:
        # Keep repeated mentions distinct for provenance; graph construction collapses node IDs.
        key = (entity["type"], entity["value"].casefold(), entity["offset"])
        unique[key] = entity
    return sorted(unique.values(), key=lambda entity: (entity["offset"], entity["type"]))
