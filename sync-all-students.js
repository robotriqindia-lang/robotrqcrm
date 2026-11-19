require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Account = require('./models/Account');

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
    console.log("Connected to DB!\n");
    
    // Get all students
    const students = await User.find({ role: 'student' });
    console.log(`Total Students Found: ${students.length}\n`);
    
    // Get all receipt transactions
    const allAccounts = await Account.find({ type: 'Income' });
    const allReceipts = allAccounts.filter(a => a.desc && a.desc.startsWith('Receipt:'));
    
    let fixedCount = 0;
    let alreadyCorrect = 0;
    let noReceipts = 0;
    
    for (const student of students) {
        const orderId = student.orderId;
        if (!orderId) {
            continue;
        }
        
        // Calculate actual total from receipts
        let actualTotal = 0;
        let receiptCount = 0;
        allReceipts.forEach(r => {
            const orderMatch = r.desc.match(/\(Order:\s*([^)]+)\)/);
            if (orderMatch && orderMatch[1].trim() === String(orderId).trim()) {
                actualTotal += Number(r.amount || 0);
                receiptCount++;
            }
        });
        
        const currentPaid = Number(student.paidAmount || 0);
        
        if (receiptCount === 0) {
            noReceipts++;
            // If no receipts but paidAmount > 0, reset to 0
            if (currentPaid > 0) {
                console.log(`⚠️  ${student.fullName} (Order: ${orderId}) - No receipts but paidAmount=₹${currentPaid.toLocaleString('en-IN')}. Resetting to ₹0`);
                await User.updateOne({ _id: student._id }, { paidAmount: 0 });
                fixedCount++;
            }
            continue;
        }
        
        if (currentPaid !== actualTotal) {
            console.log(`🔧 FIX: ${student.fullName} (Order: ${orderId})`);
            console.log(`   Receipts: ${receiptCount} | DB PaidAmount: ₹${currentPaid.toLocaleString('en-IN')} → Actual: ₹${actualTotal.toLocaleString('en-IN')} | Diff: ₹${(currentPaid - actualTotal).toLocaleString('en-IN')}`);
            
            await User.updateOne({ _id: student._id }, { paidAmount: actualTotal });
            fixedCount++;
        } else {
            alreadyCorrect++;
        }
    }
    
    console.log(`\n====================================`);
    console.log(`         SYNC COMPLETE! ✅`);
    console.log(`====================================`);
    console.log(`  Already Correct: ${alreadyCorrect}`);
    console.log(`  Fixed: ${fixedCount}`);
    console.log(`  No Receipts: ${noReceipts}`);
    console.log(`====================================\n`);
    
    mongoose.disconnect();
})
.catch(err => {
    console.error("DB Connection Error:", err);
    mongoose.disconnect();
});
