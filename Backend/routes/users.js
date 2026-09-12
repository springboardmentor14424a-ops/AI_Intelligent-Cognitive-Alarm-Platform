const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const auth = require("../middleware/auth");


// =====================================================
// GET ALL USERS
// =====================================================

router.get("/", async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT id, name, email, role
            FROM users
            WHERE role = 'user'
            ORDER BY id
        `);

        res.json({
            success: true,
            users: result.rows
        });

    } catch (error) {

        console.error("Users fetch error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load users"
        });

    }

});


// =====================================================
// GET SINGLE USER PROFILE
// =====================================================

router.get("/:id", auth, async (req, res) => {

    try {

        const userId = Number(req.params.id);

        if (Number(req.user.id) !== userId) {
    return res.status(403).json({
        success: false,
        message: "You can only access your own profile"
    });
}

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        const result = await pool.query(
            `
            SELECT id, name, email, role
            FROM users
            WHERE id = $1
            `,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {

        console.error("Profile fetch error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load profile"
        });

    }

});


// =====================================================
// UPDATE USER PROFILE
// =====================================================

router.patch("/:id", auth, async (req, res) => {

    try {

        const userId = Number(req.params.id);

        if (Number(req.user.id) !== userId) {
    return res.status(403).json({
        success: false,
        message: "You can only update your own profile"
    });
}

        const { name, email } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: "Name and email are required"
            });
        }

        // Check whether another user already uses this email
        const existingUser = await pool.query(
            `
            SELECT id
            FROM users
            WHERE email = $1
            AND id != $2
            `,
            [email, userId]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email is already in use"
            });
        }

        const result = await pool.query(
            `
            UPDATE users
            SET name = $1,
                email = $2
            WHERE id = $3
            RETURNING id, name, email, role
            `,
            [name.trim(), email.trim(), userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: result.rows[0]
        });

    } catch (error) {

        console.error("Profile update error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update profile"
        });

    }

});


module.exports = router;