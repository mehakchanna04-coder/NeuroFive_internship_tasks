/**
 * Seeds the database with sample data so pagination, filtering, sorting,
 * and role-based permissions can actually be tested against realistic data.
 *
 * Run with: npm run seed
 *
 * This clears existing Tasks, Categories, and Comments (NOT Users, so
 * your login credentials survive re-seeding) and creates:
 *   - 5 categories
 *   - 35 tasks spread across categories, statuses, and due dates, all
 *     owned by the demo regular user
 *   - a demo admin user and a demo regular user (only if no users exist yet)
 *   - a couple of comments on the first several tasks
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const Category = require('./models/Category');
const Task = require('./models/Task');
const Comment = require('./models/Comment');
const User = require('./models/User');

const STATUSES = ['pending', 'in-progress', 'completed'];
const CATEGORY_DEFS = [
  { name: 'Work', description: 'Job and career-related tasks' },
  { name: 'Personal', description: 'Personal errands and goals' },
  { name: 'Learning', description: 'Courses, tutorials, and study tasks' },
  { name: 'Health', description: 'Fitness and wellbeing tasks' },
  { name: 'Errands', description: 'Quick day-to-day errands' },
];
const TASK_COUNT = 35;

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Add it to your .env before seeding.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`[Seed] Connected to ${mongoose.connection.name}`);

  await Promise.all([
    Task.deleteMany({}),
    Category.deleteMany({}),
    Comment.deleteMany({}),
  ]);
  console.log('[Seed] Cleared existing tasks, categories, and comments');

  const categories = await Category.insertMany(CATEGORY_DEFS);
  console.log(`[Seed] Created ${categories.length} categories`);

  // Reuse existing demo accounts if they exist, otherwise create both a
  // regular user and an admin user — needed to actually demo role
  // restrictions (e.g. admin creating a category vs. a regular user
  // being blocked from the same action).
  let regularUser = await User.findOne({ email: 'seed.user@example.com' });
  if (!regularUser) {
    regularUser = await User.create({
      email: 'seed.user@example.com',
      password: 'seedpassword123',
      role: 'user',
    });
    console.log('[Seed] Created demo user: seed.user@example.com / seedpassword123 (role: user)');
  }

  let adminUser = await User.findOne({ email: 'seed.admin@example.com' });
  if (!adminUser) {
    adminUser = await User.create({
      email: 'seed.admin@example.com',
      password: 'seedpassword123',
      role: 'admin',
    });
    console.log('[Seed] Created demo admin: seed.admin@example.com / seedpassword123 (role: admin)');
  }

  const taskDocs = [];
  for (let i = 1; i <= TASK_COUNT; i++) {
    const category = categories[i % categories.length];
    const status = STATUSES[i % STATUSES.length];
    const daysOffset = i - Math.floor(TASK_COUNT / 2); // spread due dates before/after today
    const dueDate = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000);

    taskDocs.push({
      title: `Sample Task ${String(i).padStart(2, '0')}`,
      description: `Auto-generated seed task #${i}, used to test pagination, filtering, and sorting.`,
      status,
      dueDate,
      category: category._id,
      createdBy: regularUser._id, // all seeded tasks are owned by the regular demo user
    });
  }
  const tasks = await Task.insertMany(taskDocs);
  console.log(`[Seed] Created ${tasks.length} tasks (owned by seed.user@example.com)`);

  const commentDocs = [];
  tasks.slice(0, 10).forEach((task, idx) => {
    commentDocs.push(
      { task: task._id, author: regularUser._id, content: `First thoughts on task ${idx + 1}.` },
      { task: task._id, author: regularUser._id, content: `Following up on task ${idx + 1} — looks good.` }
    );
  });
  const comments = await Comment.insertMany(commentDocs);
  console.log(`[Seed] Created ${comments.length} comments across the first 10 tasks`);

  console.log('[Seed] Done.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[Seed] Failed:', err);
  process.exit(1);
});