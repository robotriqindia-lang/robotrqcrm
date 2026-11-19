require('dotenv').config();
const mongoose = require('mongoose');
const AdminQuotation = require('./models/AdminQuotation');
mongoose.connect(process.env.MONGO_URI).then(async () => {
    // Update all 'BOB A/C' to 'ACC NO'
    await AdminQuotation.updateMany({}, {
        $set: { bobAc: 'ACC NO : 252511010000242', bankName: 'ACC NAME : ROBOTRIQ AUTOMATION PRIVATE LIMITED', branch: 'BRANCH : UNION BANK,SUNDHARAPURAM,COIMBATORE.', ifsc: 'IFSC CODE : UBIN0825255' }
    });
    console.log('Updated database.');
    process.exit(0);
});
