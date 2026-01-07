const PollService = require("../services/poll.service");

/**
 * Socket handlers for poll events.
 * All business logic is delegated to PollService to keep listeners thin.
 */
module.exports = (io, socket) => {
  /**
   * Teacher creates a new poll.
   * Guard: only one ACTIVE poll at a time, unless all students have already answered
   * the previous one (in which case we auto-complete it on the server and allow a new poll).
   */
  socket.on("teacher:create_poll", async (data) => {
    try {
      const active = await PollService.getActivePollWithResults();
      if (active && active.poll) {
        const remaining = PollService.getRemainingTime(active.poll);
        const allAnswered = await PollService.haveAllStudentsAnswered(
          active.poll.id
        );

        // If time is still left AND not everyone has answered, block new poll.
        if (remaining > 0 && !allAnswered) {
          socket.emit("poll:error", {
            code: "POLL_ACTIVE",
            message:
              "An active poll is already running. Please wait for all students to answer or for the timer to end.",
          });
          return;
        }

        // All students answered → gracefully end current poll and broadcast final results,
        // then allow the new poll to be created below.
        await PollService.endPoll(active.poll.id);
        const finalResults = await PollService.getPollResults(active.poll.id);
        io.emit("poll:ended", finalResults);
      }

      const poll = await PollService.createPoll(
        data.question,
        data.options,
        data.duration
      );

      // Schedule server-side end and broadcast start with remaining time.
      PollService.schedulePollEnd(io, poll);

      io.emit("poll:started", {
        poll,
        remainingTime: poll.duration,
        results: [],
      });
    } catch (err) {
      socket.emit("poll:error", { message: err.message });
    }
  });

  /**
   * Student submits a vote.
   * PollService enforces single vote per student per poll at DB level.
   */
  socket.on("student:vote", async (data) => {
    try {
      await PollService.submitVote(
        data.pollId,
        data.studentId,
        data.optionIndex
      );

      const results = await PollService.getPollResults(data.pollId);
      io.emit("poll:update", { pollId: data.pollId, results });
    } catch (err) {
      socket.emit("vote:error", {
        code: err.code || "UNKNOWN",
        message: err.message,
      });
    }
  });

  /**
   * Any client can request current poll state (used for refresh / late join).
   */
  socket.on("get_active_poll", async () => {
    try {
      const state = await PollService.getActivePollWithResults();
      socket.emit("poll:resume", state);
    } catch (err) {
      socket.emit("poll:error", { message: err.message });
    }
  });

  
  socket.on("student:join", async (name) => {
    try {
      const student = await PollService.registerStudent(name, socket.id);
      socket.emit("student:registered", student);

      // broadcast updated participants to teacher(s)
      const students = await PollService.listStudents();
      io.emit("teacher:students", students);
    } catch (err) {
      socket.emit("poll:error", { message: err.message });
    }
  });

 
  socket.on("teacher:get_students", async () => {
    try {
      const students = await PollService.listStudents();
      socket.emit("teacher:students", students);
    } catch (err) {
      socket.emit("poll:error", { message: err.message });
    }
  });

 
  socket.on("teacher:kick_student", async (studentId) => {
    try {
      const student = await PollService.findStudentById(studentId);
      if (!student) return;

      if (student.socket_id) {
        io.to(student.socket_id).emit("student:kicked", { studentId });
      }
      // Broadcast a generic kick event so if the socket id changed (refresh),
      // the student can still self-identify and react.
      io.emit("student:kicked", { studentId });

      await PollService.removeStudent(studentId);
      const students = await PollService.listStudents();
      io.emit("teacher:students", students);
    } catch (err) {
      socket.emit("poll:error", { message: err.message });
    }
  });

 
  socket.on("disconnect", async () => {
    try {
      await PollService.clearSocket(socket.id);
      const students = await PollService.listStudents();
      io.emit("teacher:students", students);
    } catch (err) {
    }
  });

  socket.on("chat:message", (payload) => {
    io.emit("chat:message", {
      ...payload,
      sentAt: new Date().toISOString(),
    });
  });
};
