const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
  try {
    // Override local DNS to bypass SRV record query blocks (ECONNREFUSED) on local routers
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (dnsErr) {
      console.warn('Warning: Could not set custom DNS resolver:', dnsErr.message);
    }

    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/consulting');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
