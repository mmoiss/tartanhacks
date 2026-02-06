from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from api.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("apps.id"), nullable=False)
    type = Column(String, nullable=False)
    source = Column(String, nullable=False)
    status = Column(String, default="open")
    error_message = Column(Text, nullable=True)
    stack_trace = Column(Text, nullable=True)
    logs = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)

    app = relationship("App", back_populates="incidents")
    analyses = relationship("Analysis", back_populates="incident", cascade="all, delete-orphan")
    pull_requests = relationship("PullRequest", back_populates="incident")
