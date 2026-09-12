require("dotenv").config();

const googleRoutes = require("./routes/google");
const passport = require("passport");
const session = require("express-session");

require("./config/passport");

const express = require("express");
const cors = require("cors");

require("./config/db");

const authRoutes = require("./routes/auth");
const challengeRoutes = require("./routes/Challenge");
const usersRoutes = require("./routes/users");
const habitScoreRoutes = require("./routes/habitScore");
const recommendationRoutes =require("./routes/recommendation");
const notificationRoutes = require("./routes/notifications");

const app = express();

const adminRoutes = require("./routes/adminRoutes");

// Middleware
app.use(cors());
app.use(express.json());

app.use(
    session({
        secret: process.env.JWT_SECRET,
        resave: false,
        saveUninitialized: false,
    })
);

app.use(passport.initialize());
app.use(passport.session());

// Test Route
app.get("/", (req, res) => {
    res.send("🚀 Backend is running successfully!");
});

// Routes
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/auth", googleRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/habit-score",habitScoreRoutes);
app.use("/api/recommendations",recommendationRoutes);
app.use("/api/notifications", notificationRoutes);

// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});