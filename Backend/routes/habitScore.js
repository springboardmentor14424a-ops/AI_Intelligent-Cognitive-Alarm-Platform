const express = require("express");

const router = express.Router();

const {
    getHabitScore
} = require("../controllers/habitScoreController");

// =====================================================
// MODULE 8 — HABIT SCORE
// =====================================================

router.get(
    "/:userId",
    getHabitScore
);

module.exports = router;