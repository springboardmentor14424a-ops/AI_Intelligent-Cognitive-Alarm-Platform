const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if email exists
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        console.log("User found:", user.email);
        console.log("Stored hash:", user.password_hash);

        // Compare password
        const isMatch = await bcrypt.compare(
            password,
            user.password_hash
        );
        console.log("Password match:", isMatch);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Create JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.json({
            message: "Login Successful",
            token,
            role: user.role
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Server Error"
        });

    }
};

// Forgot Password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        // Check if user exists
        const result = await pool.query(
            "SELECT id, email FROM users WHERE email = $1",
            [email]
        );

        // Don't reveal whether an email exists
        if (result.rows.length === 0) {
            return res.json({
                message: "If this email exists, a password reset link will be generated."
            });
        }

        const user = result.rows[0];

        // Generate secure random token
        const resetToken = crypto.randomBytes(32).toString("hex");

        // Token expires in 15 minutes
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // Remove old reset tokens for this user
        await pool.query(
            "DELETE FROM password_reset_tokens WHERE user_id = $1",
            [user.id]
        );

        // Store new token
        await pool.query(
            `INSERT INTO password_reset_tokens
             (user_id, token, expires_at)
             VALUES ($1, $2, $3)`,
            [user.id, resetToken, expiresAt]
        );

        // Temporary development reset link
        const resetLink =
    `http://127.0.0.1:5500/Frontend/reset-password.html?token=${resetToken}`;
        console.log("=================================");
        console.log("PASSWORD RESET LINK:");
        console.log(resetLink);
        console.log("=================================");

        res.json({
            message: "Password reset link generated. Check the backend console."
        });

    } catch (err) {
        console.error("Forgot password error:", err);

        res.status(500).json({
            message: "Server Error"
        });
    }
};


// Reset Password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                message: "Token and new password are required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters"
            });
        }

        // Find valid token
        const result = await pool.query(
            `SELECT user_id
             FROM password_reset_tokens
             WHERE token = $1
             AND expires_at > NOW()`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                message: "Invalid or expired reset token"
            });
        }

        const userId = result.rows[0].user_id;

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await pool.query(
            `UPDATE users
             SET password_hash = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [hashedPassword, userId]
        );

        // Delete used token
        await pool.query(
            "DELETE FROM password_reset_tokens WHERE token = $1",
            [token]
        );

        res.json({
            message: "Password reset successful. You can now login."
        });

    } catch (err) {
        console.error("Reset password error:", err);

        res.status(500).json({
            message: "Server Error"
        });
    }
};


module.exports = {
    login,
    forgotPassword,
    resetPassword
};