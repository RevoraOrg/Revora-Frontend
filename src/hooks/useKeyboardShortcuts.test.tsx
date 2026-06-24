import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

function TestHarness() {
  const { isOpen, isMac, open, close } = useKeyboardShortcuts();
  return (
    <div>
      <span data-testid="state">{isOpen ? 'open' : 'closed'}</span>
      <span data-testid="platform">{isMac ? 'mac' : 'not-mac'}</span>
      <button data-testid="open-btn" onClick={open}>
        Open
      </button>
      <button data-testid="close-btn" onClick={close}>
        Close
      </button>
      <input data-testid="input" type="text" />
      <div data-testid="contenteditable" contentEditable />
    </div>
  );
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('starts closed', () => {
    render(<TestHarness />);
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });

  it('opens on ? keypress', () => {
    render(<TestHarness />);
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByTestId('state')).toHaveTextContent('open');
  });

  it('closes on second ? keypress', () => {
    render(<TestHarness />);
    fireEvent.keyDown(window, { key: '?' });
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });

  it('opens on Ctrl+/', () => {
    render(<TestHarness />);
    fireEvent.keyDown(window, { key: '/', ctrlKey: true });
    expect(screen.getByTestId('state')).toHaveTextContent('open');
  });

  it('opens on Meta+/', () => {
    render(<TestHarness />);
    fireEvent.keyDown(window, { key: '/', metaKey: true });
    expect(screen.getByTestId('state')).toHaveTextContent('open');
  });

  it('closes on Escape when open', () => {
    render(<TestHarness />);
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByTestId('state')).toHaveTextContent('open');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });

  it('does nothing on Escape when closed', () => {
    render(<TestHarness />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });

  it('does not trigger ? when focus is in input', () => {
    render(<TestHarness />);
    const input = screen.getByTestId('input');
    fireEvent.keyDown(input, { key: '?' });
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });

  it('does not trigger Ctrl+/ when focus is in input', () => {
    render(<TestHarness />);
    const input = screen.getByTestId('input');
    fireEvent.keyDown(input, { key: '/', ctrlKey: true });
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });

  it('does not trigger Escape when focus is in input and overlay is open', () => {
    render(<TestHarness />);
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByTestId('state')).toHaveTextContent('open');

    const input = screen.getByTestId('input');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.getByTestId('state')).toHaveTextContent('open');
  });

  it('does not trigger Alt+/', () => {
    render(<TestHarness />);
    fireEvent.keyDown(window, { key: '/', altKey: true });
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });

  it('does not trigger bare / without modifier', () => {
    render(<TestHarness />);
    fireEvent.keyDown(window, { key: '/' });
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });

  it('removes event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<TestHarness />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('detects Mac platform correctly', () => {
    const originalPlatform = navigator.platform;
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      configurable: true,
    });

    const { unmount } = render(<TestHarness />);
    expect(screen.getByTestId('platform')).toHaveTextContent('mac');

    Object.defineProperty(navigator, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
    unmount();
  });

  it('detects non-Mac platform correctly', () => {
    const originalPlatform = navigator.platform;
    Object.defineProperty(navigator, 'platform', {
      value: 'Linux x86_64',
      configurable: true,
    });

    const { unmount } = render(<TestHarness />);
    expect(screen.getByTestId('platform')).toHaveTextContent('not-mac');

    Object.defineProperty(navigator, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
    unmount();
  });

  it('open function sets isOpen to true', () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByTestId('open-btn'));
    expect(screen.getByTestId('state')).toHaveTextContent('open');
  });

  it('close function sets isOpen to false', () => {
    render(<TestHarness />);
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByTestId('state')).toHaveTextContent('open');

    fireEvent.click(screen.getByTestId('close-btn'));
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });

  it('open is idempotent', () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByTestId('open-btn'));
    fireEvent.click(screen.getByTestId('open-btn'));
    expect(screen.getByTestId('state')).toHaveTextContent('open');
  });

  it('close is idempotent', () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByTestId('close-btn'));
    fireEvent.click(screen.getByTestId('close-btn'));
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });
});
