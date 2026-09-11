import os
import io
import csv
import shutil
import pandas as pd
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db, User, UserProfile, ActivityLog, ChallengePerformance, Appointment, Notification
import auth
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

router = APIRouter()

def get_user_by_username(db: Session, username: str):
    if not username:
        return None
    if username.isdigit():
        u = db.query(User).filter(User.id == int(username)).first()
        if u:
            return u
            
    prefix = username.split("@")[0] if "@" in username else username
    return db.query(User).filter(
        (User.email == username) | 
        (User.name == username) | 
        (User.email.like(f"{prefix}@%"))
    ).first()

@router.get("/me")
def get_my_profile(current_user: User = Depends(auth.get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user

@router.post("/update")
def update_my_profile(
    full_name: str = Form(...),
    phone: str = Form(None),
    wake_up_time: str = Form("07:00"),
    sleep_time: str = Form("22:30"),
    sleep_duration: float = Form(8.0),
    preferred_alarm_sound: str = Form("Chimes"),
    challenge_preference: str = Form("Math Puzzle"),
    difficulty_level: str = Form("medium"),
    time_zone: str = Form("UTC"),
    productivity_goal: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    current_user.full_name = full_name
    current_user.phone = phone
    
    profile = current_user.profile
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(current_user)
        profile = current_user.profile
        
    profile.wake_up_time = wake_up_time
    profile.sleep_time = sleep_time
    profile.sleep_duration = sleep_duration
    profile.preferred_alarm_sound = preferred_alarm_sound
    profile.challenge_preference = challenge_preference
    profile.difficulty_level = difficulty_level
    profile.time_zone = time_zone
    if productivity_goal is not None:
        profile.productivity_goal = productivity_goal
    
    # Log
    log = ActivityLog(user_id=current_user.id, action="Update Profile", details="Updated personal details and circadian targets")
    db.add(log)
    
    db.commit()
    return {"message": "Profile updated successfully"}

@router.post("/change-password")
def change_password(
    old_password: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    if not auth.verify_password(old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect old password")
        
    current_user.password_hash = auth.get_password_hash(new_password)
    log = ActivityLog(user_id=current_user.id, action="Password Change", details="Changed account password")
    db.add(log)
    db.commit()
    return {"message": "Password changed successfully"}

@router.post("/upload-avatar")
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    upload_dir = "static/images"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"avatar_{current_user.id}{file_ext}"
    filepath = os.path.join(upload_dir, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    current_user.profile_image = f"/static/images/{filename}"
    log = ActivityLog(user_id=current_user.id, action="Update Profile", details=f"Uploaded profile image: {filename}")
    db.add(log)
    db.commit()
    
    return {"message": "Avatar uploaded successfully", "profile_image": current_user.profile_image}


# =====================================================================
# NOTIFICATIONS — Live polling endpoint for browser notification system
# =====================================================================

from database import Notification
from fastapi.responses import JSONResponse

@router.get("/notifications", response_class=JSONResponse)
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """GET /api/user/notifications — Called every 30s by browser to check for new alarm notifications."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(20)
        .all()
    )
    unread_count = sum(1 for n in notifications if not n.read_status)
    
    return {
        "unread_count": unread_count,
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "read_status": n.read_status,
                "created_at": n.created_at.isoformat() if n.created_at else None
            }
            for n in notifications
        ]
    }


@router.post("/notifications/mark-read", response_class=JSONResponse)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """POST /api/user/notifications/mark-read — Mark all notifications as read."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read_status == False
    ).update({"read_status": True})
    db.commit()
    return {"message": "All notifications marked as read"}


# =====================================================================
# USER EXPORT — Download own challenge performance as CSV / Excel / PDF
# =====================================================================

@router.get("/export")
def user_export_data(
    format: str = Query("csv", pattern="^(csv|excel|pdf)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    performances = (
        db.query(ChallengePerformance)
        .filter(ChallengePerformance.user_id == current_user.id)
        .order_by(ChallengePerformance.created_at.desc())
        .all()
    )

    data = []
    for p in performances:
        data.append({
            "ID": p.id,
            "Date": p.created_at.strftime('%Y-%m-%d %H:%M') if p.created_at else "N/A",
            "Challenge Type": p.challenge_type,
            "Difficulty": p.difficulty,
            "Status": p.status,
            "Correct": "Yes" if p.is_correct else "No",
            "Accuracy (%)": round(p.accuracy, 1),
            "Score (pts)": round(p.score or 0, 1),
            "Time Taken (s)": round(p.time_taken, 1),
            "Failed Attempts": p.failed_attempts,
        })

    fields = ["ID", "Date", "Challenge Type", "Difficulty", "Status", "Correct",
              "Accuracy (%)", "Score (pts)", "Time Taken (s)", "Failed Attempts"]

    username_safe = (current_user.full_name or current_user.name or "user").replace(" ", "_")

    if format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        for row in data:
            writer.writerow(row)
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={username_safe}_challenge_report.csv"}
        )

    elif format == "excel":
        df = pd.DataFrame(data, columns=fields) if data else pd.DataFrame(columns=fields)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Challenge Performance')
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={username_safe}_challenge_report.xlsx"}
        )

    else:  # pdf
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
        story = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=16,
                                     textColor=colors.HexColor("#0f172a"), spaceAfter=10)
        sub_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=10,
                                   textColor=colors.HexColor("#64748b"), spaceAfter=14)

        story.append(Paragraph(f"Cognitive Challenge Report", title_style))
        story.append(Paragraph(f"User: {current_user.full_name or current_user.name}  |  Total Records: {len(data)}", sub_style))

        table_data = [fields]
        for row in data:
            table_data.append([str(row[f]) for f in fields])

        col_widths = [25, 90, 90, 55, 50, 40, 55, 50, 65, 55]
        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(t)

        if not data:
            story.append(Spacer(1, 20))
            story.append(Paragraph("No challenge records found for this account yet.", styles['Normal']))

        doc.build(story)
        buffer.seek(0)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={username_safe}_challenge_report.pdf"}
        )


# =====================================================================
# USER FEEDBACK — Submit user ratings and suggestions (Module 5)
# =====================================================================

from database import Feedback

@router.post("/feedback")
def submit_feedback(
    rating: int = Form(5),
    category: str = Form("general"),
    comment: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    Task 5: Collect user feedback, rating (1-5), and category for platform optimization.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5 stars")

    fb = Feedback(
        user_id=current_user.id,
        rating=rating,
        category=category or "general",
        comment=comment.strip(),
        status="new"
    )
    db.add(fb)

    log = ActivityLog(
        user_id=current_user.id,
        action="Feedback Submitted",
        details=f"User gave {rating} stars in '{category}' category"
    )
    db.add(log)
    db.commit()
    db.refresh(fb)

    return {
        "success": True,
        "message": "Thank you for your feedback! Our team reviews all suggestions.",
        "feedback_id": fb.id
    }


@router.get("/feedback/my")
def get_my_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    Task 5: Retrieve all feedback submitted by the authenticated user.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    feedbacks = (
        db.query(Feedback)
        .filter(Feedback.user_id == current_user.id)
        .order_by(Feedback.created_at.desc())
        .all()
    )

    return [
        {
            "id": f.id,
            "rating": f.rating,
            "category": f.category,
            "comment": f.comment,
            "status": f.status,
            "created_at": f.created_at.strftime('%Y-%m-%d %H:%M') if f.created_at else None
        }
        for f in feedbacks
    ]


# =====================================================================
# APPOINTMENTS — User & Wellness Coach Interaction System
# =====================================================================

@router.post("/appointment/book")
def book_coach_appointment(
    name: str = Form(...),
    appointment_time: str = Form(...),
    reason: str = Form(...),
    coach_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """User books an appointment with a coach providing Name, Time, and Reason."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    target_coach = None
    if coach_id:
        target_coach = db.query(User).filter(User.id == coach_id, User.role.in_(["coach", "administrator"])).first()
    if not target_coach and current_user.coach_id:
        target_coach = db.query(User).filter(User.id == current_user.coach_id).first()
    if not target_coach:
        target_coach = db.query(User).filter(User.role == "coach").first()
    if not target_coach:
        target_coach = db.query(User).filter(User.role == "administrator").first()

    coach_name = target_coach.full_name or target_coach.username if target_coach else "Wellness Coach"
    assigned_coach_id = target_coach.id if target_coach else None

    appt = Appointment(
        user_id=current_user.id,
        coach_id=assigned_coach_id,
        user_name=name.strip(),
        coach_name=coach_name,
        appointment_time=appointment_time.strip(),
        reason=reason.strip(),
        status="Scheduled"
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    # In-app notifications
    notif_user = Notification(
        user_id=current_user.id,
        title="📅 Appointment Booked",
        message=f"Your session with Coach {coach_name} is scheduled for {appointment_time.strip()}. Reason: {reason.strip()}",
        type="coach",
        read_status=False
    )
    db.add(notif_user)

    if assigned_coach_id:
        notif_coach = Notification(
            user_id=assigned_coach_id,
            title="📅 New Client Appointment Request",
            message=f"{name.strip()} has scheduled a coaching session for {appointment_time.strip()}. Reason: {reason.strip()}",
            type="coach",
            read_status=False
        )
        db.add(notif_coach)

    log = ActivityLog(user_id=current_user.id, action="Book Appointment", details=f"Booked appointment with {coach_name} for {appointment_time.strip()}")
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"Appointment booked successfully with Coach {coach_name} for {appointment_time}!",
        "appointment_id": appt.id
    }


@router.get("/appointments")
def get_user_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Retrieve all appointments for the current user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    appts = db.query(Appointment).filter(Appointment.user_id == current_user.id).order_by(Appointment.created_at.desc()).all()
    return [
        {
            "id": a.id,
            "user_name": a.user_name,
            "coach_name": a.coach_name,
            "appointment_time": a.appointment_time,
            "reason": a.reason,
            "status": a.status,
            "notes": a.notes,
            "created_at": a.created_at.strftime('%Y-%m-%d %H:%M') if a.created_at else None
        }
        for a in appts
    ]


