const jwt = require('jsonwebtoken');
const User = require('../models/User'); 
const blacklist = require('../controllers/Utils/Blacklist');

// 1. Token Verification (Updated with Safety Check 🛡️)
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            
            if (blacklist.has(token)) {
                return res.status(401).json({ success: false, message: "Session expired. Login again." });
            }
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // req.user la ulla role-ah vechu thaan namma adutha permissions check pannuvom
            req.user = await User.findById(decoded.id).select('-password');
            
            // 🚀 புதுசா ஆட் பண்ணது: User டேட்டாபேஸ்ல இல்லன்னா (Delete ஆகியிருந்தா) வெளியேத்திரலாம்
            if (!req.user) {
                return res.status(401).json({ success: false, message: "User no longer exists!" });
            }

            next();
        } catch (error) {
            res.status(401).json({ success: false, message: "Not authorized!" });
        }
    }
    
    if (!token) {
        res.status(401).json({ success: false, message: "No token, entry denied!" });
    }
};

// 2. Admin Only Access 
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: "Access denied! Admin only." });
    }
};

// 3. Admin OR Manager Access
const isAdminOrManager = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
        next();
    } else {
        res.status(403).json({ success: false, message: "Access denied! Admin or Manager only." });
    }
};

// Ellathaiyum export pandrom
module.exports = { protect, isAdmin, isAdminOrManager };    