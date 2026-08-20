import datetime
import io
import csv
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Form, Query, Request, status
from fastapi.responses import RedirectResponse, StreamingResponse
from sqlalchemy.orm import Session
from database import get_db, User, UserProfile, Alarm, ActivityLog, Notification, Report
import auth
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

router = APIRouter()

@router.post("/users/create")
def admin_create_user(
    full_name: str = Form(...),
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form("user"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(auth.get_current_user)
):
    if not current_admin or current_admin.role != 'administrator':
        raise HTTPException(status_code=403, detail="Forbidden")
        
    user_exists = db.query(User).filter((User.email == email) | (User.name == full_name)).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="User or email already exists")
        
    user = User(
        name=full_name,
        email=email,
        password=auth.get_password_hash(password),
        role=role,
        provider="LOCAL"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    profile = UserProfile(user_id=user.id)
    db.add(profile)
    
    log = ActivityLog(user_id=current_admin.id, action="Register", details=f"Admin created user: {username} with role {role}")
    db.add(log)
    db.commit()
    
    return RedirectResponse(url="/dashboard/admin?tab=users", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/users/edit/{user_id}")
def admin_edit_user(
    user_id: int,
    full_name: str = Form(...),
    role: str = Form("user"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(auth.get_current_user)
):
    if not current_admin or current_admin.role != 'administrator':
        raise HTTPException(status_code=403, detail="Forbidden")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.full_name = full_name
    user.role = role
    
    log = ActivityLog(user_id=current_admin.id, action="Update Profile", details=f"Admin edited user profile: {user.username}")
    db.add(log)
    db.commit()
    
    return RedirectResponse(url="/dashboard/admin?tab=users", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/users/toggle-status/{user_id}")
def admin_toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(auth.get_current_user)
):
    if not current_admin or current_admin.role != 'administrator':
        raise HTTPException(status_code=403, detail="Forbidden")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    status_str = "suspended" if user.account_status == "active" else "active"
    user.account_status = status_str
    
    log = ActivityLog(user_id=current_admin.id, action="Update Profile", details=f"Admin toggled status of {user.username} to {status_str}")
    db.add(log)
    db.commit()
    
    return RedirectResponse(url=f"/dashboard/admin?tab=users&msg=Status+for+user+@{user.username}+toggled+to+{status_str}", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/users/reset-password/{user_id}")
def admin_reset_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(auth.get_current_user)
):
    if not current_admin or current_admin.role != 'administrator':
        raise HTTPException(status_code=403, detail="Forbidden")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    temp_pass = "CognitiveBypass123!"
    user.password_hash = auth.get_password_hash(temp_pass)
    user.login_attempts = 0
    
    log = ActivityLog(user_id=current_admin.id, action="Password Change", details=f"Admin reset password for user: {user.username}")
    db.add(log)
    db.commit()
    
    return RedirectResponse(url=f"/dashboard/admin?tab=users&msg=Password+for+@{user.username}+reset+to+'{temp_pass}'", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/users/delete/{user_id}")
def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(auth.get_current_user)
):
    if not current_admin or current_admin.role != 'administrator':
        raise HTTPException(status_code=403, detail="Forbidden")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    username = user.username
    db.delete(user)
    
    log = ActivityLog(user_id=current_admin.id, action="Delete User", details=f"Admin deleted user: {username}")
    db.add(log)
    db.commit()
    
    return RedirectResponse(url=f"/dashboard/admin?tab=users&msg=User+@{username}+deleted+successfully", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/users/assign-coach")
def admin_assign_coach(
    user_id: int = Form(...),
    coach_id: int = Form(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(auth.get_current_user)
):
    if not current_admin or current_admin.role != 'administrator':
        raise HTTPException(status_code=403, detail="Forbidden")
        
    user = db.query(User).filter(User.id == user_id).first()
    coach = db.query(User).filter(User.id == coach_id, User.role == "coach").first()
    
    if not user or not coach:
        raise HTTPException(status_code=404, detail="User or Coach not found")
        
    user.coach_id = coach_id
    
    log = ActivityLog(user_id=current_admin.id, action="Update Profile", details=f"Admin assigned Coach '{coach.username}' to User '{user.username}'")
    db.add(log)
    db.commit()
    
    return RedirectResponse(url=f"/dashboard/admin?tab=users&msg=Coach+assigned+to+@{user.username}+successfully", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/users/remove-coach/{user_id}")
def admin_remove_coach(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(auth.get_current_user)
):
    if not current_admin or current_admin.role != 'administrator':
        raise HTTPException(status_code=403, detail="Forbidden")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.coach_id = None
    
    log = ActivityLog(user_id=current_admin.id, action="Update Profile", details=f"Admin unassigned Coach from User '{user.username}'")
    db.add(log)
    db.commit()
    
    return RedirectResponse(url=f"/dashboard/admin?tab=users&msg=Coach+unassigned+from+@{user.username}", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/broadcast")
def admin_broadcast(
    title: str = Form(...),
    message: str = Form(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(auth.get_current_user)
):
    if not current_admin or current_admin.role != 'administrator':
        raise HTTPException(status_code=403, detail="Forbidden")
        
    users = db.query(User).filter(User.account_status == "active").all()
    for u in users:
        notification = Notification(
            user_id=u.id,
            title=title,
            message=message,
            type="system",
            read_status=False
        )
        db.add(notification)
        
    log = ActivityLog(user_id=current_admin.id, action="Broadcast Announcement", details=f"Admin sent announcement: {title}")
    db.add(log)
    db.commit()
    
    return RedirectResponse(url="/dashboard/admin", status_code=status.HTTP_303_SEE_OTHER)

# Reports Downloads
@router.get("/export")
def admin_export_data(
    format: str = Query("csv", regex="^(csv|excel|pdf)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(auth.get_current_user)
):
    if not current_admin or current_admin.role != 'administrator':
        raise HTTPException(status_code=403, detail="Forbidden")
        
    users = db.query(User).all()
    data = []
    for u in users:
        data.append({
            "ID": u.id,
            "Name": u.full_name or "",
            "Username": u.username,
            "Email": u.email,
            "Role": u.role,
            "Status": u.account_status,
            "Streak": u.profile.streak if u.profile else 0,
            "Habit Score": u.profile.habit_score if u.profile else 50,
            "Created Date": u.created_at.strftime('%Y-%m-%d')
        })
        
    if format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["ID", "Name", "Username", "Email", "Role", "Status", "Streak", "Habit Score", "Created Date"])
        writer.writeheader()
        for row in data:
            writer.writerow(row)
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=users_report.csv"}
        )
        
    elif format == "excel":
        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Users')
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=users_report.xlsx"}
        )
        
    else:  # pdf
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        story = []
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle('DocTitle', parent=styles['Heading1'], fontSize=20, textColor=colors.HexColor("#0f172a"), spaceAfter=15)
        story.append(Paragraph("Cognitive Alarm Users Directory", title_style))
        story.append(Spacer(1, 10))
        
        headers = ["ID", "Name", "Username", "Email", "Role", "Status", "Streak", "Score"]
        table_data = [headers]
        for row in data:
            table_data.append([str(row["ID"]), row["Name"], row["Username"], row["Email"], row["Role"], row["Status"], str(row["Streak"]), str(row["Habit Score"])])
            
        t = Table(table_data, colWidths=[30, 80, 70, 130, 60, 50, 40, 40])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(t)
        doc.build(story)
        buffer.seek(0)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=users_report.pdf"}
        )


# =====================================================================
# MODULE 5: PRODUCTION MONITORING, BACKUP & USER FEEDBACK
# =====================================================================

import os
import shutil
import time
import psutil
from fastapi.responses import FileResponse
from database import Feedback, ChallengePerformance

@router.get("/system/metrics")
def admin_system_metrics(
    db: Session = Depends(get_db),
    current_admin: User = Depends(auth.get_current_user)
):
    """
    Task 4: Production Monitoring — CPU/Memory, DB stats, table record counts, uptime.
    """
    if not current_admin or current_admin.role != 'administrator':
        raise HTTPException(status_code=403, detail="Forbidden")

    # DB Table record counts
    total_users = db.query(User).count()
    total_alarms = db.query(Alarm).count()
    total_perfs = db.query(ChallengePerformance).count()
    total_logs = db.query(ActivityLog).count()
    total_feedback = db.query(Feedback).count()

    # System metrics
    mem = psutil.virtual_memory() if hasattr(psutil, 'virtual_memory') else None
    db_file = "alarm_platform.db"
    db_size_kb = round(os.path.getsize(db_file) / 1024, 1) if os.path.exists(db_file) else 0

    return {
        "status": "healthy",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "database": {
            "engine": "SQLite / PostgreSQL",
            "file_size_kb": db_size_kb,
            "counts": {
                "users": total_users,
                "alarms": total_alarms,
                "challenge_performances": total_perfs,
                "activity_logs": total_logs,
                "feedbacks": total_feedback
            }
        },
        "system": {
            "memory_usage_percent": mem.percent if mem else "N/A",
            "available_memory_mb": round(mem.available / (1024 * 1024), 1) if mem else "N/A",
            "cpu_count": os.cpu_count() or 1
        }
    }


@router.post("/backup/create")
def admin_create_backup(
    db: Session = Depends(get_db),
    current_admin: User = Depends(auth.get_current_user)
):
    """
    Task 4: Database Snapshot Backup — creates timestamped copy of SQLite DB.
    """
    if not current_admin or current_admin.role != 'administrator':
        raise HTTPException(status_code=403, detail="Forbidden")

    backup_dir = "backups"
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"backup_alarm_platform_{timestamp}.db"
    backup_path = os.path.join(backup_dir, backup_filename)

    src_db = "alarm_platform.db"
    if not os.path.exists(src_db):
        raise HTTPException(status_code=404, detail="Database file not found for backup")

    shutil.copy2(src_db, backup_path)
    file_size_kb = round(os.path.getsize(backup_path) / 1024, 1)

    log = ActivityLog(
        user_id=current_admin.id,
        action="Database Backup Created",
        details=f"Created backup snapshot: {backup_filename} ({file_size_kb} KB)"
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"Database backup created successfully: {backup_filename}",
        "filename": backup_filename,
        "size_kb": file_size_kb,
        "created_at": datetime.datetime.utcnow().isoformat()
    }


@router.get("/backup/list")
def admin_list_backups(
    current_admin: User = Depends(auth.get_current_user)
):
    """
    Task 4: List all available database backups.
    """
    if not current_admin or current_admin.role != 'administrator':
        raise HTTPException(status_code=403, detail="Forbidden")

    backup_dir = "backups"
    os.makedirs(backup_dir, exist_ok=True)

    backups = []
    for f in os.listdir(backup_dir):
        if f.endswith(".db"):
            fp = os.path.join(backup_dir, f)
            backups.append({
                "filename": f,
                "size_kb": round(os.path.getsize(fp) / 1024, 1),
                "created_at": datetime.datetime.fromtimestamp(os.path.getctime(fp)).strftime('%Y-%m-%d %H:%M:%S')
            })

    backups.sort(key=lambda x: x["filename"], reverse=True)
    return {"backups": backups, "total": len(backups)}


@router.get("/backup/download/{filename}")
def admin_download_backup(
    filename: str,
    current_admin: User = Depends(auth.get_current_user)
):
    """
    Task 4: Download a specific database backup snapshot.
    """
    if not current_admin or current_admin.role != 'administrator':
        raise HTTPException(status_code=403, detail="Forbidden")

    backup_dir = "backups"
    safe_filename = os.path.basename(filename)
    backup_path = os.path.join(backup_dir, safe_filename)

    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup file not found")

    return FileResponse(
        backup_path,
        media_type="application/octet-stream",
        filename=safe_filename
    )


@router.get("/feedback")
def admin_get_all_feedback(
    db: Session = Depends(get_db),
    current_admin: User = Depends(auth.get_current_user)
):
    """
    Task 5: Retrieve all user feedback with user details and ratings.
    """
    if not current_admin or current_admin.role != 'administrator':
        raise HTTPException(status_code=403, detail="Forbidden")

    feedbacks = (
        db.query(Feedback)
        .order_by(Feedback.created_at.desc())
        .all()
    )

    result = []
    for fb in feedbacks:
        u = fb.user
        result.append({
            "id": fb.id,
            "user_id": fb.user_id,
            "user_name": u.full_name or u.name if u else "User",
            "user_email": u.email if u else "N/A",
            "rating": fb.rating,
            "category": fb.category,
            "comment": fb.comment,
            "status": fb.status,
            "created_at": fb.created_at.strftime('%Y-%m-%d %H:%M') if fb.created_at else None
        })

    avg_rating = round(sum(f.rating for f in feedbacks) / len(feedbacks), 1) if feedbacks else 5.0
    return {"feedbacks": result, "total": len(result), "average_rating": avg_rating}


@router.post("/feedback/{feedback_id}/status")
def admin_update_feedback_status(
    feedback_id: int,
    status: str = Form(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(auth.get_current_user)
):
    """
    Task 5: Update feedback review status (new / reviewed / resolved).
    """
    if not current_admin or current_admin.role != 'administrator':
        raise HTTPException(status_code=403, detail="Forbidden")

    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")

    fb.status = status
    db.commit()
    return {"success": True, "message": f"Feedback status updated to '{status}'"}


@router.get("/analytics/engagement")
def admin_get_engagement_analytics(
    db: Session = Depends(get_db),
    current_admin: User = Depends(auth.get_current_user)
):
    """
    Task 5: Analyze user engagement, challenge completion rates, and snooze trends.
    """
    if not current_admin or current_admin.role != 'administrator':
        raise HTTPException(status_code=403, detail="Forbidden")

    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.account_status == "active").count()
    all_perfs = db.query(ChallengePerformance).all()

    total_challenges = len(all_perfs)
    successful_challenges = sum(1 for p in all_perfs if p.is_correct or p.status == "success")
    completion_rate = round((successful_challenges / total_challenges * 100), 1) if total_challenges > 0 else 0.0

    all_alarms = db.query(Alarm).all()
    total_snoozes = sum(a.snooze_count for a in all_alarms)
    avg_snooze_per_alarm = round(total_snoozes / len(all_alarms), 2) if all_alarms else 0.0

    feedbacks = db.query(Feedback).all()
    avg_csat = round(sum(f.rating for f in feedbacks) / len(feedbacks), 1) if feedbacks else 5.0

    return {
        "user_retention": {
            "total_users": total_users,
            "active_users": active_users,
            "activity_rate_percent": round((active_users / total_users * 100), 1) if total_users > 0 else 100.0
        },
        "challenge_metrics": {
            "total_attempted": total_challenges,
            "total_solved": successful_challenges,
            "completion_rate_percent": completion_rate
        },
        "alarm_behavior": {
            "total_alarms": len(all_alarms),
            "total_snooze_events": total_snoozes,
            "avg_snoozes_per_alarm": avg_snooze_per_alarm
        },
        "user_satisfaction": {
            "average_star_rating": avg_csat,
            "total_reviews": len(feedbacks)
        }
    }

