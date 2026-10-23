const fs = require('fs'), path = require('path');
const { MongoClient } = require('mongodb');
const config = require('./config');

// Các collection được gán sau khi connect(); route đọc chúng lúc có request nên luôn đã sẵn sàng
const db = { Products: null, Orders: null, Users: null, Images: null, Resets: null, Settings: null };
const NOID = { projection: { _id: 0 } };

async function connect() {
  const client = new MongoClient(config.mongoUri);
  await client.connect();
  const d = client.db(config.mongoDb);
  db.Products = d.collection('products'); db.Orders = d.collection('orders'); db.Users = d.collection('users');
  db.Images = d.collection('images'); db.Resets = d.collection('resets'); db.Settings = d.collection('settings');
  await db.Products.createIndex({ id: 1 }, { unique: true });
  await db.Orders.createIndex({ id: 1 }, { unique: true });
  await db.Users.createIndex({ email: 1 }, { unique: true });
  await db.Images.createIndex({ id: 1 }, { unique: true });
  if (await db.Products.countDocuments() === 0) {           // lần đầu: nhập sản phẩm mẫu
    const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'products.json'), 'utf8'));
    await db.Products.insertMany(seed); console.log('Đã nhập', seed.length, 'sản phẩm mẫu');
  }
}
module.exports = { db, NOID, connect };
