const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Comments are almost always listed by task, so index that lookup.
commentSchema.index({ task: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
