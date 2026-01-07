const PollService = require("../services/poll.service");

module.exports = (io, socket) => {
  
  socket.on("teacher:create_poll", async (data) => {
    try {
      const active = await PollService.getActivePollWithResults();
      if (active && active.poll) {
        const remaining = PollService.getRemainingTime(active.poll);
        const allAnswered = await PollService.haveAllStudentsAnswered(
          active.poll.id
        );

        if (remaining > 0 && !allAnswered) {
          socket.emit("poll:error", {
            code: "POLL_ACTIVE",
            message:
              "An active poll is already running. Please wait for all students to answer or for the timer to end.",
          });
          return;
        }

       
        await PollService.endPoll(active.poll.id);
        const finalResults = await PollService.getPollResults(active.poll.id);
        io.emit("poll:ended", finalResults);
      }

      const poll = await PollService.createPoll(
        data.question,
        data.options,
        data.duration
      );

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
