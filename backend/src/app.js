const express = require("express");
const cors = require("cors");
const PollService = require("./services/poll.service");

const app = express();
app.use(cors());
app.use(express.json());
app.get("/api/polls/history", async (req, res) => {
  try {
    const history = await PollService.getPollHistory();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to load history" });
  }
});

module.exports = app;
 