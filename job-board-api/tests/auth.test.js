const { app, request, sequelize, cleanDb, registerUser, uniqueEmail } = require("./helpers");

beforeEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await cleanDb();
  await sequelize.close();
});

describe("POST /api/auth/signup", () => {
  it("creates a new user and returns a JWT", async () => {
    const email = uniqueEmail("signup");
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ name: "Ada Lovelace", email, password: "password123", role: "CANDIDATE" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(typeof res.body.data.token).toBe("string");
  });

  it("rejects a duplicate email with 409", async () => {
    const email = uniqueEmail("dupe");
    await request(app)
      .post("/api/auth/signup")
      .send({ name: "First", email, password: "password123" });

    const res = await request(app)
      .post("/api/auth/signup")
      .send({ name: "Second", email, password: "password123" });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("does not allow self-assigning the ADMIN role at signup", async () => {
    const email = uniqueEmail("wannabe-admin");
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ name: "Sneaky", email, password: "password123", role: "ADMIN" });

    expect(res.status).toBe(400);
  });

  it("rejects invalid input with 400 and field-level details", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ name: "A", email: "not-an-email", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details.length).toBeGreaterThan(0);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials", async () => {
    const email = uniqueEmail("login");
    await request(app)
      .post("/api/auth/signup")
      .send({ name: "Login Test", email, password: "password123" });

    const res = await request(app).post("/api/auth/login").send({ email, password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email);
    expect(typeof res.body.data.token).toBe("string");
  });

  it("rejects an incorrect password with 401", async () => {
    const email = uniqueEmail("badpw");
    await request(app)
      .post("/api/auth/signup")
      .send({ name: "Bad PW", email, password: "password123" });

    const res = await request(app).post("/api/auth/login").send({ email, password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects a non-existent email with 401 (no user enumeration)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "password123" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("returns the current user when authenticated", async () => {
    const { token, user } = await registerUser("CANDIDATE");
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(user.id);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with a malformed token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });
});
