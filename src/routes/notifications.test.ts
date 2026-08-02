import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startNotificationsServer } from './notifications';

const TEST_TOKEN = 'test-token';

describe('notifications route', () => {
  let baseUrl: string;
  let server: Awaited<ReturnType<typeof startNotificationsServer>>['server'];

  beforeEach(async () => {
    process.env.NOTIFICATIONS_API_TOKEN = TEST_TOKEN;
    const started = await startNotificationsServer();
    baseUrl = started.baseUrl;
    server = started.server;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('returns the notifications payload for authorized requests', async () => {
    const response = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(2);
    expect(body[0]).toMatchObject({
      id: 'notif-001',
      title: 'Payout ready',
      read: false,
    });
  });

  it('rejects unauthorized requests', async () => {
    const response = await fetch(`${baseUrl}/notifications`);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: 'Unauthorized' });
  });

  it('returns 404 for an unknown route', async () => {
    const response = await fetch(`${baseUrl}/unknown`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });

    expect(response.status).toBe(404);
  });
});
