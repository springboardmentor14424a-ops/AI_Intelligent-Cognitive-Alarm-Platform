import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'cogniwell_db',
  password: process.env.PGPASSWORD || 'postgres',
  port: process.env.PGPORT || 5432
});

async function viewAlarms() {
  console.log('\n========================================================================================');
  console.log('⏰ COGNIWELL POSTGRESQL ALARMS & CHALLENGE PERFORMANCE DATABASE VIEWER');
  console.log('========================================================================================\n');

  try {
    // VIEW ALARM SESSIONS & CHALLENGE PERFORMANCE HISTORY TABLE (alarm_sessions table)
    console.log('🧩 ALARM SESSIONS & CHALLENGE PERFORMANCE (alarm_sessions table)\n');

    const sessionsRes = await pool.query(`
      SELECT 
        s.id AS session_id,
        u.name AS user_name,
        TO_CHAR(s.created_at, 'YYYY-MM-DD') AS session_date,
        COALESCE(s.alarm_time, a.alarm_time, TO_CHAR(s.created_at, 'HH12:MI AM')) AS alarm_time,
        COALESCE(s.alarm_type, a.alarm_type, 'Daily') AS alarm_type,
        COALESCE(s.alarm_title, a.title, 'Cognitive Alarm') AS alarm_title,
        COALESCE(s.challenge_theme, 'Math Challenge') AS challenge_theme,
        COALESCE(s.difficulty, 'Medium') AS difficulty,
        COALESCE(s.question, '—') AS question,
        COALESCE(s.correct_answer, '—') AS correct_answer,
        COALESCE(s.user_answer, '—') AS user_answer,
        COALESCE(s.snooze_count, 0) AS snooze_count,
        COALESCE(s.completion_time, 0) AS completion_time,
        (COALESCE(s.snooze_count, 0) + 1) AS attempts,
        s.challenge_solved,
        s.status
      FROM alarm_sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN alarms a ON s.alarm_id = a.id
      ORDER BY s.id DESC
      LIMIT 25
    `);

    if (sessionsRes.rows.length === 0) {
      console.log('⚠️ No alarm sessions recorded yet.');
    } else {
      console.table(sessionsRes.rows.map(row => ({
        'ID': row.session_id,
        'User': row.user_name,
        'Date': row.session_date,
        'Time of Alarm': row.alarm_time,
        'Type': row.alarm_type,
        'Alarm Title': row.alarm_title,
        'Challenge Theme': row.challenge_theme,
        'Difficulty': row.difficulty,
        'Question': row.question,
        'Correct Answer': row.correct_answer,
        'User Answer': row.user_answer,
        'Snooze Count': row.snooze_count,
        'Time Taken (s)': row.completion_time ? `${row.completion_time}s` : 'N/A',
        'Attempts': row.attempts,
        'Completion Status': row.challenge_solved ? '✅ SOLVED' : '❌ FAILED/PENDING',
        'Status of Alarm': row.status
      })));
    }

    console.log(`\n🎉 Database query completed: ${sessionsRes.rows.length} Alarm Sessions.\n`);
  } catch (error) {
    console.error('❌ Error viewing database:', error.message);
  } finally {
    await pool.end();
  }
}

viewAlarms();
