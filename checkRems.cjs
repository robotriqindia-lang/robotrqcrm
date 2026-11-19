const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/robotriqcrm').then(async () => {
  const db = mongoose.connection.db;
  const rems = await db.collection('reminders').find().limit(5).toArray();
  console.log('Reminders:', JSON.stringify(rems, null, 2));
  process.exit(0);
});
