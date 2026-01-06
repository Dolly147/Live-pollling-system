const PollService = require("../services/poll.service");


module.exports = (io, socket) => {

  socket.on("teacher:create_poll", async (data) => {
     await PollService.createPoll(
      data.question,
      data.options,
      data.duration
    );
    const poll = await PollService.getActivePoll();

    PollService.schedulePollEnd(io, poll);

    io.emit("poll:started", poll);
  });

  socket.on("student:vote", async (data) => {
    await PollService.submitVote(
      data.pollId,
      data.studentId,
      data.optionIndex
    );
    io.emit("poll:update");
  });

  socket.on("get_active_poll", async () => {
    const poll = await PollService.getActivePoll();

    if(poll){
      const remaining = PollService.getRemainingTime(poll);

      socket.emit("poll:resume",{
        ...poll,
        remainingTime: remaining,
      });
    }
  });

  socket.on("student:join", async(name)=>{
    const student = await PollService.registerStudent(
      name,
      socket.id
    );
    socket.emit("student:registered", student );
  })

};
