const mongoose = require('mongoose');
const colors = require('colors');

const connectDB = async () => {
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
    
    // Handle connection events
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB'.green);
    });

    mongoose.connection.on('error', (err) => {
      console.error(`Mongoose connection error: ${err}`.red);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from MongoDB'.yellow);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination'.red);
        process.exit(0);
      } catch (error) {
        console.error('Error during MongoDB disconnection:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error(`Database connection failed: ${error.message}`.red.underline.bold);
    
    // Exit with failure code
    process.exit(1);
  }
};

module.exports = connectDB;