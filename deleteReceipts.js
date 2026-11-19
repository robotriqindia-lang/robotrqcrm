require('dotenv').config();
const mongoose = require('mongoose');
const Account = require('./models/Account');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        const result = await Account.deleteMany({ desc: { $regex: /^Receipt:/ } });
        console.log(`Deleted ${result.deletedCount} receipt records.`);
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
}).catch(err => {
    console.error("Connection error:", err);
});
