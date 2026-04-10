const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // --- Core Authentication ---
    email: { 
        type: String, 
        required: true, 
        unique: true 
    }, 
    
    password: { 
        type: String, 
        required: true 
    },
    
    role: { 
        type: String, 
        enum: ['admin', 'manager', 'student', 'employee'], 
        default: 'student' 
    },

    // --- Common Fields ---
    fullName: { type: String, required: true },
    dob: { type: String },
    photo: { type: String }, // போட்டோ பாத் (Path) சேமிக்க

    // --- Student Fields ---
    studentId: { type: String }, 
    course: { type: String },
    courseJoiningDate: { type: String },
    courseEndDate: { type: String },
    fees: { type: String },

    // --- Employee & Manager Fields ---
    empId: { type: String }, // 🚀 இது விடுபட்டிருந்தது, சேர்த்தாச்சு!
    designation: { type: String },
    panNumber: { type: String }, // 🚀 இதுவும் சேர்த்தாச்சு
    aadharNumber: { type: String },
    dateOfJoining: { type: String },
    bankName: { type: String },
    accNumber: { type: String },
    ifscCode: { type: String },

    // 🚀 சம்பளம் (Payroll-க்காக)
    salary: { 
        type: Number, 
        default: 0 
    }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);