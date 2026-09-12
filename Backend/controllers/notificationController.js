const pool = require("../config/db");

/* ================= CREATE NOTIFICATION ================= */

const createNotification = async (req, res) => {
    try {
        const { user_id, type, title, message } = req.body;

        if (!user_id || !type || !title || !message) {
            return res.status(400).json({
                success: false,
                message: "user_id, type, title and message are required"
            });
        }

        const result = await pool.query(
            `INSERT INTO notifications
             (user_id, type, title, message)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [user_id, type, title, message]
        );

        res.status(201).json({
            success: true,
            message: "Notification created successfully",
            notification: result.rows[0]
        });

    } catch (error) {
        console.error("Create notification error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create notification"
        });
    }
};


/* ================= GET USER NOTIFICATIONS ================= */

const getUserNotifications = async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            `SELECT *
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            notifications: result.rows
        });

    } catch (error) {
        console.error("Get notifications error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load notifications"
        });
    }
};


/* ================= MARK AS READ ================= */

const markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const result = await pool.query(
            `UPDATE notifications
             SET is_read = TRUE
             WHERE id = $1
             RETURNING *`,
            [notificationId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        res.json({
            success: true,
            message: "Notification marked as read",
            notification: result.rows[0]
        });

    } catch (error) {
        console.error("Mark notification error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update notification"
        });
    }
};

/* ================= PLATFORM ANNOUNCEMENT ================= */

const createPlatformAnnouncement = async (req, res) => {
    try {

        
        // Only admin can create platform announcements
        if (req.user?.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required"
            });
        }

        const { title, message } = req.body;

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: "title and message are required"
            });
        }

        // Get all users
        const usersResult = await pool.query(
            `SELECT id FROM users`
        );

        // Create notification for every user
        for (const user of usersResult.rows) {
            await pool.query(
                `INSERT INTO notifications
                 (user_id, type, title, message)
                 VALUES ($1, $2, $3, $4)`,
                [
                    user.id,
                    "announcement",
                    title,
                    message
                ]
            );
        }

        res.status(201).json({
            success: true,
            message: "Platform announcement sent successfully",
            usersNotified: usersResult.rows.length
        });

    } catch (error) {
        console.error(
            "Platform announcement error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to create platform announcement"
        });
    }
};

module.exports = {
    createNotification,
    getUserNotifications,
    markNotificationAsRead,
    createPlatformAnnouncement
};