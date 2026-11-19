const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

require('dotenv').config();

const createSalesUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("Connected to DB");

        const existingUser = await User.findOne({ email: 'sales@robotriq.com' });
        if (existingUser) {
            console.log("Sales user already exists");
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);

        const salesUser = new User({
            fullName: 'Test Sales',
            email: 'sales@robotriq.com',
            password: hashedPassword,
            role: 'sales',
            empId: 'S-001'
        });

        await salesUser.save();
        console.log("Sales user created successfully!");
        process.exit(0);

    } catch (error) {
        console.error("Error creating sales user:", error);
        process.exit(1);
    }
};

createSalesUser();
