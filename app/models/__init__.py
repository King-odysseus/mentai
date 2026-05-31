"""Model registry — import all models so SQLAlchemy discovers tables for create_all()."""

from app.models.project import LearningProject
from app.models.session import LearningSession
from app.models.concept import ConceptExposure, DesignPattern, Goal
from app.models.user_profile import UserProfile
