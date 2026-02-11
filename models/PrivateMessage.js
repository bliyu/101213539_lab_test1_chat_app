const mongoose = require("mongoose");

const privateMessageSchema = new mongoose.Schema(
  {
    from: { type: String, required: true, index: true },
    to: { type: String, required: true, index: true },
    text: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PrivateMessage", privateMessageSchema);
