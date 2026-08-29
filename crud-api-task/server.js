const express = require('express');
const { randomUUID } = require('crypto');

const app = express();
const DEFAULT_PORT = 3000;
const PORT = Number(process.env.PORT) || DEFAULT_PORT;

app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
});

let tasks = [
  {
    id: randomUUID(),
    title: 'Design landing page',
    description: 'Create a clean homepage layout for the new product launch.',
    status: 'in-progress',
    priority: 'high',
    createdAt: new Date().toISOString()
  },
  {
    id: randomUUID(),
    title: 'Plan sprint review',
    description: 'Prepare the agenda and demo notes for Friday’s sprint review.',
    status: 'pending',
    priority: 'medium',
    createdAt: new Date().toISOString()
  }
];

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Task CRUD API is running',
    endpoints: [
      'GET /api/tasks',
      'GET /api/tasks/:id',
      'POST /api/tasks',
      'PUT /api/tasks/:id',
      'DELETE /api/tasks/:id'
    ]
  });
});

app.get('/api/tasks', (req, res) => {
  res.status(200).json(tasks);
});

app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.find((item) => item.id === req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.status(200).json(task);
});

app.post('/api/tasks', (req, res) => {
  const { title, description, status, priority } = req.body;

  if (!title || !description || !status || !priority) {
    return res.status(400).json({
      error: 'title, description, status, and priority are required'
    });
  }

  const newTask = {
    id: randomUUID(),
    title,
    description,
    status,
    priority,
    createdAt: new Date().toISOString()
  };

  tasks.push(newTask);
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
  const taskIndex = tasks.findIndex((task) => task.id === req.params.id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { title, description, status, priority } = req.body;
  const existingTask = tasks[taskIndex];

  const updatedTask = {
    ...existingTask,
    title: title ?? existingTask.title,
    description: description ?? existingTask.description,
    status: status ?? existingTask.status,
    priority: priority ?? existingTask.priority
  };

  tasks[taskIndex] = updatedTask;
  res.status(200).json(updatedTask);
});

app.delete('/api/tasks/:id', (req, res) => {
  const taskIndex = tasks.findIndex((task) => task.id === req.params.id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks.splice(taskIndex, 1);
  res.status(204).send();
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`CRUD API running on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.log(`Port ${port} is busy. Trying ${nextPort} instead...`);
      startServer(nextPort);
      return;
    }

    throw err;
  });
};

startServer(PORT);
