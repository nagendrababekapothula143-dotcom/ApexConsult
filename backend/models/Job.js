const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a job title'],
    trim: true,
  },
  company: {
    type: String,
    required: [true, 'Please add a company name'],
    trim: true,
  },
  location: {
    type: String,
    required: [true, 'Please add a location'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Please add a job description'],
  },
  requirements: {
    type: [String],
    default: [],
  },
  salary: {
    type: String,
    trim: true,
  },
  link: {
    type: String,
    trim: true,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Job', JobSchema);
