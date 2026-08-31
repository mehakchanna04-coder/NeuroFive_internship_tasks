process.env.JWT_SECRET = 'test_secret_for_automated_tests_only';
process.env.JWT_EXPIRES_IN = '1h';

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();

const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../app');
const User = require('../models/User');
const Task = require('../models/Task');

// Use the same Atlas cluster as the app, but a dedicated test database name,
// so tests never touch real data even though this suite calls dropDatabase().
const TEST_DB_URI = process.env.MONGODB_URI.replace(
  /\/\?/,
  '/task_crud_api_test?'
);

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
}, 20000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}, 20000);

afterEach(async () => {
  await Promise.all([User.deleteMany({}), Task.deleteMany({})]);
}, 20000);

async function signupAndLogin(email, password = 'password123') {
  const res = await request(app).post('/api/auth/signup').send({ email, password });
  return { token: res.body.data.token, userId: res.body.data.user.id };
}

async function makeAdmin(userId) {
  await User.findByIdAndUpdate(userId, { role: 'admin' });
}

async function loginAndGetFreshToken(email, password = 'password123') {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.token;
}

describe('Role-based access control', () => {
  test('1. A regular user is blocked (403) from creating a category', async () => {
    const { token } = await signupAndLogin('user1@example.com');
    const res = await request(app).post('/api/categories').set('Authorization', `Bearer ${token}`).send({ name: 'Work' });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/admin/i);
  });

  test('2. An admin CAN create a category (same endpoint the regular user was blocked from)', async () => {
    const { userId } = await signupAndLogin('admin1@example.com');
    await makeAdmin(userId);
    const adminToken = await loginAndGetFreshToken('admin1@example.com');
    const res = await request(app).post('/api/categories').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Work', description: 'Job stuff' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Work');
  });

  test("3. A user cannot delete another user's task (403, ownership check)", async () => {
    const owner = await signupAndLogin('owner@example.com');
    const intruder = await signupAndLogin('intruder@example.com');
    const createRes = await request(app).post('/api/tasks').set('Authorization', `Bearer ${owner.token}`).send({ title: "Owner's private task" });
    const taskId = createRes.body.data._id;
    const deleteRes = await request(app).delete(`/api/tasks/${taskId}`).set('Authorization', `Bearer ${intruder.token}`);
    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body.success).toBe(false);
    expect(deleteRes.body.error).toMatch(/own tasks/i);
  });

  test('4. The task owner CAN delete their own task', async () => {
    const owner = await signupAndLogin('owner2@example.com');
    const createRes = await request(app).post('/api/tasks').set('Authorization', `Bearer ${owner.token}`).send({ title: 'My task to delete' });
    const taskId = createRes.body.data._id;
    const deleteRes = await request(app).delete(`/api/tasks/${taskId}`).set('Authorization', `Bearer ${owner.token}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });

  test("5. An admin CAN delete another user's task (admin override)", async () => {
    const owner = await signupAndLogin('owner3@example.com');
    const { userId: adminUserId } = await signupAndLogin('admin2@example.com');
    await makeAdmin(adminUserId);
    const adminToken = await loginAndGetFreshToken('admin2@example.com');
    const createRes = await request(app).post('/api/tasks').set('Authorization', `Bearer ${owner.token}`).send({ title: 'Task the admin will remove' });
    const taskId = createRes.body.data._id;
    const deleteRes = await request(app).delete(`/api/tasks/${taskId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });

  test('6. An unauthenticated request gets 401, not 403', async () => {
    const res = await request(app).post('/api/categories').send({ name: 'No Token' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/token/i);
  });

  test('7. Only admins can list all users; a regular user is blocked with 403', async () => {
    const { token } = await signupAndLogin('user2@example.com');
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('8. An admin CAN list all users', async () => {
    const { userId } = await signupAndLogin('admin3@example.com');
    await signupAndLogin('someoneelse@example.com');
    await makeAdmin(userId);
    const adminToken = await loginAndGetFreshToken('admin3@example.com');
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });
});