const mongoose = require('mongoose');

const dayTopicSchema = new mongoose.Schema({
    dayNum: { type: Number, required: true }, // 1, 2, 3...
    topic: { type: String, default: '' },
    trainer: { type: String, default: '' },
    link: { type: String, default: '' }
});

const courseSyllabusSchema = new mongoose.Schema({
    courseName: { type: String, required: true, unique: true }, // "ABB PROCESS AUTOMATION"
    syllabus: [dayTopicSchema]
}, { timestamps: true });

module.exports = mongoose.models.CourseSyllabus || mongoose.model('CourseSyllabus', courseSyllabusSchema);