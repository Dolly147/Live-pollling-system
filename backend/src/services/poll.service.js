const { text } = require("express");
const { get } = require("../app");
const pool = require("../db");
const { v4: uuid } = require("uuid");

class PollService {
  static async createPoll(question, options, duration) {
    const pollId = uuid();
    await pool.query(
      `INSERT INTO polls VALUES ($1,$2,$3,$4,NOW(),'ACTIVE')`,
      [pollId, question, JSON.stringify(options), duration]
    );
    return pollId;
  }

  static async getActivePoll() {
    const res = await pool.query(
      `SELECT * FROM polls WHERE status='ACTIVE' LIMIT 1`
    );
    return res.rows[0];
  }

  static getRemainingTime(poll) {
    const elapsedSeconds = Math.floor(
      (Date.now() - new Date(poll.started_at)) / 1000
    );
    return Math.max(poll.duration - elapsedSeconds, 0);
  }

  static async submitVote(pollId, studentId, optionIndex) {

    const pollRes = await pool.query(
      `SELECT status FROM polls WHERE id=$1`,
      [pollId]
    );

    if (pollRes.rows[0].status !== "ACTIVE") {
      throw new Error("Poll ended");
    }

    await pool.query(
      `INSERT INTO votes VALUES ($1,$2,$3,$4)`,
      [uuid(), pollId, studentId, optionIndex]
    );

  }

    
  static async getPollResults(pollId) {
    // Get poll options
    const pollRes = await pool.query(
      `SELECT options FROM polls WHERE id=$1`,
      [pollId]
    );

    const options = pollRes.rows[0].options;

    // Count votes per option
    const voteRes = await pool.query(
      `SELECT option_index, COUNT(*) 
      FROM votes 
      WHERE poll_id=$1 
      GROUP BY option_index`,
      [pollId]
    );

    // Total votes
    const totalVotes = voteRes.rows.reduce(
      (sum, v) => sum + Number(v.count),
      0
    );

    // Build result array
    const results = options.map((text, index) => {
      const found = voteRes.rows.find(
        (v) => v.option_index === index
      );

      const votes = found ? Number(found.count) : 0;

      return {
        option: text,
        votes,
        percentage:
          totalVotes === 0
            ? 0
            : Math.round((votes / totalVotes) * 100),
      };
    });

    return results;
  }

  static async registerStudent(name, socketId){
    const id = require("uuid").v4();

    await pool.query(
      `INSERT INTO students VALUES ($1,$2,$3)`,
      [id, name, socketId]
    );
    return {id, name};
  }

  static async endPoll(pollId) {
    await pool.query(
      `UPDATE polls SET status='COMPLETED' WHERE id=$1`,
      [pollId]
    );
  }
  static async getPollHistory() {
    // Get completed polls
    const pollsRes = await pool.query(
      `SELECT * FROM polls WHERE status='COMPLETED' ORDER BY started_at DESC`
    );

    const history = [];

    for (const poll of pollsRes.rows) {
      // Get vote counts per option
      const votesRes = await pool.query(
        `SELECT option_index, COUNT(*) 
        FROM votes 
        WHERE poll_id=$1 
        GROUP BY option_index`,
        [poll.id]
      );

      const totalVotes = votesRes.rows.reduce(
        (sum, v) => sum + Number(v.count),
        0
      );

      // Build final result per option
      const results = poll.options.map((opt, index) => {
        const found = votesRes.rows.find(
          (v) => v.option_index === index
        );

        const votes = found ? Number(found.count) : 0;

        return {
          option: opt,
          votes,
          percentage:
            totalVotes === 0
              ? 0
              : Math.round((votes / totalVotes) * 100),
        };
      });

      history.push({
        question: poll.question,
        results,
        totalVotes,
        startedAt: poll.started_at,
      });
    }

    return history;
  }

  static schedulePollEnd(io, poll) {
    const remainingTime =
      poll.duration * 1000 -
      (Date.now() - new Date(poll.started_at));

    if (remainingTime <= 0) {
      this.endPoll(poll.id);
      return;
    }

    setTimeout(async () => {
      await this.endPoll(poll.id);

      const results = await this.getPollResults(poll.id);

      io.emit("poll:ended", results);
    }, remainingTime);
  }

  
}

module.exports = PollService;
