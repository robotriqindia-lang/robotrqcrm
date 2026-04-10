const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ Robotriq DB Connected: ${conn.connection.host}`);
       
    } catch (error) {
        console.error(`❌ DB Error: ${error.message}`);
         console.log("My URI is:", process.env.MONGO_URI);
        process.exit(1);
    }
};

module.exports = connectDB;