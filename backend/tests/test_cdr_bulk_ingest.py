import io

import pytest
from fastapi import UploadFile

from app.models.case import Case
from app.models.datasets import CdrRecord
from app.routes.bulk_ingest import upload_cdr_bulk


class FakeDb:
    def __init__(self) -> None:
        self.records = []

    async def get(self, model, case_id):
        return Case(id=case_id, name="CDR test") if model is Case else None

    def add_all(self, records) -> None:
        self.records.extend(records)

    async def commit(self) -> None:
        return None

    async def rollback(self) -> None:
        return None


async def _upload(csv_text: str) -> CdrRecord:
    db = FakeDb()
    file = UploadFile(
        file=io.BytesIO(csv_text.encode()),
        filename="cdr.csv",
        headers={"content-type": "text/csv"},
    )
    result = await upload_cdr_bulk("case-cdr-test", file, db)
    assert result["created"] == 1
    assert result["rejected"] == []
    return next(record for record in db.records if isinstance(record, CdrRecord))


@pytest.mark.asyncio
async def test_cdr_bulk_stores_valid_coordinates() -> None:
    record = await _upload(
        "caller,callee,duration_seconds,latitude,longitude\n"
        "111,222,60,30.7405,76.7830\n"
    )

    assert record.attributes == {"latitude": 30.7405, "longitude": 76.783}


@pytest.mark.asyncio
async def test_cdr_bulk_accepts_coordinate_aliases() -> None:
    record = await _upload(
        "caller,callee,duration_seconds,lat,lon\n"
        "111,222,60,30.7385,76.7815\n"
    )

    assert record.attributes == {"latitude": 30.7385, "longitude": 76.7815}


@pytest.mark.asyncio
async def test_cdr_bulk_ignores_invalid_coordinate_values() -> None:
    record = await _upload(
        "caller,callee,duration_seconds,latitude,lng\n"
        "111,222,60,not-a-number,76.7815\n"
    )

    assert record.attributes == {"longitude": 76.7815}


@pytest.mark.asyncio
async def test_cdr_bulk_without_coordinate_columns_is_unchanged() -> None:
    record = await _upload("caller,callee,duration_seconds\n111,222,60\n")

    assert record.attributes == {}