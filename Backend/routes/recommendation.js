const express = require("express");

const router = express.Router();

const {
    getRecommendations
} = require("../controllers/recommendationController");


// =====================================================
// MODULE 9 — RECOMMENDATION ENGINE
// =====================================================

router.get(
    "/:userId",
    getRecommendations
);


module.exports = router;