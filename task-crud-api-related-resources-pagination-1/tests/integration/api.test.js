/**
 * Integration tests — real HTTP requests through the Express app (via
 * supertest), hitting a real MongoDB connection. This exercises routing,
 * validation, auth middleware, controllers, and Mongoose together, the
 * same way a real client would.
 *
 * Uses the same MongoDB Atlas cluster as the app, but a dedicated
 * database name ("task_crud_api_test") so these tests never touch real
 * seeded/production data — safe even though afterAll() drops the database.
 *
 * Run with: npm test
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration_test_secret_do_not_use_in_prod';
process.env.JWT_EXPIRES_IN = '1h';

// Force reliable DNS resolution (fixes SRV lookup issues on some Windows setups)
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();

const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../../app');
const User = require('../../models/User');
const Task = require('../../models/Task');
const Category = require('../../models/Category');
const Comment = require('../../models/Comment');

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not set. Add it to your .env before running tests.');
}

const TEST_DB_URI = process.env.MONGODB_URI.replace(/\/\?/, '/task_crud_api_test?');

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
}, 30000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}, 30000);

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Task.deleteMany({}),
    Category.deleteMany({}),
    Comment.deleteMany({}),
  ]);
});

/** Signs up a fresh user and returns their auth token + id. */
async function signupAndLogin(email = 'user@example.com', password = 'password123') {
  const res = await request(app).post('/api/auth/signup').send({ email, password });
  return { token: res.body.data.token, userId: res.body.data.user.id };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe('POST /api/auth/signup', () => {
  test('happy path: creates a user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'newuser@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe('newuser@example.com');
  });

  test('failure: signing up with an email already in use returns 409', async () => {
    await request(app).post('/api/auth/signup').send({ email: 'dup@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'dup@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/already exists/i);
  });
}, 30000);

describe('POST /api/auth/login', () => {
  test('happy path: correct credentials return a token', async () => {
    await request(app).post('/api/auth/signup').send({ email: 'login@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
  });

  test('failure: wrong password returns 401 without revealing which part was wrong', async () => {
    await request(app).post('/api/auth/signup').send({ email: 'login2@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login2@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });
}, 30000);

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

describe('POST /api/categories', () => {
  test('happy path: an authenticated user creates a category', async () => {
    const { token } = await signupAndLogin();

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Work', description: 'Job-related tasks' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Work');
  });

  test('failure: missing required "name" field returns 400 with details', async () => {
    const { token } = await signupAndLogin();

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'name' })])
    );
  });
}, 30000);

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

describe('POST /api/tasks', () => {
  test('happy path: an authenticated user creates a task', async () => {
    const { token } = await signupAndLogin();

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Write integration tests' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Write integration tests');
    expect(res.body.data.status).toBe('pending'); // schema default
  });

  test('failure: creating a task without a token returns 401', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Should be rejected' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/no token provided/i);
  });
}, 30000);

describe('GET /api/tasks (pagination)', () => {
  test('happy path: returns a paginated slice with a correct pagination block', async () => {
    const { token } = await signupAndLogin();

    // Create 12 tasks so a limit=5 page split is meaningful to assert on.
    for (let i = 0; i < 12; i++) {
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: `Task ${i}` });
    }

    const res = await request(app).get('/api/tasks?page=1&limit=5');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(5);
    expect(res.body.pagination).toMatchObject({
      page: 1,
      limit: 5,
      total: 12,
      totalPages: 3,
    });
  }, 30000);

  test('failure: an out-of-range limit value returns 400', async () => {
    const res = await request(app).get('/api/tasks?limit=0');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('PUT /api/tasks/:id', () => {
  test('happy path: updates an existing task', async () => {
    const { token } = await signupAndLogin();
    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Original title' });
    const taskId = create.body.data._id;

    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.title).toBe('Original title'); // untouched field survives partial update
  });

  test('failure: updating a task id that does not exist returns 404', async () => {
    const { token } = await signupAndLogin();

    const res = await request(app)
      .put('/api/tasks/64f1a2b3c4d5e6f7a8b9c0d1') // well-formed ObjectId, but nothing exists with it
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/task not found/i);
  });
}, 30000);

// ---------------------------------------------------------------------------
// Comments (nested resource)
// ---------------------------------------------------------------------------

describe('POST /api/tasks/:id/comments', () => {
  test('happy path: adds a comment to an existing task', async () => {
    const { token } = await signupAndLogin();
    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Commentable task' });
    const taskId = create.body.data._id;

    const res = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Looks good!' });

    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe('Looks good!');
  });

  test('failure: commenting on a task that does not exist returns 404', async () => {
    const { token } = await signupAndLogin();

    const res = await request(app)
      .post('/api/tasks/64f1a2b3c4d5e6f7a8b9c0d1/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Hello?' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
}, 30000);

describe('DELETE /api/comments/:id', () => {
  test("failure: a user cannot delete another user's comment (403, ownership check)", async () => {
    const owner = await signupAndLogin('owner@example.com');
    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Task with a comment' });
    const taskId = create.body.data._id;

    const commentRes = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ content: "Owner's comment" });
    const commentId = commentRes.body.data._id;

    const intruder = await signupAndLogin('intruder@example.com');
    const res = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set('Authorization', `Bearer ${intruder.token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/own comments/i);
  });

  test('happy path: the comment author can delete their own comment', async () => {
    const { token } = await signupAndLogin();
    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Task with a comment to delete' });
    const taskId = create.body.data._id;

    const commentRes = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Delete me' });
    const commentId = commentRes.body.data._id;

    const res = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deleted).toBe(true);
  });
}, 30000);
