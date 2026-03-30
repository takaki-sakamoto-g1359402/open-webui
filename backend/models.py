from datetime import datetime, date

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date, Boolean, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Talent(Base):
    __tablename__ = "talents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    kind = Column(String, nullable=False)  # "human" or "ai"
    priority_score = Column(Float, default=0.5)
    max_weekly_hours = Column(Float, default=40.0)
    notes = Column(Text, nullable=True)

    activity_logs = relationship("ActivityLog", back_populates="talent", cascade="all, delete-orphan")
    self_reports = relationship("SelfReport", back_populates="talent", cascade="all, delete-orphan")
    chat_logs = relationship("ChatLog", back_populates="talent")
    schedule_recommendations = relationship(
        "ScheduleRecommendation", back_populates="talent", cascade="all, delete-orphan"
    )


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    talent_id = Column(Integer, ForeignKey("talents.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    type = Column(String, nullable=False)

    talent = relationship("Talent", back_populates="activity_logs")


class SelfReport(Base):
    __tablename__ = "self_reports"

    id = Column(Integer, primary_key=True, index=True)
    talent_id = Column(Integer, ForeignKey("talents.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    mood = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)

    talent = relationship("Talent", back_populates="self_reports")


class ChatLog(Base):
    __tablename__ = "chat_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    talent_id = Column(Integer, ForeignKey("talents.id"), nullable=True)
    user_id = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    safe = Column(Boolean, default=True)
    violation_category = Column(String, nullable=True)
    assistant_reply = Column(Text, nullable=True)

    talent = relationship("Talent", back_populates="chat_logs")


class ScheduleRecommendation(Base):
    __tablename__ = "schedule_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    generated_at = Column(DateTime, default=datetime.utcnow)
    target_week_start = Column(Date, nullable=False)
    talent_id = Column(Integer, ForeignKey("talents.id"), nullable=False)
    slot_start = Column(DateTime, nullable=False)
    slot_end = Column(DateTime, nullable=False)
    reason = Column(Text, nullable=False)

    talent = relationship("Talent", back_populates="schedule_recommendations")
