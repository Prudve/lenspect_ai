const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/LENSPECT').then(async () => {
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  console.log(users.map(u => ({ username: u.username, role: u.role })));
  mongoose.disconnect();
});
