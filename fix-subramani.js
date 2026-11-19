require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    try {
      const student = await User.findOne({ fullName: /subramani/i });
      if (student) {
        student.paidAmount = 0;
        await student.save();
      }
    } catch (err) {}
    mongoose.disconnect();
  });
