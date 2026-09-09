"""
Reports & Export System (PDF module 12) — real, working exports.
CSV export needs no extra dependency. PDF export uses reportlab.
"""
import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

from app.database import get_db
from app import models, auth
from app.services import habit_scoring

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _get_attempts(db: Session, user: models.User):
    return (
        db.query(models.ChallengeAttempt)
        .filter(models.ChallengeAttempt.user_id == user.id)
        .order_by(models.ChallengeAttempt.created_at.desc())
        .all()
    )


@router.get("/csv")
def export_csv(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    attempts = _get_attempts(db, current_user)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Date/Time", "Challenge Type", "Difficulty", "Correct", "Snoozed", "Response Time (s)"])
    for a in attempts:
        writer.writerow([
            a.created_at.isoformat(), a.challenge_type, a.difficulty,
            "Yes" if a.was_correct else "No", "Yes" if a.snoozed else "No",
            a.response_time_seconds,
        ])
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cognitive_alarm_report.csv"},
    )


@router.get("/pdf")
def export_pdf(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    attempts = _get_attempts(db, current_user)
    score = habit_scoring.compute_habit_score(db, current_user)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("Cognitive Alarm Platform — Wellness Report", styles["Title"]))
    elements.append(Paragraph(f"User: {current_user.name} ({current_user.email})", styles["Normal"]))
    elements.append(Spacer(1, 16))

    elements.append(Paragraph("Habit Score Breakdown", styles["Heading2"]))
    score_data = [
        ["Metric", "Weight", "Value"],
        ["Wake-Up Consistency", "35%", f"{score['wake_up_consistency']}%"],
        ["Challenge Completion Success", "25%", f"{score['challenge_completion_success']}%"],
        ["Snooze Reduction", "20%", f"{score['snooze_reduction']}%"],
        ["Sleep Schedule Adherence", "20%", f"{score['sleep_schedule_adherence']}%"],
        ["Overall Habit Score", "100%", f"{score['total']}/100"],
    ]
    score_table = Table(score_data, hAlign="LEFT")
    score_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1c2138")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.HexColor("#f0f0f5")]),
    ]))
    elements.append(score_table)
    elements.append(Spacer(1, 20))

    elements.append(Paragraph("Recent Wake-Up Attempts", styles["Heading2"]))
    attempt_rows = [["Date/Time", "Type", "Difficulty", "Correct", "Snoozed"]]
    for a in attempts[:25]:
        attempt_rows.append([
            a.created_at.strftime("%Y-%m-%d %H:%M"), a.challenge_type, a.difficulty,
            "Yes" if a.was_correct else "No", "Yes" if a.snoozed else "No",
        ])
    if len(attempt_rows) == 1:
        attempt_rows.append(["No attempts recorded yet", "", "", "", ""])
    attempt_table = Table(attempt_rows, hAlign="LEFT")
    attempt_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1c2138")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.HexColor("#f0f0f5")]),
    ]))
    elements.append(attempt_table)

    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=cognitive_alarm_report.pdf"},
    )
