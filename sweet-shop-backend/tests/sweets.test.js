process.env.JWT_SECRET = 'test-secret-key';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/User');
const Sweet = require('../src/models/Sweet');

const TEST_DB_URI = 'mongodb://localhost:27017/sweetshop_test_sweets';

let token;
let sweetId;

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);

  await User.deleteMany({});
  await Sweet.deleteMany({});

  // ✅ CREATE ADMIN USER (CRITICAL FIX)
  const hashed = await bcrypt.hash('password123', 10);
  await User.create({
    email: 'admin@test.com',
    password: hashed,
    name: 'Admin',
    role: 'ADMIN' // ⭐ REQUIRED FOR DELETE
  });

  // Login
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'password123' });

  expect(res.status).toBe(200);
  expect(res.body.token).toBeTruthy();
  token = res.body.token;
});

afterAll(async () => {
  await Sweet.deleteMany({});
  await User.deleteMany({});
  await mongoose.connection.close();
});

describe('🍬 Sweets API', () => {

  test('POST /api/sweets - create sweet', async () => {
    const res = await request(app)
      .post('/api/sweets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Gulab Jamun',
        category: 'Milk',
        price: 50,
        quantity: 10,
        imageUrl: 'http://example.com/gulab.jpg'
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Gulab Jamun');
    sweetId = res.body._id;
    expect(sweetId).toBeTruthy();
  });

  test('GET /api/sweets - list sweets', async () => {
    const res = await request(app).get('/api/sweets');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/sweets/:id/purchase - purchase sweet', async () => {
    const res = await request(app)
      .post(`/api/sweets/${sweetId}/purchase`)
      .set('Authorization', `Bearer ${token}`) // ⭐ REQUIRED (401 FIX)
      .send({ quantity: 2 });

    expect(res.status).toBe(200);

    const updated = await Sweet.findById(sweetId);
    expect(updated.quantity).toBe(8);
  });

  test('DELETE /api/sweets/:id - delete sweet', async () => {
    const res = await request(app)
      .delete(`/api/sweets/${sweetId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const check = await Sweet.findById(sweetId);
    expect(check).toBeNull();
  });
});
