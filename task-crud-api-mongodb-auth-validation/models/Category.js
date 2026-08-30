const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
