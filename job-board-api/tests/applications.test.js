const { app, request, sequelize, cleanDb, registerUser } = require("./helpers");

beforeEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await cleanDb();
  await sequelize.close();
});

async function createJobAs(employerToken) {
  const res = await request(app)
    .post("/api/jobs")
    .set("Authorization", `Bearer ${employerToken}`)
    .send({
      title: "QA Engineer",
      company: "Acme Corp",
      description: "Own our testing strategy and CI pipelines end to end.",
      location: "Remote",
    });
  return res.body.data.job;
}

describe("POST /api/jobs/:jobId/applications", () => {
  it("allows a CANDIDATE to apply to a job", async () => {
    const employer = await registerUser("EMPLOYER");
    const candidate = await registerUser("CANDIDATE");
    const job = await createJobAs(employer.token);

    const res = await request(app)
      .post(`/api/jobs/${job.id}/applications`)
      .set("Authorization", `Bearer ${candidate.token}`)
      .send({ coverNote: "Excited to apply!" });

    expect(res.status).toBe(201);
    expect(res.body.data.application.jobId).toBe(job.id);
    expect(res.body.data.application.status).toBe("PENDING");
  });

  it("rejects an EMPLOYER trying to apply (only CANDIDATE may apply)", async () => {
    const employer = await registerUser("EMPLOYER");
    const job = await createJobAs(employer.token);

    const res = await request(app)
      .post(`/api/jobs/${job.id}/applications`)
      .set("Authorization", `Bearer ${employer.token}`)
      .send({ coverNote: "I'll apply to my own job" });

    expect(res.status).toBe(403);
  });

  it("prevents a candidate from applying twice to the same job", async () => {
    const employer = await registerUser("EMPLOYER");
    const candidate = await registerUser("CANDIDATE");
    const job = await createJobAs(employer.token);

    await request(app)
      .post(`/api/jobs/${job.id}/applications`)
      .set("Authorization", `Bearer ${candidate.token}`)
      .send({});

    const res = await request(app)
      .post(`/api/jobs/${job.id}/applications`)
      .set("Authorization", `Bearer ${candidate.token}`)
      .send({});

    expect(res.status).toBe(409);
  });
});

describe("GET /api/jobs/:jobId/applications (employer views applicants)", () => {
  it("lets the owning employer list applications for their job", async () => {
    const employer = await registerUser("EMPLOYER");
    const candidate = await registerUser("CANDIDATE");
    const job = await createJobAs(employer.token);
    await request(app)
      .post(`/api/jobs/${job.id}/applications`)
      .set("Authorization", `Bearer ${candidate.token}`)
      .send({});

    const res = await request(app)
      .get(`/api/jobs/${job.id}/applications`)
      .set("Authorization", `Bearer ${employer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.applications.length).toBe(1);
  });

  it("blocks a candidate from viewing a job's applicant list", async () => {
    const employer = await registerUser("EMPLOYER");
    const candidate = await registerUser("CANDIDATE");
    const job = await createJobAs(employer.token);

    const res = await request(app)
      .get(`/api/jobs/${job.id}/applications`)
      .set("Authorization", `Bearer ${candidate.token}`);

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/applications/:id/status", () => {
  it("lets the job-owning employer update an application's status", async () => {
    const employer = await registerUser("EMPLOYER");
    const candidate = await registerUser("CANDIDATE");
    const job = await createJobAs(employer.token);
    const appRes = await request(app)
      .post(`/api/jobs/${job.id}/applications`)
      .set("Authorization", `Bearer ${candidate.token}`)
      .send({});

    const res = await request(app)
      .patch(`/api/applications/${appRes.body.data.application.id}/status`)
      .set("Authorization", `Bearer ${employer.token}`)
      .send({ status: "ACCEPTED" });

    expect(res.status).toBe(200);
    expect(res.body.data.application.status).toBe("ACCEPTED");
  });

  it("rejects an unrelated employer updating the status", async () => {
    const employer = await registerUser("EMPLOYER");
    const otherEmployer = await registerUser("EMPLOYER");
    const candidate = await registerUser("CANDIDATE");
    const job = await createJobAs(employer.token);
    const appRes = await request(app)
      .post(`/api/jobs/${job.id}/applications`)
      .set("Authorization", `Bearer ${candidate.token}`)
      .send({});

    const res = await request(app)
      .patch(`/api/applications/${appRes.body.data.application.id}/status`)
      .set("Authorization", `Bearer ${otherEmployer.token}`)
      .send({ status: "REJECTED" });

    expect(res.status).toBe(403);
  });
});

describe("GET /api/applications/mine & DELETE /api/applications/:id", () => {
  it("lets a candidate see and withdraw their own application", async () => {
    const employer = await registerUser("EMPLOYER");
    const candidate = await registerUser("CANDIDATE");
    const job = await createJobAs(employer.token);
    const appRes = await request(app)
      .post(`/api/jobs/${job.id}/applications`)
      .set("Authorization", `Bearer ${candidate.token}`)
      .send({});

    const mineRes = await request(app)
      .get("/api/applications/mine")
      .set("Authorization", `Bearer ${candidate.token}`);
    expect(mineRes.status).toBe(200);
    expect(mineRes.body.data.applications.length).toBe(1);

    const delRes = await request(app)
      .delete(`/api/applications/${appRes.body.data.application.id}`)
      .set("Authorization", `Bearer ${candidate.token}`);
    expect(delRes.status).toBe(204);
  });
});
