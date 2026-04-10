const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'employee'], // Controller-ல் lowercase-ல் அனுப்புவதால் இங்கும் அப்படியே இருக்கட்டும்
        required: true
    },
    date: {
        type: String,
        required: true
    },
    checkIn: {
        type: String,
        default: null
    },
    checkOut: {
        type: String,
        default: null
    },
    status: {
        type: String,
        // 🛡️ 'In Office' மற்றும் 'Halfday' இங்கே சேர்க்கப்பட்டுள்ளது. 
        // இவை இல்லை என்றால் Controller-ல் இருந்து இந்த ஸ்டேட்டஸ் வரும்போது DB அதை ஏத்துக்காது (Error வரும்).
        enum: ['Present', 'Absent', 'Late', 'Pending', 'In Office', 'Halfday'],
        default: 'Absent' 
    },
    workSummary: {
        type: String,
        default: ''
    },
    duration: {
        type: String,
        default: '0h 0m'
    }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);