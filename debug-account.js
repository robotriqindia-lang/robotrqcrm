require('dotenv').config();
const mongoose = require('mongoose');
const Account = require('./models/Account');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    try {
      const records = await Account.find({ type: 'Income' }).sort({ createdAt: -1 }).limit(5);
      console.log("Latest Income Records:");
      for (const record of records) {
          console.log("DESC:", record.desc);
          if (record.desc && record.desc.startsWith('Receipt:')) {
              const orderMatch = record.desc.match(/\(Order:\s*([^)]+)\)/);
              console.log("  orderMatch:", orderMatch ? orderMatch[1] : "NO MATCH");
              if (orderMatch) {
                  const orderId = orderMatch[1];
                  const student = await User.findOne({ 
                      $or: [ { orderId: orderId }, { studentId: orderId } ]
                  });
                  console.log("  student found:", student ? student.fullName : "NO STUDENT FOUND");
              }
          }
      }
    } catch (err) {
      console.error(err);
    }
    mongoose.disconnect();
  });
