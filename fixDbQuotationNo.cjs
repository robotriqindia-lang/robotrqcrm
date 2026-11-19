require('dotenv').config();
const mongoose = require('mongoose');
const AdminQuotation = require('./models/AdminQuotation');
const Quotation = require('./models/Quotation');
mongoose.connect(process.env.MONGO_URI).then(async () => {
    
    const adminQs = await AdminQuotation.find();
    for (let q of adminQs) {
        if (q.customData && q.customData.quotationNo !== q.quotationNo) {
            q.customData.quotationNo = q.quotationNo;
            await AdminQuotation.findByIdAndUpdate(q._id, { customData: q.customData });
        }
    }
    
    const qs = await Quotation.find();
    for (let q of qs) {
        if (q.customData && q.customData.quotationNo !== q.quotationNo) {
            q.customData.quotationNo = q.quotationNo;
            await Quotation.findByIdAndUpdate(q._id, { customData: q.customData });
        }
    }
    
    console.log('Fixed quotationNo in database.');
    process.exit(0);
});
