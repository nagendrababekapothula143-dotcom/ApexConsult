const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  resumeUrl: {
    type: String,
    required: [true, 'Please provide a resume file URL'],
  },
  resumeKey: {
    type: String,
  },
  metadataUrl: {
    type: String,
  },
  metadataKey: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'accepted', 'rejected'],
    default: 'pending',
  },
  appliedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure a student can only apply to a job once
ApplicationSchema.index({ job: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Application', ApplicationSchema);
