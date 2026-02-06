from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from api.database import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    llm_model = Column(String, nullable=True)
    prompt = Column(Text, nullable=True)
    root_cause = Column(Text, nullable=True)
    suggested_fix = Column(JSON, nullable=True)
    files_analyzed = Column(JSON, nullable=True)
    commits_analyzed = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    tokens_used = Column(Integer, nullable=True)

    incident = relationship("Incident", back_populates="analyses")
