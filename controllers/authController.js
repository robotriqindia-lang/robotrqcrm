const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const blacklist = require("../controllers/Utils/Blacklist"); 
const mongoose = require('mongoose');

// 📌 1. REGISTER: மாணவர் அல்லது ஊழியர்களைப் பதிவு செய்ய
exports.register = async (req, res) => {
    const { 
        email, password, role, 
        fullName, dob, course, studentId, orderId, address, paidAmount, 
        joiningDate, endingDate, courseJoiningDate, courseEndDate, 
        fees, level, collegeOrCompany, preferredType,
        designation, aadharNumber, dateOfJoining, bankName, accNumber, ifscCode,
        salary, perDaySalary, empId, panNumber
    } = req.body; 

    try {
        // Handle photo upload
        let photoUrl = req.body.photo || null;
        if (req.file) {
            photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }

        // மின்னஞ்சல் ஏற்கனவே உள்ளதா எனச் சரிபார்க்கவும்
        let user = await User.findOne({ email: email.trim().toLowerCase() });
        if (user) return res.status(400).json({ success: false, message: "User ID/Email already exists!" });

        // பாஸ்வேர்ட் ஹேஷிங் (Hashing)
        const finalPassword = password || "123456";
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(finalPassword, salt);

        // ரோல் லாஜிக் (Manager designation இருந்தால் தானாகவே manager role செட் ஆகும்)
        let finalRole = role || req.body.empRole; 
        if (designation && designation.toLowerCase().trim() === 'manager') {
            finalRole = 'manager';
        }
        if (!finalRole) {
            finalRole = (empId || designation || aadharNumber || bankName) ? 'employee' : 'student'; 
        }

        // சம்பளம் & தேதிகள் கால்குலேஷன்
        const finalSalary = Number(salary || perDaySalary || 0);
        const finalJoiningDate = joiningDate || dateOfJoining || courseJoiningDate || "";
        const finalEndDate = endingDate || courseEndDate || "";

        // புதிய பயனர் உருவாக்கம்
        user = new User({ 
            email: email.trim().toLowerCase(), 
            password: hashedPassword,
            role: finalRole, 
            fullName, dob, course, studentId, orderId, address, 
            paidAmount: paidAmount ? Number(paidAmount) : 0, 
            joiningDate: finalJoiningDate,
            endingDate: finalEndDate,
            courseJoiningDate: finalJoiningDate, 
            courseEndDate: finalEndDate, 
            fees,
            level,
            collegeOrCompany,
            preferredType,
            photo: photoUrl,
            profileImage: photoUrl,
            empId,
            designation, 
            panNumber, 
            aadharNumber, 
            dateOfJoining: finalJoiningDate, 
            bankName, 
            accNumber, 
            ifscCode,
            salary: finalSalary,
            perDaySalary: finalSalary 
        });

        await user.save();

        res.status(201).json({ 
            success: true, 
            message: `${finalRole.toUpperCase()} registered successfully!`,
            data: { email: user.email, role: user.role } 
        });

    } catch (error) {
        console.error("Registration Error:", error.message);
        res.status(500).json({ 
            success: false, 
            message: "Database Validation Failed!", 
            error: error.message 
        });
    }
};

// 📌 2. LOGIN: Email / Student ID / Employee ID என எதை வைத்தும் லாகின் செய்யலாம் 🚀
exports.login = async (req, res) => {
    console.log("LOGIN REQUEST BODY:", req.body);
    const { email, userId, password } = req.body;
    
    try {
        const loginKey = (email || userId || "").trim();

        if (!loginKey || !password) {
             return res.status(400).json({ success: false, message: "Please provide ID/Email and Password!" });
        }

        // 🚀 MASTER FIX: Case-Insensitive Search (Regex பயன்படுத்தி பெரிய/சின்ன எழுத்துக்களைக் கையாள்கிறோம்)
        const keyRegex = new RegExp(`^${loginKey}$`, 'i');

        // மின்னஞ்சல், மாணவர் ஐடி அல்லது ஊழியர் ஐடி எதில் மேட்ச் ஆனாலும் லாகின் ஆகும்
        const user = await User.findOne({ 
            $or: [
                { email: keyRegex },
                { studentId: keyRegex },
                { empId: keyRegex } 
            ]
        });

        if (!user) return res.status(400).json({ success: false, message: "Invalid ID or Email! Check your entry." });

        // பாஸ்வேர்ட் சரிபார்த்தல்
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: "Incorrect Password!" });

        // 💡 Manager Role Auto-Fix
        if (user.designation && user.designation.toLowerCase().trim() === 'manager' && user.role !== 'manager') {
            user.role = 'manager';
            await user.save(); 
        }

        // JWT Token உருவாக்கம்
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ 
            success: true, 
            token, 
            user: { 
                _id: user._id,
                email: user.email, 
                role: user.role, 
                fullName: user.fullName,
                studentId: user.studentId,
                empId: user.empId,
                designation: user.designation || (user.role === 'admin' ? 'Administrator' : 'Staff'),
                course: user.course || 'N/A'
            } 
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "Server error occurred during login." });
    }
};

// 📌 3. GET STUDENTS: அனைத்து மாணவர்களின் பட்டியலை எடுக்க
exports.getStudents = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('-password').sort({ createdAt: -1 });
        res.json({ success: true, data: students });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching students" });
    }
};

// 📌 4. GET EMPLOYEES: ஊழியர்கள் மற்றும் மேலாளர்களின் பட்டியலை எடுக்க
exports.getEmployees = async (req, res) => {
    try {
        const employees = await User.find({ role: { $in: ['employee', 'manager'] } }).select('-password').sort({ createdAt: -1 });
        res.json({ success: true, data: employees });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching employees" });
    }
};

// 📌 5. GET USER BY ID: ஒரு குறிப்பிட்ட பயனரின் தகவலை எடுக்க
exports.getUserById = async (req, res) => {
    try {
        const id = req.params.id;
        let user;
        if (mongoose.Types.ObjectId.isValid(id)) {
            user = await User.findById(id).select('-password');
        } else {
            user = await User.findOne({ email: id }).select('-password');
        }
        
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// 📌 6. UPDATE USER INFO: பயனர் தகவல்களை மாற்ற
exports.updateUser = async (req, res) => {
    try {
        const id = req.params.id;
        let query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { email: id };
        
        // அப்டேட் செய்யும் போது designation மாற்றினால் ரோலும் மாறும்
        if(req.body.designation && req.body.designation.toLowerCase().trim() === 'manager') {
            req.body.role = 'manager';
        }

        if (req.body.perDaySalary !== undefined) {
            req.body.salary = req.body.perDaySalary;
        }

        if (req.file) {
            const photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            req.body.photo = photoUrl;
            req.body.profileImage = photoUrl;
        }

        if (req.body.joiningDate) {
            req.body.courseJoiningDate = req.body.joiningDate;
            req.body.dateOfJoining = req.body.joiningDate;
        }
        if (req.body.dateOfJoining) {
            req.body.joiningDate = req.body.dateOfJoining;
        }
        if (req.body.endingDate && !req.body.courseEndDate) {
            req.body.courseEndDate = req.body.endingDate;
        }
        if (req.body.courseJoiningDate && !req.body.joiningDate) {
            req.body.joiningDate = req.body.courseJoiningDate;
        }
        if (req.body.courseEndDate && !req.body.endingDate) {
            req.body.endingDate = req.body.courseEndDate;
        }
        if (req.body.salary !== undefined) {
            req.body.perDaySalary = Number(req.body.salary);
        }
        if (req.body.perDaySalary !== undefined && req.body.salary === undefined) {
            req.body.salary = Number(req.body.perDaySalary);
        }

        const updatedUser = await User.findOneAndUpdate(query, req.body, { returnDocument: 'after' }).select('-password');
        if (!updatedUser) return res.status(404).json({ success: false, message: "User not found" });
        
        res.json({ success: true, message: "User updated successfully", data: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating user" });
    }
};

// 📌 7. UPDATE PASSWORD: பாஸ்வேர்ட் மாற்ற
exports.updatePassword = async (req, res) => {
    try {
        const id = req.params.id;
        const { newPassword } = req.body;
        let query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { email: id };
        const user = await User.findOne(query);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating password" });
    }
};

// 📌 8. LOGOUT: வெளியேற
exports.logout = (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) blacklist.add(token);
  res.json({ success: true, message: "Logged out successfully" });
};

// 📌 9. DELETE USER: பயனரை நீக்க 🗑️
exports.deleteUser = async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid User ID format" });
        }

        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, message: "User deleted successfully!" });
    } catch (error) {
        console.error("Delete Error:", error.message);
        res.status(500).json({ success: false, message: "Server error while deleting user" });
    }
};