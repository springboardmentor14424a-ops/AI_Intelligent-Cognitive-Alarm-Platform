-- Seed Data for AI Intelligent Cognitive Alarm Platform

-- Clear existing data (in order of dependencies)
TRUNCATE TABLE reports, activity_logs, notifications, alarms, user_profiles, users RESTART IDENTITY CASCADE;

-- Insert Users
-- Passwords are hashed representation of "admin123", "coach123", "user123" respectively
INSERT INTO users (id, full_name, username, email, password_hash, role, provider, email_verified, account_status) VALUES
(1, 'Platform Administrator', 'admin', 'admin@cognitivealarm.com', '$2b$12$Z/p1e0mI2Vb6jex0h1.xzeh03aYkX.L73v.bJ9hE0aB/2sI2p/2qy', 'administrator', 'local', TRUE, 'active'),
(2, 'Sarah Jenkins (Wellness Coach)', 'coach', 'coach@cognitivealarm.com', '$2b$12$e6m54g9m1mE.3lE5w1.xeh03aYkX.L73v.bJ9hE0aB/2sI2p/2qy', 'coach', 'local', TRUE, 'active'),
(3, 'Alex Rivera', 'user', 'user@cognitivealarm.com', '$2b$12$h3e1m8a1eE.4rI2w1.xeh03aYkX.L73v.bJ9hE0aB/2sI2p/2qy', 'user', 'local', TRUE, 'active'),
(4, 'Emma Watson', 'emma', 'emma@cognitivealarm.com', '$2b$12$h3e1m8a1eE.4rI2w1.xeh03aYkX.L73v.bJ9hE0aB/2sI2p/2qy', 'user', 'local', FALSE, 'active');

-- Insert User Profiles
INSERT INTO user_profiles (user_id, wake_up_time, sleep_time, sleep_duration, productivity_goal, streak, habit_score) VALUES
(1, '07:00', '22:30', 8.0, 'Manage platform', 0, 50),
(2, '06:00', '22:00', 8.0, 'Support clients', 0, 50),
(3, '06:30', '22:30', 8.0, 'Establish high energy mornings', 5, 78),
(4, '05:45', '21:45', 7.5, 'Early workout and study consistency', 14, 92);

-- Insert Alarms
INSERT INTO alarms (user_id, alarm_name, alarm_time, repeat_type, smart_alarm, volume, vibration, challenge_required, alarm_status) VALUES
(3, 'Morning Run', '06:30', 'weekdays', TRUE, 0.80, TRUE, 'Math Puzzle', TRUE),
(3, 'Weekend Reading', '08:00', 'weekends', FALSE, 0.60, TRUE, 'None', TRUE),
(4, 'Workout Call', '05:45', 'daily', TRUE, 0.90, TRUE, 'Shake Phone', TRUE);

-- Insert Notifications
INSERT INTO notifications (user_id, title, message, type, read_status) VALUES
(3, 'Welcome to platform', 'Your cognitive alarm profile is active! Complete morning challenges to lock in your daily streak.', 'system', TRUE),
(3, 'Coach Sarah assigned', 'Coach Sarah has been assigned to help you optimize your sleep architecture. Keep an eye on recommendation plans.', 'system', FALSE),
(3, 'Great job on consistent waking!', 'Sarah Jenkins: You successfully woke up at 06:30 for 5 consecutive days. I''ve updated your daily recommendations.', 'coach', FALSE),
(4, '14-Day Streak Unlocked!', 'Phenomenal morning consistency! You reached a streak of 14 days. Your habit score is in the top 5%!', 'achievement', FALSE);

-- Insert Activity Logs
INSERT INTO activity_logs (user_id, action, details) VALUES
(1, 'Login', 'Admin login success'),
(3, 'Register', 'Account registered'),
(3, 'Login', 'Login success'),
(3, 'Add Alarm', 'Created Morning Run at 06:30'),
(3, 'Challenge Solved', 'Solved Math Puzzle and woke up'),
(3, 'Alarm Triggered', 'Morning Run alarm triggered'),
(3, 'Challenge Solved', 'Solved Math Puzzle and woke up'),
(4, 'Login', 'Login success'),
(4, 'Challenge Solved', 'Solved Shake Phone challenge and woke up');

-- Insert Reports
INSERT INTO reports (user_id, report_type, start_date, end_date, average_sleep_duration, wake_up_consistency, challenge_completion_rate, alarms_missed, alarms_snoozed, habit_score, recommendation_notes) VALUES
(3, 'weekly', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE, 7.8, 80.0, 85.0, 1, 3, 78, 'Alex, you are making decent progress. Minimize snoozing to raise your score past 80.'),
(4, 'weekly', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE, 7.5, 100.0, 100.0, 0, 0, 92, 'Outstanding sleep consistency and immediate alarm solving. Keep this routine!');
