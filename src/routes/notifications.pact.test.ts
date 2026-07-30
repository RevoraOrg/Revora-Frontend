import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const { like, eachLike } = MatchersV3;

const provider = new PactV3({
  consumer: 'revora-frontend',
  provider: 'notifications-service',
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  dir: path.resolve(process.cwd(), 'pacts'),
  host: '127.0.0.1',
  port: 1234,
});

describe('Pact consumer contract for /notifications', () => {
  it('publishes a contract for GET /notifications', async () => {
    await provider
      .given('notifications are available')
      .uponReceiving('a request for notifications')
      .withRequest({
        method: 'GET',
        path: '/notifications',
        headers: {
          authorization: 'Bearer test-token',
        },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: eachLike({
          id: like('notif-001'),
          title: like('Payout ready'),
          message: like('Your latest revenue share payout is available.'),
          read: like(false),
          createdAt: like('2026-07-30T10:00:00.000Z'),
        }),
      });

    await provider.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/notifications`, {
        headers: { authorization: 'Bearer test-token' },
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual([
        expect.objectContaining({ id: 'notif-001', title: 'Payout ready' }),
      ]);
    });
  });
});
