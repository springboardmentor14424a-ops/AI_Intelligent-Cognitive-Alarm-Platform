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
        failureRedirect: "https://frontend-phi-jade-33.vercel.app/login.html",
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
    `https://frontend-phi-jade-33.vercel.app/login.html?token=${token}&role=${req.user.role}`
);
    }
);

module.exports = router;