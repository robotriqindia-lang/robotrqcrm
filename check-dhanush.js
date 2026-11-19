require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
    console.log("Connected to DB!");
    
    const student = await User.findOne({ 
        fullName: { $regex: /DHANUSH VENKAT/i } 
    });
    
    if (!student) {
        console.log("Student not found!");
        mongoose.disconnect();
        return;
    }
    
    console.log(`\n====================================`);
    console.log(`DHANUSH VENKAT.S - STUDENT DETAILS`);
    console.log(`====================================`);
    console.log(`  Full Name: ${student.fullName}`);
    console.log(`  Student ID: ${student.studentId}`);
    console.log(`  Order ID: ${student.orderId}`);
    console.log(`  Email: ${student.email}`);
    console.log(`  Fees Amount: ₹${Number(student.fees || 0).toLocaleString('en-IN')}`);
    console.log(`  Paid Amount (DB): ₹${Number(student.paidAmount || 0).toLocaleString('en-IN')}`);
    console.log(`  Balance: ₹${Math.max(0, Number(student.fees || 0) - Number(student.paidAmount || 0)).toLocaleString('en-IN')}`);
    console.log(`  DB _id: ${student._id}`);
    console.log(`====================================\n`);
    
    mongoose.disconnect();
})
.catch(err => {
    console.error("DB Connection Error:", err);
    mongoose.disconnect();
});
