import { describe, it, expect } from 'vitest';
import { buildTotpUri } from './buildTotpUri';

// RFC 6238 / Google Authenticator Key URI Format:
// otpauth://totp/<label>?secret=<secret>&issuer=<issuer>&...
// label = "<issuer>:<accountLabel>" — both percent-encoded in the path segment.

const BASE_SECRET = 'JBSWY3DPEHPK3PXP';

describe('buildTotpUri', () => {
  it('produces an otpauth://totp/ URI', () => {
    const uri = buildTotpUri(BASE_SECRET);
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
  });

  it('uses the default label "Revora" when no accountLabel is supplied', () => {
    const uri = buildTotpUri(BASE_SECRET);
    // label in path should be "Revora:Revora" percent-encoded
    expect(uri).toContain(encodeURIComponent('Revora:Revora'));
  });

  it('embeds the secret in the query string', () => {
    const uri = buildTotpUri(BASE_SECRET);
    const url = new URL(uri);
    expect(url.searchParams.get('secret')).toBe(BASE_SECRET);
  });

  it('sets issuer=Revora in the query string', () => {
    const uri = buildTotpUri(BASE_SECRET, 'alice@example.com');
    const url = new URL(uri);
    expect(url.searchParams.get('issuer')).toBe('Revora');
  });

  it('sets algorithm=SHA1, digits=6, period=30', () => {
    const uri = buildTotpUri(BASE_SECRET, 'user@example.com');
    const url = new URL(uri);
    expect(url.searchParams.get('algorithm')).toBe('SHA1');
    expect(url.searchParams.get('digits')).toBe('6');
    expect(url.searchParams.get('period')).toBe('30');
  });

  // ─── Special characters in accountLabel ──────────────────────────────────────

  it('percent-encodes an email address in the label', () => {
    const email = 'alice@example.com';
    const uri = buildTotpUri(BASE_SECRET, email);
    // The label segment must be encoded — raw "@" must not appear in the path
    const pathSegment = uri.split('?')[0].replace('otpauth://totp/', '');
    expect(pathSegment).toBe(encodeURIComponent(`Revora:${email}`));
    expect(pathSegment).not.toContain('@');
  });

  it('percent-encodes spaces in the accountLabel', () => {
    const label = 'Alice Smith';
    const uri = buildTotpUri(BASE_SECRET, label);
    const pathSegment = uri.split('?')[0].replace('otpauth://totp/', '');
    expect(pathSegment).toBe(encodeURIComponent(`Revora:${label}`));
    expect(pathSegment).not.toContain(' ');
  });

  it('percent-encodes a colon in the accountLabel so it cannot split the label', () => {
    // A raw ":" would create a spurious issuer:accountLabel split
    const label = 'org:alice@example.com';
    const uri = buildTotpUri(BASE_SECRET, label);
    const pathSegment = uri.split('?')[0].replace('otpauth://totp/', '');
    expect(pathSegment).toBe(encodeURIComponent(`Revora:${label}`));
    // The only literal ":" that might remain would be inside the encoded string — none should
    expect(pathSegment).not.toContain(':');
  });

  it('percent-encodes a slash in the accountLabel', () => {
    const label = 'corp/alice';
    const uri = buildTotpUri(BASE_SECRET, label);
    const pathSegment = uri.split('?')[0].replace('otpauth://totp/', '');
    expect(pathSegment).toBe(encodeURIComponent(`Revora:${label}`));
    expect(pathSegment).not.toContain('/');
  });

  it('percent-encodes a plus sign in the accountLabel', () => {
    const label = 'alice+tags@example.com';
    const uri = buildTotpUri(BASE_SECRET, label);
    const pathSegment = uri.split('?')[0].replace('otpauth://totp/', '');
    expect(pathSegment).toBe(encodeURIComponent(`Revora:${label}`));
    expect(pathSegment).not.toContain('+');
  });

  it('percent-encodes a hash fragment character in the accountLabel', () => {
    const label = 'alice#001@example.com';
    const uri = buildTotpUri(BASE_SECRET, label);
    const pathSegment = uri.split('?')[0].replace('otpauth://totp/', '');
    expect(pathSegment).toBe(encodeURIComponent(`Revora:${label}`));
    expect(pathSegment).not.toContain('#');
  });

  it('percent-encodes a question mark in the accountLabel', () => {
    const label = 'who?@example.com';
    const uri = buildTotpUri(BASE_SECRET, label);
    const pathSegment = uri.split('?')[0].replace('otpauth://totp/', '');
    expect(pathSegment).toBe(encodeURIComponent(`Revora:${label}`));
    expect(pathSegment).not.toContain('?');
  });

  it('round-trips: decoding the label segment restores the original label', () => {
    const email = 'héllo+wörld@münchen.de';
    const uri = buildTotpUri(BASE_SECRET, email);
    const pathSegment = uri.split('?')[0].replace('otpauth://totp/', '');
    expect(decodeURIComponent(pathSegment)).toBe(`Revora:${email}`);
  });

  it('produces a parseable URL for a typical email address', () => {
    const email = 'user@revora.finance';
    const uri = buildTotpUri(BASE_SECRET, email);
    // new URL() throws if the URI is structurally invalid
    expect(() => new URL(uri)).not.toThrow();
    const url = new URL(uri);
    expect(url.protocol).toBe('otpauth:');
    expect(url.hostname).toBe('totp');
  });
});
