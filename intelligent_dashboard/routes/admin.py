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
