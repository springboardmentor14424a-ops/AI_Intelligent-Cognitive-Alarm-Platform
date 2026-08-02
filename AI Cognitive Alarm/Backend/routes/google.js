const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Start Google Login
router.get(
    "/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
    })
);

// Google Callback
router.get(
    "/google/callback",
    passport.authenticate("google", {
        failureRedirect: "http://127.0.0.1:5500/Frontend/login.html",
        session: false,
    }),
    (req, res) => {

        const token = jwt.sign(
            {
                id: req.user.id,
                email: req.user.email,
                role: req.user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h",
            }
        );

        res.redirect(
    `http://127.0.0.1:5500/Frontend/login.html?token=${token}&role=${req.user.role}`
);
    }
);

module.exports = router;