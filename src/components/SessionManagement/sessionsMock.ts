import type { SessionDevice } from "./SessionManagement";

/**
 * Demo / default session data used when no `sessions` prop is supplied.
 * Extracted from the component so callers can import it as default data
 * without coupling tests to a module-level constant inside the component.
 */
export const MOCK_SESSIONS: SessionDevice[] = [
  {
    id: "sess-1",
    deviceName: "MacBook Pro 16",
    deviceType: "desktop",
    browser: "Chrome 125",
    os: "macOS 15.2",
    ipAddress: "192.168.1.42",
    location: "San Francisco, CA",
    lastActive: "2026-06-26T10:30:00Z",
    isCurrent: true,
  },
  {
    id: "sess-2",
    deviceName: "iPhone 16 Pro",
    deviceType: "mobile",
    browser: "Safari 18",
    os: "iOS 19.0",
    ipAddress: "203.0.113.45",
    location: "San Francisco, CA",
    lastActive: "2026-06-25T22:15:00Z",
    isCurrent: false,
  },
  {
    id: "sess-3",
    deviceName: "Windows Desktop",
    deviceType: "desktop",
    browser: "Firefox 128",
    os: "Windows 11",
    ipAddress: "198.51.100.88",
    location: "New York, NY",
    lastActive: "2026-06-24T14:45:00Z",
    isCurrent: false,
  },
  {
    id: "sess-4",
    deviceName: "iPad Air",
    deviceType: "tablet",
    browser: "Safari 18",
    os: "iPadOS 19.0",
    ipAddress: "203.0.113.102",
    location: "Los Angeles, CA",
    lastActive: "2026-06-20T09:00:00Z",
    isCurrent: false,
  },
];
