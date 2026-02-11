const mongoose = require("mongoose");

const roomMessageSchema = new mongoose.Schema(
  {
    room: { type: String, required: true, index: true },
    from: { type: String, required: true, index: true },
    text: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("RoomMessage", roomMessageSchema);
