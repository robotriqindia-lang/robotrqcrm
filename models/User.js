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
        enum: ['admin', 'manager', 'student', 'employee', 'sales'], 
        default: 'student' 
    },

    // --- Common Fields ---
    fullName: { type: String, required: true },
    phone: { type: String },
    emergencyPhone: { type: String },
    emergencyContact: { type: String },
    dob: { type: String },
    photo: { type: String }, // போட்டோ பாத் (Path) சேமிக்க
    profileImage: { type: String },
    certificate: { type: String }, // Base64 or URL
    certificateName: { type: String },
    resume: { type: String }, // Base64 or URL
    resumeName: { type: String },

    // --- Student Fields ---
    studentId: { type: String }, 
    orderId: { type: String },
    address: { type: String },
    paidAmount: { type: Number, default: 0 },
    course: { type: String },
    level: { type: String },
    collegeOrCompany: { type: String },
    preferredType: { type: String },
    joiningDate: { type: String },
    endingDate: { type: String },
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
    },
    perDaySalary: {
        type: Number,
        default: 0
    },

    // 🚀 Dashboard Permissions (For Employees/Managers)
    dashboardPermissions: {
        studentAttendance: { type: Boolean, default: false },
        assignTasks: { type: Boolean, default: false },
        assignEmployeeTasks: { type: Boolean, default: false },
        accountsHub: { type: Boolean, default: false },
        paymentReceipt: { type: Boolean, default: false },
        manageLeads: { type: Boolean, default: false },
        certifications: { type: Boolean, default: false },
        // 🚀 Sales Module Permissions
        salesDashboard: { type: Boolean, default: false },
        salesLeads: { type: Boolean, default: false },
        salesCustomers: { type: Boolean, default: false },
        salesItems: { type: Boolean, default: false },
        salesBom: { type: Boolean, default: false },
        salesQuotation: { type: Boolean, default: false },
        salesExpenses: { type: Boolean, default: false },
        salesAccounts: { type: Boolean, default: false },
        salesService: { type: Boolean, default: false }
    }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);