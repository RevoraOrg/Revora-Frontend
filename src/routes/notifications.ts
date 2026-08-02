import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-001',
    title: 'Payout ready',
    message: 'Your latest revenue share payout is available.',
    read: false,
    createdAt: '2026-07-30T10:00:00.000Z',
  },
  {
    id: 'notif-002',
    title: 'Document reviewed',
    message: 'A new compliance review has been completed for your latest report.',
    read: true,
    createdAt: '2026-07-29T16:30:00.000Z',
  },
];

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function getExpectedToken() {
  return process.env.NOTIFICATIONS_API_TOKEN ?? 'dev-token';
}

export function createNotificationsHandler(req: IncomingMessage, res: ServerResponse) {
  const authHeader = req.headers.authorization;
  const expectedToken = getExpectedToken();

  if (authHeader !== `Bearer ${expectedToken}`) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const requestUrl = req.url ?? '/';
  const parsedUrl = new URL(requestUrl, 'http://127.0.0.1');

  if (parsedUrl.pathname !== '/notifications') {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  sendJson(res, 200, DEFAULT_NOTIFICATIONS);
}

export function createNotificationsServer() {
  return createServer((req, res) => createNotificationsHandler(req, res));
}

export async function startNotificationsServer(port = 0) {
  const server = createNotificationsServer();

  await new Promise<void>((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  const resolvedAddress = address as AddressInfo;

  return {
    server,
    baseUrl: `http://127.0.0.1:${resolvedAddress.port}`,
  };
}
