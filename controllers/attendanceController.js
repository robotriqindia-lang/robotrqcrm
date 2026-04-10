const Attendance = require('../models/Attendance');
const mongoose = require('mongoose');

// 🚀 1. IST நேரத்தை துல்லியமாக எடுக்க ஹெல்ப்பர்
const getIST = () => {
    const now = new Date();
    // இந்திய தேதியை எடுக்க (DD/MM/YYYY)
    const dateStr = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
    
    // இந்திய நேரத்தை எடுக்க (HH:MM AM/PM)
    const timeStr = now.toLocaleTimeString('en-IN', { 
        timeZone: 'Asia/Kolkata', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
    }).toUpperCase();
    
    const istDateObj = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const totalMinutes = (istDateObj.getHours() * 60) + istDateObj.getMinutes();

    return { dateStr, timeStr, totalMinutes };
};

// 🚀 2. நேரத்தை நிமிடங்களாக மாற்றும் ஹெல்ப்பர்
const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || timeStr === "--") return 0;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    
    let hours = parseInt(match[1], 10);
    let minutes = parseInt(match[2], 10);
    const modifier = match[3].toUpperCase();

    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    
    return (hours * 60) + minutes;
};

// ==========================================
// 🚀 CHECK-IN FUNCTION (Fixed Validation & 500 Error)
// ==========================================
exports.checkIn = async (req, res) => {
    try {
        // 🛡️ விவரங்களை எடுக்கிறோம் (Token அல்லது Request Body)
        const userId = (req.user && (req.user._id || req.user.id)) || req.body.userId;
        const fullName = (req.user && req.user.fullName) || req.body.userName || "Student User";
        const userRole = (req.user && req.user.role) || req.body.role || "student";

        // ID சரியாக இருக்கிறதா எனச் சோதனை
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "A valid User ID is required!" });
        }

        const { dateStr, timeStr } = getIST();

        // ஏற்கனவே செக்-இன் செய்திருந்தால் தடுத்தல்
        const existing = await Attendance.findOne({ userId, date: dateStr });
        if (existing) {
            return res.status(400).json({ success: false, message: "Already checked in today!" });
        }

        // புதிய ரெக்கார்ட் (Model-ல் உள்ள அனைத்து Required ஃபீல்டுகளும் உள்ளன)
        const newAttendance = new Attendance({
            userId: new mongoose.Types.ObjectId(userId),
            userName: fullName,
            role: userRole.toLowerCase(), // Model enum: ['student', 'employee']
            date: dateStr,
            checkIn: timeStr,
            status: "In Office" 
        });

        await newAttendance.save();
        res.status(201).json({ success: true, message: "Checked in successfully!", data: newAttendance });

    } catch (error) {
        console.error("🔥 Check-In Error Details:", error);
        res.status(500).json({ success: false, message: "Server error: " + error.message });
    }
};

// ==========================================
// 🚀 CHECK-OUT FUNCTION (4h, 6h, 9pm Rules)
// ==========================================
exports.checkOut = async (req, res) => {
    try {
        const userId = (req.user && (req.user._id || req.user.id)) || req.body.userId;
        const { taskSummary } = req.body;
        
        const { dateStr, timeStr, totalMinutes: outMins } = getIST();
        const cutoffMins = 21 * 60; // 9:00 PM IST

        // இன்னும் செக்-அவுட் ஆகாத ரெக்கார்டைத் தேடுகிறோம்
        const attendance = await Attendance.findOne({ 
            userId, 
            date: dateStr, 
            checkOut: null 
        }).sort({ createdAt: -1 });
        
        if (!attendance) return res.status(400).json({ success: false, message: "No active session found!" });

        const inMins = parseTimeToMinutes(attendance.checkIn);
        let diffMins = outMins - inMins;
        if (diffMins < 0) diffMins += 1440; 

        const hrs = diffMins / 60;
        const durationText = `${Math.floor(hrs)}h ${diffMins % 60}m`;

        // 🛡️ Rules Logic
        let finalStatus = "Absent";
        if (outMins > cutoffMins) {
            finalStatus = "Absent"; // 9 PM தாண்டினால் கண்டிப்பாக Absent
        } else if (hrs >= 6) {
            finalStatus = "Present";
        } else if (hrs >= 4) {
            finalStatus = "Halfday";
        } else {
            finalStatus = "Absent";
        }

        const updatedRecord = await Attendance.findByIdAndUpdate(
            attendance._id,
            {
                $set: {
                    checkOut: timeStr,
                    duration: durationText,
                    status: finalStatus, 
                    workSummary: taskSummary || "Session Completed"
                }
            },
            { new: true }
        );

        res.json({ success: true, message: `Status: ${finalStatus}`, data: updatedRecord });

    } catch (error) {
        console.error("🔥 Check-Out Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// 🚀 GET LOGS (Attendance History)
// ==========================================
exports.getLogs = async (req, res) => {
    try {
        const logs = await Attendance.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error Fetching Logs" });
    }
};