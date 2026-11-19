const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize: 10, // Hostinger process ceiling safety (prevents NPROC exhaustion)
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });
        console.log(`✅ Robotriq DB Connected: ${conn.connection.host}`);
       
    } catch (error) {
        console.error(`❌ DB Error: ${error.message}`);
         console.log("My URI is:", process.env.MONGO_URI);
        process.exit(1);
    }
};

module.exports = connectDB;