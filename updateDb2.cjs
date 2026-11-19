require('dotenv').config();
const mongoose = require('mongoose');
const AdminQuotation = require('./models/AdminQuotation');
mongoose.connect(process.env.MONGO_URI).then(async () => {
    
    const quotations = await AdminQuotation.find();
    for (let q of quotations) {
        if (q.customData) {
            q.customData.bankName = "ACC NAME : ROBOTRIQ AUTOMATION PRIVATE LIMITED";
            q.customData.bobAc = "ACC NO : 252511010000242";
            q.customData.ifsc = "IFSC CODE : UBIN0825255";
            q.customData.branch = "BRANCH : UNION BANK,SUNDHARAPURAM,COIMBATORE.";
            q.customData.sigFor = "For ROBOTRIQ AUTOMATION PRIVATE LIMITED";
            q.customData.sigName = "Authorised Signatory";
            
            // Fix Terms
            if (q.customData.terms && Array.isArray(q.customData.terms)) {
                for (let t of q.customData.terms) {
                    if (t.desc) {
                        t.desc = t.desc.replace(/Mine Power India/g, 'Robotriq Automation Private Limited');
                    }
                }
            }
            
            await AdminQuotation.findByIdAndUpdate(q._id, { customData: q.customData });
        }
    }
    
    console.log('Updated database correctly.');
    process.exit(0);
});
