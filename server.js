const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mock Data In-Memory Store
let builds = [
  { id: 104, commit: 'a8f2c31', branch: 'main', status: 'Success', duration: 42, timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), logs: ['[INFO] Starting build...', '[INFO] Linting completed.', '[INFO] Running Jest tests...', '[PASS] All tests passed.', '[INFO] Docker build success.', '[INFO] Pushed to registry.', '[INFO] Deployment rolling update complete.'] },
  { id: 103, commit: 'f9a2d82', branch: 'main', status: 'Success', duration: 38, timestamp: new Date(Date.now() - 3600000 * 8).toISOString(), logs: ['[INFO] Starting build...', '[INFO] Linting completed.', '[INFO] Running Jest tests...', '[PASS] All tests passed.', '[INFO] Docker build success.'] },
  { id: 102, commit: 'd7c1b50', branch: 'feature/auth', status: 'Failed', duration: 15, timestamp: new Date(Date.now() - 3600000 * 12).toISOString(), logs: ['[INFO] Starting build...', '[INFO] Linting completed.', '[INFO] Running Jest tests...', '[FAIL] AuthController.test.js: Unexpected token.', '[ERROR] Build failed during testing.'] },
  { id: 101, commit: 'b5e0a44', branch: 'main', status: 'Success', duration: 45, timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), logs: ['[INFO] Starting build...', '[INFO] Linting completed.', '[INFO] Running Jest tests...', '[PASS] All tests passed.', '[INFO] Docker build success.'] }
];

let deploymentSuccessRate = 92.5;
let replicasCount = 3;
let systemStats = {
  cpu: 45,
  memory: 62,
  network: 150, // Mbps
  uptime: process.uptime()
};

// Update stats dynamically to look realistic
setInterval(() => {
  systemStats.cpu = Math.min(100, Math.max(10, Math.round(45 + (Math.random() - 0.5) * 15)));
  systemStats.memory = Math.min(100, Math.max(20, Math.round(62 + (Math.random() - 0.5) * 5)));
  systemStats.network = Math.round(150 + (Math.random() - 0.5) * 40);
  systemStats.uptime = process.uptime();
}, 3000);

// API: Get Live Metrics
app.get('/api/metrics', (req, res) => {
  // Calculate average deployment success rate
  const successCount = builds.filter(b => b.status === 'Success').length;
  const totalBuilds = builds.length;
  const rate = totalBuilds > 0 ? Math.round((successCount / totalBuilds) * 1000) / 10 : 0;

  res.json({
    successRate: rate,
    replicas: replicasCount,
    cpu: systemStats.cpu,
    memory: systemStats.memory,
    network: systemStats.network,
    uptime: Math.round(systemStats.uptime),
    totalBuilds: totalBuilds
  });
});

// API: Get Build History
app.get('/api/builds', (req, res) => {
  res.json(builds);
});

// API: Trigger a build (Simulated CI/CD Pipeline)
app.post('/api/trigger-build', (req, res) => {
  const newId = (builds.length > 0 ? Math.max(...builds.map(b => b.id)) : 100) + 1;
  const commitHash = Math.random().toString(16).substring(2, 9);
  const branch = req.body.branch || 'main';
  const shouldSucceed = Math.random() > 0.15; // 85% success chance

  const newBuild = {
    id: newId,
    commit: commitHash,
    branch: branch,
    status: 'Running',
    duration: 0,
    timestamp: new Date().toISOString(),
    logs: ['[INFO] Webhook triggered.', '[INFO] Checking out branch: ' + branch, '[INFO] Initializing package manager...']
  };

  builds.unshift(newBuild);

  // Simulate pipeline stages asynchronously
  let stage = 0;
  const interval = setInterval(() => {
    stage++;
    const buildIndex = builds.findIndex(b => b.id === newId);
    if (buildIndex === -1) {
      clearInterval(interval);
      return;
    }

    if (stage === 1) {
      builds[buildIndex].logs.push('[INFO] Running npm install & audit...');
      builds[buildIndex].logs.push('[INFO] Audited 142 packages, 0 vulnerabilities found.');
    } else if (stage === 2) {
      builds[buildIndex].logs.push('[INFO] Linting codebase using ESLint...');
      builds[buildIndex].logs.push('[PASS] Lint checks passed with 0 errors, 0 warnings.');
    } else if (stage === 3) {
      builds[buildIndex].logs.push('[INFO] Executing Jest testing suites...');
      builds[buildIndex].logs.push('[PASS] tests/app.test.js (4.23s)');
      builds[buildIndex].logs.push('[INFO] 1 test suite passed, 2 tests successful.');
    } else if (stage === 4) {
      if (shouldSucceed) {
        builds[buildIndex].logs.push('[INFO] Building Docker container: docker build -t devops-dashboard:latest .');
        builds[buildIndex].logs.push('[INFO] Multi-stage build completed. Image size: 124MB.');
        builds[buildIndex].logs.push('[INFO] Tagging image and pushing to DockerHub repository: harsh/devops-dashboard:latest');
        builds[buildIndex].logs.push('[INFO] Uploaded layer 1/3 (15MB), layer 2/3 (60MB), layer 3/3 (49MB).');
      } else {
        builds[buildIndex].logs.push('[INFO] Executing integration testing suites...');
        builds[buildIndex].logs.push('[FAIL] Integration error: Connection timeout with external auth API.');
        builds[buildIndex].status = 'Failed';
        builds[buildIndex].duration = 22;
        clearInterval(interval);
      }
    } else if (stage === 5) {
      builds[buildIndex].logs.push('[INFO] Initiating Kubernetes rolling update deployment...');
      builds[buildIndex].logs.push('[INFO] kubectl set image deployment/devops-dashboard-deployment web=harsh/devops-dashboard:latest');
      builds[buildIndex].logs.push('[INFO] Deployment success. Pods updated. Liveness check: OK.');
      builds[buildIndex].status = 'Success';
      builds[buildIndex].duration = 45;
      clearInterval(interval);
    }
  }, 2000);

  res.status(202).json({ message: 'Build pipeline triggered', buildId: newId, commit: commitHash });
});

// K8s Probes
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` DevOps Dashboard Service running on port ${PORT}`);
    console.log(` Local URL: http://localhost:${PORT}`);
    console.log(` Health Probe: http://localhost:${PORT}/healthz`);
    console.log(`====================================================`);
  });
}

module.exports = app;
