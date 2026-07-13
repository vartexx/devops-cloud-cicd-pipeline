const request = require('supertest');
const app = require('../server');

describe('DevOps Dashboard API Endpoints', () => {

  // Test 1: Kubernetes Readiness/Liveness health probe
  test('GET /healthz should return 200 OK', async () => {
    const response = await request(app).get('/healthz');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('OK');
  });

  // Test 2: Dashboard Metrics endpoint
  test('GET /api/metrics should return stats object', async () => {
    const response = await request(app).get('/api/metrics');
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toHaveProperty('successRate');
    expect(response.body).toHaveProperty('replicas');
    expect(response.body).toHaveProperty('cpu');
    expect(response.body).toHaveProperty('memory');
    expect(response.body).toHaveProperty('network');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('totalBuilds');
  });

  // Test 3: Fetch builds history list
  test('GET /api/builds should return historical build arrays', async () => {
    const response = await request(app).get('/api/builds');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('id');
    expect(response.body[0]).toHaveProperty('commit');
    expect(response.body[0]).toHaveProperty('status');
  });

  // Test 4: Trigger new build simulation
  test('POST /api/trigger-build should queue a new CI run', async () => {
    const response = await request(app)
      .post('/api/trigger-build')
      .send({ branch: 'feature/auth' });
    
    expect(response.statusCode).toBe(202);
    expect(response.body).toHaveProperty('message', 'Build pipeline triggered');
    expect(response.body).toHaveProperty('buildId');
    expect(response.body).toHaveProperty('commit');
  });

});
