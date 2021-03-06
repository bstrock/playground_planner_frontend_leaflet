from models.tables import Report, UnusedReports, ActivityReports, EmissionReports
from sqlalchemy.orm import with_polymorphic
from fastapi import HTTPException, status
from typing import Dict, Optional, List
from datetime import datetime
from pydantic import BaseModel
import os


class Chemical(BaseModel):
    unit: str
    total: float

    class Config:
        orm_mode = True


class ReportSchema(BaseModel):
    report_id: Optional[str] = None
    site_id: str
    report_type: str
    message: Optional[str] = None
    emission_type: Optional[str] = None
    activity_type: Optional[str] = None
    unused_type: Optional[str] = None

    class Config:
        orm_mode = True
        arbitrary_types_allowed = True


class ChildReportSchema(BaseModel):
    report_id: str
    emission_type: Optional[str]
    activity_type: Optional[str]
    unused_type: Optional[str]

    class Config:
        orm_mode = True


class SiteSchema(BaseModel):
    site_id: str
    name: str
    address: str
    city: str
    state: str
    zip: int
    latitude: float
    longitude: float
    sector: str
    carcinogen: bool
    chemicals: Dict[str, Chemical]
    release_types: list
    total_releases: float
    reports: Optional[List[ReportSchema]]

    class Config:
        orm_mode = True
        arbitrary_types_allowed = True


class Token(BaseModel):
    access_token: str
    token_type: str


class Globals:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "bearer"},
    )
    SECRET_KEY = os.environ.get("SECRET_KEY")
    ALGORITHM = os.environ.get("ALGORITHM")
    CLIENT_SECRET = os.environ.get("CLIENT_SECRET")
    ALL_REPORTS = with_polymorphic(
        Report, [EmissionReports, ActivityReports, UnusedReports]
    )
    SUB_REPORTS = [EmissionReports, ActivityReports, UnusedReports]
    MILES_TO_METERS = 1609.34
