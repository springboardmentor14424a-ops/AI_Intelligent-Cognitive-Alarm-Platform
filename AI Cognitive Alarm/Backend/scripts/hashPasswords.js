const bcrypt = require("bcrypt");
const pool = require("../config/db");

async function hashPasswords() {
    try {
        // Get all users
        const result = await pool.query(
            "SELECT id, password_hash FROM users"
        );

        for (const user of result.rows) {

            // Hash the current password
            const hashedPassword = await bcrypt.hash(user.password_hash, 10);

            // Update database
            await pool.query(
                "UPDATE users SET password_hash = $1 WHERE id = $2",
                [hashedPassword, user.id]
            );

            console.log(`User ${user.id} updated.`);
        }

        console.log("✅ All passwords hashed successfully.");

        process.exit();

    } catch (err) {

        console.error(err);

        process.exit(1);

    }
}

hashPasswords();