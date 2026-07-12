const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['Open', 'Resolved'],
    default: 'Open',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Ticket', TicketSchema);
