const express = require("express");

const router = express.Router();

const {
    generateChallenge,
    savePerformance,
    analyzePerformance,
    getPersonalizedChallenge
} = require("../controllers/challengeController");

router.post(
    "/generate",
    generateChallenge
);

router.post(
    "/performance",
    savePerformance
);

router.get(
    "/performance/analysis/:userId",
    analyzePerformance
);

router.get(
    "/personalized/:userId",
    getPersonalizedChallenge
);

module.exports = router;