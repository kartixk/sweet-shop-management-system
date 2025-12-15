process.env.JWT_SECRET = 'test-secret-key';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

const TEST_DB_URI = 'mongodb://localhost:27017/sweetshop_test_auth';

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  await User.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.connection.close();
});

describe('Auth API', () => {
  test('register -> login works', async () => {

    // Register
    const reg = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@test.com',
        password: 'pass123',
        name: 'Test User'
      });

    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTruthy();

    // Login
    const login = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@test.com',
        password: 'pass123'
      });

    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
  });
});
