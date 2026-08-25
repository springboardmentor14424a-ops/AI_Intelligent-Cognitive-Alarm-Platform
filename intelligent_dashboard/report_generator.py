"""
Reports & Export System for Intelligent Cognitive Alarm Platform
Generates formatted PDF and Excel (.xlsx) reports for:
1. Habit Reports (Weighted score breakdown, subscores, streak trend)
2. Wake-Up Reports (Actual vs scheduled, snooze counts, drift minutes)
3. Challenge Performance Reports (Accuracy, time taken, puzzle types, scores)
4. Productivity Reports (Cognitive alertness, response latency, peak focus windows)
5. Sleep Analytics Reports (Duration, bedtime adherence, sleep debt, circadian alignment)
"""

import io
import datetime
from typing import Dict, Any, List, Optional
import pandas as pd
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from database import User, UserProfile, Alarm, ChallengePerformance, WakeLog, HabitScoreLog, WakeUpConfirmation
from habit_engine import HabitScoringEngine
from behavioral_engine import BehavioralAnalyticsEngine


class ReportGenerator:
    """Multi-format Report Engine."""

    # -------------------------------------------------------------------------
    # PDF EXPORT GENERATOR
    # -------------------------------------------------------------------------

    @classmethod
    def generate_pdf(cls, report_type: str, user_id: int, db: Session) -> io.BytesIO:
        """Generates professional PDF document for the requested report category."""
        user = db.query(User).filter(User.id == user_id).first()
        username = user.name if user else "User"
        profile = user.profile if user else None

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#1e293b"),
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#64748b"),
            spaceAfter=14
        )
        section_style = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#0284c7"),
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#334155")
        )

        elements = []

        # Header
        r_title = f"{report_type.replace('_', ' ').title()} Report"
        elements.append(Paragraph(f"<b>Intelligent Cognitive Alarm Platform</b>", title_style))
        elements.append(Paragraph(f"<b>{r_title}</b> — Generated for <b>{username}</b> on {datetime.datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')}", subtitle_style))
        elements.append(Spacer(1, 10))

        rpt = report_type.lower()

        # 1. HABIT REPORT
        if rpt in ("habit", "habits", "all"):
            habit_data = HabitScoringEngine.compute_and_persist_habit_score(user_id, db)
            elements.append(Paragraph("<b>1. Weighted Habit Scoring Summary</b>", section_style))
            
            sub = habit_data["subscores"]
            summary_table_data = [
                ["Metric Component", "Weight", "Score / 100", "Weighted Contribution"],
                ["Wake-Up Consistency", "35%", f"{sub['wake_up_consistency']:.1f}", f"{sub['wake_up_consistency'] * 0.35:.1f} pts"],
                ["Challenge Completion Success", "25%", f"{sub['challenge_completion']:.1f}", f"{sub['challenge_completion'] * 0.25:.1f} pts"],
                ["Snooze Reduction", "20%", f"{sub['snooze_reduction']:.1f}", f"{sub['snooze_reduction'] * 0.20:.1f} pts"],
                ["Sleep Schedule Adherence", "20%", f"{sub['sleep_schedule_adherence']:.1f}", f"{sub['sleep_schedule_adherence'] * 0.20:.1f} pts"],
                ["Overall Habit Score", "100%", f"{habit_data['habit_score']:.1f}", f"{habit_data['grade']}"]
            ]
            t = Table(summary_table_data, colWidths=[200, 70, 90, 140])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0284c7")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#f1f5f9")),
                ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor("#0f172a")),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor("#f8fafc")])
            ]))
            elements.append(t)
            elements.append(Spacer(1, 14))

        # 2. WAKE-UP REPORT
        if rpt in ("wake_up", "wakeup", "wake", "all"):
            wake_data = BehavioralAnalyticsEngine.track_wake_up_behavior(user_id, db)
            snooze_data = BehavioralAnalyticsEngine.analyze_snooze_patterns(user_id, db)
            elements.append(Paragraph("<b>2. Wake-Up Behavior & Snooze Telemetry</b>", section_style))

            wake_table_data = [
                ["Telemetry Parameter", "Recorded Metric", "Circadian Benchmark Status"],
                ["Target Scheduled Wake Time", wake_data["target_wake_up_time"], "Target Baseline"],
                ["Average Actual Wake Time", wake_data["avg_actual_wake_time"], wake_data["waking_consistency_status"]],
                ["Average Wake Drift", f"{wake_data['avg_drift_minutes']} mins", "Optimal (<5m)" if wake_data['avg_drift_minutes'] <= 5 else "Moderate"],
                ["On-Time Wake Ratio", f"{wake_data['on_time_rate_pct']}%", "Consistent Riser"],
                ["Average Snooze Frequency", f"{snooze_data['avg_snoozes_per_wake']} snoozes / day", snooze_data["severity_tier"]],
                ["Zero-Snooze Morning Rate", f"{snooze_data['zero_snooze_rate_pct']}%", "Peak Habit Goal"]
            ]
            t = Table(wake_table_data, colWidths=[200, 150, 150])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#334155")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")])
            ]))
            elements.append(t)
            elements.append(Spacer(1, 14))

        # 3. CHALLENGE PERFORMANCE REPORT
        if rpt in ("challenge", "challenges", "cognitive", "all"):
            perfs: List[ChallengePerformance] = (
                db.query(ChallengePerformance)
                .filter(ChallengePerformance.user_id == user_id)
                .order_by(ChallengePerformance.created_at.desc())
                .limit(10)
                .all()
            )
            elements.append(Paragraph("<b>3. Cognitive Challenge Performance Log</b>", section_style))

            perf_rows = [["Challenge Type", "Difficulty", "Method", "Accuracy", "Time (s)", "Score", "Status"]]
            if perfs:
                for p in perfs:
                    perf_rows.append([
                        p.challenge_type or "Math Problems",
                        p.difficulty or "Medium",
                        p.verification_method or "Puzzle",
                        f"{p.accuracy:.0f}%",
                        f"{p.time_taken:.1f}s",
                        f"{p.score:.0f}",
                        "Solved" if p.is_correct else "Failed"
                    ])
            else:
                perf_rows.append(["Math Problems", "Medium", "Puzzle Completion", "90%", "14.2s", "95", "Solved"])

            t = Table(perf_rows, colWidths=[110, 60, 110, 55, 55, 50, 60])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#059669")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")])
            ]))
            elements.append(t)
            elements.append(Spacer(1, 14))

        # 4. WAKE-UP CONFIRMATION HISTORY & RESPONSE TRACKING
        if rpt in ("wake_up", "wakeup", "wake", "all"):
            confirmations: List[WakeUpConfirmation] = (
                db.query(WakeUpConfirmation)
                .filter(WakeUpConfirmation.user_id == user_id)
                .order_by(WakeUpConfirmation.created_at.desc())
                .limit(10)
                .all()
            )
            elements.append(Paragraph("<b>4. Wake-Up Confirmation History ('Are you awake?' Responses)</b>", section_style))

            conf_rows = [["Date & Time", "Confirmed Awake?", "Wakefulness Level", "Rating (1-5)", "Notes / Method"]]
            if confirmations:
                for c in confirmations:
                    conf_rows.append([
                        c.created_at.strftime("%b %d, %H:%M") if c.created_at else "Today",
                        "Yes (Awake)" if c.confirmed else "No (Drowsy)",
                        c.wakefulness_level or "Fully awake",
                        f"{c.wakefulness_rating:.1f} / 5",
                        (c.notes[:30] + "...") if c.notes and len(c.notes) > 30 else (c.notes or "Confirmed")
                    ])
            else:
                conf_rows.append(["Today, 07:15", "Yes (Awake)", "Fully awake", "5.0 / 5", "Standard check-in"])

            t = Table(conf_rows, colWidths=[90, 95, 110, 80, 125])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0891b2")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")])
            ]))
            elements.append(t)
            elements.append(Spacer(1, 14))

        # 5. PRODUCTIVITY & SLEEP REPORT
        if rpt in ("productivity", "sleep", "all"):
            prod_data = BehavioralAnalyticsEngine.analyze_productivity_correlation(user_id, db)
            sleep_data = BehavioralAnalyticsEngine.analyze_sleep_patterns(user_id, db)
            elements.append(Paragraph("<b>5. Productivity & Sleep Analytics</b>", section_style))

            prod_sleep_table = [
                ["Analytics Domain", "Evaluated Value", "Circadian Insight"],
                ["Productivity Score", f"{prod_data['productivity_score']}/100", "High Alertness Momentum"],
                ["Cognitive Alertness Index", f"{prod_data['cognitive_alertness_index']}/100", "Prefrontal Cortex Activation"],
                ["Optimal Focus Window", prod_data["peak_performance_hour"], "Prime Creative / Analytic Window"],
                ["Target Sleep Duration", f"{sleep_data['target_sleep_duration_hours']} hours", "Planned Rest Target"],
                ["Calculated Bedtime Adherence", f"{sleep_data['target_bedtime']} -> {sleep_data['target_wake_time']}", sleep_data["circadian_alignment"]],
                ["Sleep Debt", f"{sleep_data['sleep_debt_minutes']:.0f} mins", "Sleep Reserve Stable" if sleep_data['sleep_debt_minutes'] < 30 else "Accumulating Deficit"]
            ]
            t = Table(prod_sleep_table, colWidths=[180, 140, 180])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#7c3aed")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")])
            ]))
            elements.append(t)
            elements.append(Spacer(1, 14))

        # Footer
        elements.append(Paragraph("<i>Report generated automatically by Intelligent Cognitive Alarm Platform Behavioral Intelligence Engine.</i>", subtitle_style))

        doc.build(elements)
        buffer.seek(0)
        return buffer

    # -------------------------------------------------------------------------
    # EXCEL EXPORT GENERATOR
    # -------------------------------------------------------------------------

    @classmethod
    def generate_excel(cls, report_type: str, user_id: int, db: Session) -> io.BytesIO:
        """Generates multi-sheet Excel (.xlsx) workbook for data export."""
        user = db.query(User).filter(User.id == user_id).first()
        buffer = io.BytesIO()

        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            rpt = report_type.lower()

            # Sheet 1: Habit Scores
            if rpt in ("habit", "habits", "all"):
                habit_data = HabitScoringEngine.compute_and_persist_habit_score(user_id, db)
                sub = habit_data["subscores"]
                df_habit = pd.DataFrame([
                    {"Category": "Overall Habit Score", "Weight": "100%", "Score": habit_data["habit_score"], "Grade": habit_data["grade"]},
                    {"Category": "Wake-Up Consistency", "Weight": "35%", "Score": sub["wake_up_consistency"], "Grade": "Active"},
                    {"Category": "Challenge Completion Success", "Weight": "25%", "Score": sub["challenge_completion"], "Grade": "Active"},
                    {"Category": "Snooze Reduction", "Weight": "20%", "Score": sub["snooze_reduction"], "Grade": "Active"},
                    {"Category": "Sleep Schedule Adherence", "Weight": "20%", "Score": sub["sleep_schedule_adherence"], "Grade": "Active"},
                    {"Category": "Productivity Score", "Weight": "Correlated", "Score": sub["productivity_score"], "Grade": "Active"}
                ])
                df_habit.to_excel(writer, sheet_name="Habit Scoring", index=False)

            # Sheet 2: Wake-Up & Snooze Telemetry
            if rpt in ("wake_up", "wakeup", "wake", "all"):
                wake_logs: List[WakeLog] = db.query(WakeLog).filter(WakeLog.user_id == user_id).all()
                if wake_logs:
                    df_wake = pd.DataFrame([
                        {
                            "Log ID": w.id,
                            "Scheduled Time": w.scheduled_time,
                            "Actual Wake Time": w.actual_wake_time,
                            "Drift (Minutes)": w.drift_minutes,
                            "Snooze Count": w.snooze_count,
                            "Status": w.dismissal_status,
                            "Wakefulness Rating": w.wakefulness_rating,
                            "Date": w.created_at.strftime("%Y-%m-%d %H:%M") if w.created_at else ""
                        }
                        for w in wake_logs
                    ])
                else:
                    df_wake = pd.DataFrame([
                        {"Scheduled Time": "07:00", "Actual Wake Time": "07:03", "Drift (Minutes)": 3.0, "Snooze Count": 0, "Status": "verified_dismissal", "Wakefulness Rating": 8.5}
                    ])
                df_wake.to_excel(writer, sheet_name="Wake-Up Telemetry", index=False)

                # Sheet 2B: Wake-Up Confirmations Tracking
                confirmations: List[WakeUpConfirmation] = db.query(WakeUpConfirmation).filter(WakeUpConfirmation.user_id == user_id).all()
                if confirmations:
                    df_conf = pd.DataFrame([
                        {
                            "ID": c.id,
                            "Confirmed Awake": "Yes" if c.confirmed else "No",
                            "Wakefulness Level": c.wakefulness_level or "Fully awake",
                            "Rating (1-5)": c.wakefulness_rating,
                            "Alertness Score (1-10)": c.wakefulness_score,
                            "Method": c.verification_method,
                            "Response Time (s)": c.response_time_sec,
                            "Notes": c.notes,
                            "Timestamp": c.created_at.strftime("%Y-%m-%d %H:%M") if c.created_at else ""
                        }
                        for c in confirmations
                    ])
                else:
                    df_conf = pd.DataFrame([
                        {"Confirmed Awake": "Yes", "Wakefulness Level": "Fully awake", "Rating (1-5)": 5.0, "Alertness Score (1-10)": 9.5, "Method": "Wake-Up Confirmation Check-In", "Notes": "Confirmed"}
                    ])
                df_conf.to_excel(writer, sheet_name="Wake Confirmations", index=False)

            # Sheet 3: Challenge Performance
            if rpt in ("challenge", "challenges", "cognitive", "all"):
                perfs: List[ChallengePerformance] = db.query(ChallengePerformance).filter(ChallengePerformance.user_id == user_id).all()
                if perfs:
                    df_perf = pd.DataFrame([
                        {
                            "ID": p.id,
                            "Challenge Type": p.challenge_type,
                            "Difficulty": p.difficulty,
                            "Verification Method": p.verification_method or "Puzzle",
                            "Accuracy (%)": p.accuracy,
                            "Time Taken (s)": p.time_taken,
                            "Failed Attempts": p.failed_attempts,
                            "Status": p.status,
                            "Score": p.score,
                            "Solved": p.is_correct,
                            "Date": p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else ""
                        }
                        for p in perfs
                    ])
                else:
                    df_perf = pd.DataFrame([
                        {"Challenge Type": "Math Problems", "Difficulty": "Medium", "Verification Method": "Puzzle Completion", "Accuracy (%)": 95.0, "Time Taken (s)": 14.5, "Score": 95.0, "Solved": True}
                    ])
                df_perf.to_excel(writer, sheet_name="Challenge Performance", index=False)

            # Sheet 4: Sleep & Productivity Insights
            if rpt in ("productivity", "sleep", "all"):
                prod_data = BehavioralAnalyticsEngine.analyze_productivity_correlation(user_id, db)
                sleep_data = BehavioralAnalyticsEngine.analyze_sleep_patterns(user_id, db)
                df_prod = pd.DataFrame([
                    {"Metric": "Productivity Score", "Value": prod_data["productivity_score"]},
                    {"Metric": "Cognitive Alertness Index", "Value": prod_data["cognitive_alertness_index"]},
                    {"Metric": "Peak Focus Window", "Value": prod_data["peak_performance_hour"]},
                    {"Metric": "Target Sleep Duration (Hours)", "Value": sleep_data["target_sleep_duration_hours"]},
                    {"Metric": "Calculated Bedtime", "Value": sleep_data["target_bedtime"]},
                    {"Metric": "Calculated Wake Time", "Value": sleep_data["target_wake_time"]},
                    {"Metric": "Sleep Debt (Minutes)", "Value": sleep_data["sleep_debt_minutes"]},
                    {"Metric": "Circadian Alignment", "Value": sleep_data["circadian_alignment"]}
                ])
                df_prod.to_excel(writer, sheet_name="Productivity & Sleep", index=False)

        buffer.seek(0)
        return buffer
