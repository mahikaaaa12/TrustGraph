const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        server: "running",
        database:
            mongoose.connection.readyState === 1
                ? "connected"
                : "disconnected",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;