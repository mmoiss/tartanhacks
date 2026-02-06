from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from api.database import Base


class PullRequest(Base):
    __tablename__ = "pull_requests"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    app_id = Column(Integer, ForeignKey("apps.id"), nullable=False)
    github_pr_number = Column(Integer, nullable=True)
    github_pr_url = Column(String, nullable=True)
    branch_name = Column(String, nullable=True)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    files_changed = Column(JSON, nullable=True)
    status = Column(String, default="open")
    coderabbit_review = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    merged_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)

    incident = relationship("Incident", back_populates="pull_requests")
    app = relationship("App", back_populates="pull_requests")
