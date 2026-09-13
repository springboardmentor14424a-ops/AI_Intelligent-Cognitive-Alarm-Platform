const express = require("express");
const auth = require("../middleware/auth");
const router = express.Router();

const {
    generateChallenge,
    savePerformance,
    analyzePerformance,
    getPersonalizedChallenge,
    getAnalytics,
    saveWakeUpVerification,
    saveBehaviorEvent,
    getBehaviorAnalytics,
    getBehaviorHistory
} = require("../controllers/challengeController");

router.post("/generate", auth, generateChallenge);

router.post("/performance", auth, savePerformance);

router.get(
    "/performance/analysis/:userId",
    auth,
    analyzePerformance
);
router.get(
    "/behavior/analysis/:userId",
    auth,
    getBehaviorAnalytics
);

router.get(
    "/personalized/:userId",
    auth,
    getPersonalizedChallenge
);

// =====================================================
// SAVE WAKE-UP VERIFICATION
// =====================================================

router.post(
    "/wake-up-verification",
    auth,
    saveWakeUpVerification
);

router.post(
    "/behavior/event",
    auth,
    saveBehaviorEvent
);

router.get(
    "/behavior/analytics/:userId",
    auth,
    getBehaviorAnalytics
);

router.get(
    "/behavior/history/:userId",
    auth,
    getBehaviorHistory
);

module.exports = router;