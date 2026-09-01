const { app, request, sequelize, cleanDb, registerUser, createAdminUser } = require("./helpers");

beforeEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await cleanDb();
  await sequelize.close();
});

const sampleJob = {
  title: "Senior Backend Engineer",
  company: "Acme Corp",
  description: "Design and build scalable REST APIs for our platform.",
  location: "Remote",
  type: "FULL_TIME",
  salaryMin: 100000,
  salaryMax: 150000,
};

describe("POST /api/jobs (role-based access)", () => {
  it("allows an EMPLOYER to create a job", async () => {
    const { token } = await registerUser("EMPLOYER");
    const res = await request(app).post("/api/jobs").set("Authorization", `Bearer ${token}`).send(sampleJob);

    expect(res.status).toBe(201);
    expect(res.body.data.job.title).toBe(sampleJob.title);
  });

  it("rejects a CANDIDATE trying to create a job with 403", async () => {
    const { token } = await registerUser("CANDIDATE");
    const res = await request(app).post("/api/jobs").set("Authorization", `Bearer ${token}`).send(sampleJob);
    expect(res.status).toBe(403);
  });

  it("rejects an unauthenticated request with 401", async () => {
    const res = await request(app).post("/api/jobs").send(sampleJob);
    expect(res.status).toBe(401);
  });

  it("rejects invalid job data with 400", async () => {
    const { token } = await registerUser("EMPLOYER");
    const res = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "ab", company: "", description: "too short", location: "" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/jobs (public, search/filter/pagination)", () => {
  beforeEach(async () => {
    const { token } = await registerUser("EMPLOYER");
    await request(app).post("/api/jobs").set("Authorization", `Bearer ${token}`).send(sampleJob);
    await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...sampleJob, title: "Frontend Developer", location: "New York", type: "CONTRACT" });
  });

  it("lists jobs without authentication", async () => {
    const res = await request(app).get("/api/jobs");
    expect(res.status).toBe(200);
    expect(res.body.data.jobs.length).toBe(2);
    expect(res.body.pagination.total).toBe(2);
  });

  it("filters jobs by search term matching title", async () => {
    const res = await request(app).get("/api/jobs").query({ search: "Frontend" });
    expect(res.status).toBe(200);
    expect(res.body.data.jobs.length).toBe(1);
    expect(res.body.data.jobs[0].title).toBe("Frontend Developer");
  });

  it("filters jobs by location", async () => {
    const res = await request(app).get("/api/jobs").query({ location: "New York" });
    expect(res.body.data.jobs.length).toBe(1);
    expect(res.body.data.jobs[0].location).toBe("New York");
  });

  it("paginates results", async () => {
    const res = await request(app).get("/api/jobs").query({ page: 1, limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.jobs.length).toBe(1);
    expect(res.body.pagination.totalPages).toBe(2);
  });
});

describe("PATCH/DELETE /api/jobs/:id (ownership enforcement)", () => {
  it("allows the owning EMPLOYER to update their job", async () => {
    const { token } = await registerUser("EMPLOYER");
    const createRes = await request(app).post("/api/jobs").set("Authorization", `Bearer ${token}`).send(sampleJob);
    const jobId = createRes.body.data.job.id;

    const res = await request(app)
      .patch(`/api/jobs/${jobId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Updated Title" });

    expect(res.status).toBe(200);
    expect(res.body.data.job.title).toBe("Updated Title");
  });

  it("rejects a different EMPLOYER from updating someone else's job", async () => {
    const owner = await registerUser("EMPLOYER");
    const intruder = await registerUser("EMPLOYER");
    const createRes = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${owner.token}`)
      .send(sampleJob);
    const jobId = createRes.body.data.job.id;

    const res = await request(app)
      .patch(`/api/jobs/${jobId}`)
      .set("Authorization", `Bearer ${intruder.token}`)
      .send({ title: "Hijacked" });

    expect(res.status).toBe(403);
  });

  it("allows an ADMIN to delete any job", async () => {
    const owner = await registerUser("EMPLOYER");
    const admin = await createAdminUser();
    const createRes = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${owner.token}`)
      .send(sampleJob);
    const jobId = createRes.body.data.job.id;

    const res = await request(app).delete(`/api/jobs/${jobId}`).set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/api/jobs/${jobId}`);
    expect(getRes.status).toBe(404);
  });

  it("returns 404 for a non-existent job", async () => {
    const res = await request(app).get("/api/jobs/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});
