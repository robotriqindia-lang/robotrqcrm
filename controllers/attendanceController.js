const Attendance = require('../models/Attendance');
const mongoose = require('mongoose');

// 🚀 1. IST Helper
const getIST = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
    const timeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
    const istDateObj = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const totalMinutes = (istDateObj.getHours() * 60) + istDateObj.getMinutes();
    return { dateStr, timeStr, totalMinutes };
};

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
// 🚀 GET LOGS (🔥 THE FINAL REVERT FIX)
// ==========================================
exports.getLogs = async (req, res) => {
    try {
        const logs = await Attendance.find().sort({ createdAt: -1 });
        const { dateStr: today, totalMinutes: currentMins } = getIST();
        const cutoff = 1440;

        const updatedLogs = logs.map(log => {
            const l = log.toObject();

            // 🚀 The Magic: அட்மின் மாத்தின ரெக்கார்டுனா ("Manual Update"), 
            // அதை எக்காலத்துலயும் தொடாதே! அப்படியே விட்டுடு!
            if (l.checkOut === 'Manual Update') {
                return l;
            }

            // செக்-அவுட் செய்யாத மற்ற ரெக்கார்டுகளுக்கு மட்டும் ஆட்டோ-கால்குலேட் பண்ணு
            if (!l.checkOut || l.checkOut === "" || l.checkOut === "--") {
                if (l.date !== today || currentMins >= cutoff) {
                    l.status = 'Absent';
                    l.checkOut = '--';
                    l.duration = '0h 0m';
                } else {
                    l.status = 'In Office';
                    l.checkOut = '--';
                    l.duration = '0h 0m';
                }
            }

            return l;
        });

        res.status(200).json({ success: true, data: updatedLogs });
    } catch (error) {
        console.error("Fetch Logs Error:", error);
        res.status(500).json({ success: false, message: "Error Fetching Logs" });
    }
};

// ==========================================
// 🚀 CHECK-IN
// ==========================================
exports.checkIn = async (req, res) => {
    try {
        const userId = (req.user && (req.user._id || req.user.id)) || req.body.userId;
        const fullName = (req.user && req.user.fullName) || req.body.userName || "Student User";
        const userRole = (req.user && req.user.role) || req.body.role || "student";
        const { locationType, locationName, customerId, serviceId, locationDetails, coordinates, latitude, longitude, mapUrl } = req.body;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "A valid User ID is required!" });
        }

        const { dateStr, timeStr } = getIST();

        const existing = await Attendance.findOne({ 
            userId, date: dateStr, checkOut: { $in: [null, "", "--"] } 
        });

        if (existing) {
            return res.status(400).json({ success: false, message: "Already checked in today!" });
        }

        const resolvedCoords = coordinates || (latitude && longitude ? `${latitude}, ${longitude}` : '');
        const resolvedMapUrl = mapUrl || (resolvedCoords ? `https://www.google.com/maps?q=${encodeURIComponent(resolvedCoords.replace(/\s+/g, ''))}` : '');

        const newAttendance = new Attendance({
            userId: new mongoose.Types.ObjectId(userId),
            userName: fullName,
            role: userRole.toLowerCase(),
            date: dateStr,
            checkIn: timeStr,
            status: "In Office",
            locationType: locationType || 'office',
            locationName: locationName || 'Main Office',
            customerId: customerId || null,
            serviceId: serviceId || null,
            locationDetails: locationDetails || '',
            coordinates: resolvedCoords,
            latitude: latitude || (resolvedCoords ? parseFloat(resolvedCoords.split(',')[0]) : null),
            longitude: longitude || (resolvedCoords ? parseFloat(resolvedCoords.split(',')[1]) : null),
            mapUrl: resolvedMapUrl
        });

        await newAttendance.save();
        res.status(201).json({ success: true, message: "Checked in successfully!", data: newAttendance });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error: " + error.message });
    }
};

// ==========================================
// 🚀 CHECK-OUT
// ==========================================
exports.checkOut = async (req, res) => {
    try {
        const userId = (req.user && (req.user._id || req.user.id)) || req.body.userId;
        const { workSummary, taskSummary, coordinates, latitude, longitude, mapUrl } = req.body; 
        const { dateStr, timeStr, totalMinutes: outMins } = getIST();
        const cutoffMins = 24 * 60; 

        const attendance = await Attendance.findOne({ 
            userId, date: dateStr, checkOut: { $in: [null, "", "--"] } 
        }).sort({ createdAt: -1 });
        
        if (!attendance) return res.status(400).json({ success: false, message: "No active session found!" });

        const inMins = parseTimeToMinutes(attendance.checkIn);
        let diffMins = outMins - inMins;
        if (diffMins < 0) diffMins += 1440; 

        const hrs = diffMins / 60;
        const durationText = `${Math.floor(hrs)}h ${diffMins % 60}m`;

        let finalStatus = "Absent";
        if (outMins >= cutoffMins) finalStatus = "Absent"; 
        else if (hrs >= 6) finalStatus = "Present";
        else if (hrs >= 4) finalStatus = "Half Day";
        else finalStatus = "Absent";

        const finalSummary = workSummary || taskSummary || "Session Completed";

        const resolvedOutCoords = coordinates || (latitude && longitude ? `${latitude}, ${longitude}` : '');
        const resolvedOutMapUrl = mapUrl || (resolvedOutCoords ? `https://www.google.com/maps?q=${encodeURIComponent(resolvedOutCoords.replace(/\s+/g, ''))}` : '');

        const updateData = {
            checkOut: timeStr,
            duration: durationText,
            status: finalStatus, 
            workSummary: finalSummary
        };

        if (resolvedOutCoords) {
            updateData.checkOutCoordinates = resolvedOutCoords;
            updateData.checkOutLatitude = latitude || parseFloat(resolvedOutCoords.split(',')[0]) || null;
            updateData.checkOutLongitude = longitude || parseFloat(resolvedOutCoords.split(',')[1]) || null;
            updateData.checkOutMapUrl = resolvedOutMapUrl;
        }

        const updatedRecord = await Attendance.findByIdAndUpdate(
            attendance._id,
            {
                $set: updateData
            },
            { new: true }
        );

        res.json({ success: true, message: `Status: ${finalStatus}`, data: updatedRecord });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// 🚀 UPDATE ATTENDANCE STATUS (ADMIN OVERRIDE) - 🔥 THE MAIN FIX IS HERE
// ==========================================
exports.updateAttendanceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // 1. முதலில் டேட்டாபேஸ்ல இருக்குற அந்த ரெக்கார்டை எடுக்கிறோம்
        const log = await Attendance.findById(id);
        if (!log) return res.status(404).json({ success: false, message: "Record not found" });

        // 2. செக்-அவுட் டைம் காலியா இருந்தா அதை "Manual Update" னு மாத்துறோம்!
        let newCheckOut = log.checkOut;
        let newDuration = log.duration;

        if (!newCheckOut || newCheckOut === "" || newCheckOut === "--") {
            newCheckOut = "Manual Update";
            newDuration = "0h 0m";
        }

        // 3. இப்போ status மற்றும் checkOut இரண்டையும் சேர்த்து டேட்டாபேஸ்ல அப்டேட் பண்றோம்!
        const updatedRecord = await Attendance.findByIdAndUpdate(
            id, 
            { 
                status: status,
                checkOut: newCheckOut,
                duration: newDuration 
            }, 
            { new: true } 
        );

        res.status(200).json({ success: true, message: "Status updated successfully", data: updatedRecord });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ==========================================
// 🚀 FORGOT CHECK-OUT REQUESTS
// ==========================================
exports.submitForgotCheckout = async (req, res) => {
    try {
        const { userId, userName, date, reason } = req.body;
        const db = mongoose.connection;
        await db.collection('forgotcheckouts').insertOne({
            userId, userName, date, reason, createdAt: new Date()
        });
        res.status(200).json({ success: true, message: "Reason submitted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.getForgotRequests = async (req, res) => {
    try {
        const db = mongoose.connection;
        const requests = await db.collection('forgotcheckouts').find({}).sort({ createdAt: -1 }).toArray();
        res.status(200).json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.acceptForgotRequest = async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const db = mongoose.connection;
        
        const request = await db.collection('forgotcheckouts').findOne({ _id: new ObjectId(req.params.id) });
        if (!request) return res.status(404).json({ success: false, message: "Request not found" });

        await db.collection('forgotcheckouts').deleteOne({ _id: new ObjectId(req.params.id) });

        await db.collection('notifications').insertOne({
            userId: request.userId,
            type: 'checkout_accepted',
            title: 'Check-Out Accepted',
            message: `Your check-out request for ${request.date} has been accepted by Admin.`,
            read: false,
            createdAt: new Date()
        });

        res.status(200).json({ success: true, message: "Request accepted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};