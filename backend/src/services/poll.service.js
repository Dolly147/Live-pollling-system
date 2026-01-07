const pool = require("../db");
const { v4: uuid } = require("uuid");

class PollService {
  static async createPoll(question, options, duration) {
    const pollId = uuid();

    const res = await pool.query(
      `INSERT INTO polls (id, question, options, duration, started_at, status)
       VALUES ($1,$2,$3,$4,NOW(),'ACTIVE')
       RETURNING *`,
      [pollId, question, JSON.stringify(options), duration]
    );

    return res.rows[0];
  }

  static async getActivePoll() {
    const res = await pool.query(
      `SELECT * FROM polls WHERE status='ACTIVE' ORDER BY started_at DESC LIMIT 1`
    );
    return res.rows[0];
  }

  static async getActivePollWithResults() {
    const poll = await this.getActivePoll();
    if (!poll) return null;

    const remainingTime = this.getRemainingTime(poll);
    const results = await this.getPollResults(poll.id);

    return { poll, remainingTime, results };
  }
  
  
  static getRemainingTime(poll) {
    const startedAt = poll.started_at || poll.start_time || poll.startedAt;
    const elapsedSeconds = Math.floor((Date.now() - new Date(startedAt)) / 1000);
    return Math.max(poll.duration - elapsedSeconds, 0);
  }

  static async submitVote(pollId, studentId, optionIndex) {
    // Ensure poll is still active
    const pollRes = await pool.query(`SELECT status FROM polls WHERE id=$1`, [pollId]);
    if (!pollRes.rows[0] || pollRes.rows[0].status !== "ACTIVE") {
      const err = new Error("Poll ended or not found");
      err.code = "POLL_ENDED";
      throw err;
    }

    // Prevent double voting by same student for same poll
    const existing = await pool.query(
      `SELECT id FROM votes WHERE poll_id=$1 AND student_id=$2 LIMIT 1`,
      [pollId, studentId]
    );
    if (existing.rows.length > 0) {
      const err = new Error("Student has already voted");
      err.code = "ALREADY_VOTED";
      throw err;
    }

    await pool.query(`INSERT INTO votes (id, poll_id, student_id, option_index) VALUES ($1,$2,$3,$4)`, [uuid(), pollId, studentId, optionIndex]);
  }

  static async getPollResults(pollId) {
    const pollRes = await pool.query(`SELECT options FROM polls WHERE id=$1`, [pollId]);
    if (!pollRes.rows[0]) return [];

    const options = pollRes.rows[0].options;

    const voteRes = await pool.query(
      `SELECT option_index, COUNT(*)::int AS count
       FROM votes
       WHERE poll_id=$1
       GROUP BY option_index`,
      [pollId]
    );

    const totalVotes = voteRes.rows.reduce((sum, v) => sum + Number(v.count), 0);

    const results = options.map((text, index) => {
      const found = voteRes.rows.find((v) => Number(v.option_index) === index || Number(v.option_index) === index);
      const votes = found ? Number(found.count) : 0;
      return {
        option: text,
        votes,
        percentage: totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100),
      };
    });

    return results;
  }

  static async registerStudent(name, socketId) {
    const id = uuid();
    await pool.query(
      `INSERT INTO students (id, name, socket_id) VALUES ($1,$2,$3)`,
      [id, name, socketId]
    );
    return { id, name, socketId };
  }

  static async updateStudentSocket(id, socketId) {
    await pool.query(`UPDATE students SET socket_id=$2 WHERE id=$1`, [id, socketId]);
  }

  static async clearSocket(socketId) {
    await pool.query(`UPDATE students SET socket_id=NULL WHERE socket_id=$1`, [
      socketId,
    ]);
  }

  
  static async removeStudent(id) {
    await pool.query(`UPDATE students SET socket_id=NULL WHERE id=$1`, [id]);
  }

  static async listStudents() {
    const res = await pool.query(
      `SELECT id, name, socket_id FROM students WHERE socket_id IS NOT NULL ORDER BY name ASC`
    );
    return res.rows;
  }

  static async findStudentById(id) {
    const res = await pool.query(
      `SELECT id, name, socket_id FROM students WHERE id=$1 LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async endPoll(pollId) {
    await pool.query(`UPDATE polls SET status='COMPLETED' WHERE id=$1`, [pollId]);
  }

  static async getPollHistory() {
    const pollsRes = await pool.query(`SELECT * FROM polls WHERE status='COMPLETED' ORDER BY started_at DESC`);

    const history = [];

    for (const poll of pollsRes.rows) {
      const votesRes = await pool.query(
        `SELECT option_index, COUNT(*)::int AS count FROM votes WHERE poll_id=$1 GROUP BY option_index`,
        [poll.id]
      );

      const totalVotes = votesRes.rows.reduce((sum, v) => sum + Number(v.count), 0);

      const results = poll.options.map((opt, index) => {
        const found = votesRes.rows.find((v) => Number(v.option_index) === index);
        const votes = found ? Number(found.count) : 0;
        return {
          option: opt,
          votes,
          percentage: totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100),
        };
      });

      history.push({ question: poll.question, results, totalVotes, startedAt: poll.started_at });
    }

    return history;
  }

  static async getRegisteredStudentCount() {
    const res = await pool.query(`SELECT COUNT(*)::int AS count FROM students`);
    return res.rows[0]?.count || 0;
  }

  
  static async getUniqueVoteCountForPoll(pollId) {
    const res = await pool.query(
      `SELECT COUNT(DISTINCT student_id)::int AS count FROM votes WHERE poll_id=$1`,
      [pollId]
    );
    return res.rows[0]?.count || 0;
  }

  static async haveAllStudentsAnswered(pollId) {
    const [students, voters] = await Promise.all([
      this.getRegisteredStudentCount(),
      this.getUniqueVoteCountForPoll(pollId),
    ]);

    if (students === 0) return true;
    return voters >= students;
  }

  static schedulePollEnd(io, poll) {
    const startedAt = poll.started_at || poll.start_time || poll.startedAt;
    const remainingTime = poll.duration * 1000 - (Date.now() - new Date(startedAt));

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
