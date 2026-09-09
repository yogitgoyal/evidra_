from app.report_extractor import extract_entities


def _values(text: str, entity_type: str) -> list[str]:
    return [
        entity["value"]
        for entity in extract_entities(text)
        if entity["type"] == entity_type
    ]


def test_institutional_phrases_are_not_people() -> None:
    text = "Forensic Cyber Lab; Cyber Crime Cell; Forensic Science Laboratory; The District Cyber Crime Cell."
    assert _values(text, "person") == []


def test_existing_institutional_controls_remain_blocked() -> None:
    text = (
        "Traffic Police; State Bank; Reserve Bank of India; "
        "Department of Telecommunications; Punjab Police; Crime Branch; "
        "State Transport Authority."
    )
    assert _values(text, "person") == []


def test_blocklist_substrings_do_not_suppress_real_names_or_locations() -> None:
    assert _values("Officer Ramesh Banerjee visited Bankura.", "person") == [
        "Ramesh Banerjee"
    ]
    assert _values("Inspector Courtney Fernandes filed the FIR.", "person") == [
        "Inspector Courtney Fernandes"
    ]
    assert _values("Witness Suresh Forcewala gave a statement in Bankura.", "person") == [
        "Suresh Forcewala"
    ]
    assert _values("Witness Suresh Forcewala gave a statement in Bankura.", "location") == []


def test_role_prefixes_are_stripped_without_name_truncation() -> None:
    assert _values(
        "Investigating Officer Rajesh Kumar Verma, attached to the case.",
        "person",
    ) == ["Rajesh Kumar Verma"]
    assert _values("Sub-Inspector Baljit Singh filed the report.", "person") == [
        "Baljit Singh"
    ]
    assert _values("Witness Priya Nair gave evidence.", "person") == ["Priya Nair"]
    assert _values("Complainant Vikram Malhotra arrived.", "person") == [
        "Vikram Malhotra"
    ]
    assert _values("The victim Ramesh Gupta called the station.", "person") == [
        "Ramesh Gupta"
    ]


def test_repeated_mentions_preserve_offsets() -> None:
    entities = [
        entity
        for entity in extract_entities(
            "Rakesh Mehta met the witness. Later, Rakesh Mehta left the station."
        )
        if entity["type"] == "person"
    ]
    assert [(entity["value"], entity["offset"]) for entity in entities] == [
        ("Rakesh Mehta", 0),
        ("Rakesh Mehta", 37),
    ]
