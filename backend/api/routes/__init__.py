from fastapi import APIRouter
from .health import router as health_router
from .admin import router as admin_router
from .doctor import router as doctor_router
from .patient import router as patient_router
from .staff import router as staff_router
from .notifications import router as notifications_router
from .auth import router as auth_router

router = APIRouter()

router.include_router(health_router, prefix="/health", tags=["health"])
router.include_router(auth_router, prefix="/auth", tags=["auth"])
router.include_router(admin_router, prefix="/admin", tags=["admin"])
router.include_router(doctor_router, prefix="/doctor", tags=["doctor"])
router.include_router(patient_router, prefix="/patient", tags=["patient"])
router.include_router(staff_router, prefix="/staff", tags=["staff"])
router.include_router(notifications_router, prefix="/notifications", tags=["notifications"]) 