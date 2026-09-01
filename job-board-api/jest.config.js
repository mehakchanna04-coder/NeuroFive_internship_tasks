module.exports = {
  testEnvironment: "node",
  setupFiles: ["./tests/setupEnv.js"],
  testTimeout: 20000,
  globalSetup: "./tests/globalSetup.js",
  globalTeardown: "./tests/globalTeardown.js",
};
