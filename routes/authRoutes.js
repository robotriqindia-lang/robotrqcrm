const express = require('express');
const router = express.Router();
const multer = require('multer');

// Multer Setup
const upload = multer({ storage: multer.memoryStorage() });

// Import controller functions
const { 
    register, 
    login, 
    logout, 
    getStudents, 
    getEmployees,
    getUserById,
    updateUser,        
    updatePassword,
    deleteUser          
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

// --- 1. Public Routes ---
router.post('/register', upload.single('photo'), register);
router.post('/login', login);

// --- 2. Protected Routes ---
router.post('/logout', protect, logout);
router.get('/user/:id', protect, getUserById);
router.put('/user/:id', protect, upload.single('photo'), updateUser);
router.put('/user/:id/password', protect, updatePassword);

// --- 3. Admin Data Routes ---
router.get('/students', protect, getStudents);
router.get('/employees', protect, getEmployees);

// --- 4. Delete Routes (FIXED 🚀) ---

// 💡 பொதுவான டெலீட் ரூட்: இதைப் பயன்படுத்தினால் 'UserList.jsx'-ல் எரர் வராது.
router.delete('/:id', protect, deleteUser);

// ஒருவேளை நீங்க ஸ்பெசிஃபிக்கா student/id அப்படின்னு கூப்பிட்டாலும் வேலை செய்ய இதையும் வச்சுக்கலாம்.
router.delete('/student/:id', protect, deleteUser);
router.delete('/employee/:id', protect, deleteUser);

module.exports = router;