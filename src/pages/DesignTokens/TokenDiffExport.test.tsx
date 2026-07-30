import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { TokenDiffExport } from './TokenDiffExport';
import type { TokenGroup } from './tokens';
import '@testing-library/jest-dom';

describe('TokenDiffExport', () => {
  let originalClipboard: any;

  beforeAll(() => {
    originalClipboard = global.navigator.clipboard;
    Object.defineProperty(global.navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(global.navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
  });

  const prevTokens: TokenGroup[] = [
    {
      id: 'colors',
      label: 'Colors',
      type: 'color',
      tokens: [
        { name: 'Primary', variable: '--primary', value: '#old', description: 'desc' },
        { name: 'Removed', variable: '--removed', value: '#removeme', description: 'desc' },
        { name: 'Unchanged', variable: '--unchanged', value: '#same', description: 'desc' },
      ],
    },
  ];

  const currTokens: TokenGroup[] = [
    {
      id: 'colors',
      label: 'Colors',
      type: 'color',
      tokens: [
        { name: 'Primary', variable: '--primary', value: '#new', description: 'desc' },
        { name: 'Added', variable: '--added', value: '#addme', description: 'desc' },
        { name: 'Unchanged', variable: '--unchanged', value: '#same', description: 'desc' },
        { name: 'Binary Token', variable: '--binary', value: 'url(data:image/png;base64,iVBOR...)', description: 'Icon' },
      ],
    },
  ];

  it('renders nothing if not open', () => {
    const { container } = render(
      <TokenDiffExport isOpen={false} onClose={vi.fn()} previousTokens={prevTokens} currentTokens={currTokens} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders diff rows correctly', () => {
    render(
      <TokenDiffExport isOpen={true} onClose={vi.fn()} previousTokens={prevTokens} currentTokens={currTokens} />
    );

    // Title
    expect(screen.getByText('Review Changes & Export')).toBeInTheDocument();

    // Changed token
    expect(screen.getByText('--primary')).toBeInTheDocument();
    expect(screen.getByText('#old')).toBeInTheDocument();
    expect(screen.getByText('#new')).toBeInTheDocument();

    // Added token
    expect(screen.getByText('--added')).toBeInTheDocument();
    expect(screen.getByText('#addme')).toBeInTheDocument();

    // Removed token
    expect(screen.getByText('--removed')).toBeInTheDocument();
    expect(screen.getByText('#removeme')).toBeInTheDocument();

    // Binary token (also added)
    expect(screen.getByText('--binary')).toBeInTheDocument();

    // Unchanged token should not be shown
    expect(screen.queryByText('--unchanged')).not.toBeInTheDocument();
    
    // Status badges
    expect(screen.getByText('changed')).toBeInTheDocument();
    expect(screen.getAllByText('added').length).toBe(2); // --added and --binary
    expect(screen.getByText('removed')).toBeInTheDocument();
  });

  it('renders empty state when no changes', () => {
    render(
      <TokenDiffExport isOpen={true} onClose={vi.fn()} previousTokens={currTokens} currentTokens={currTokens} />
    );
    expect(screen.getByText('No changes detected.')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <TokenDiffExport isOpen={true} onClose={onClose} previousTokens={prevTokens} currentTokens={currTokens} />
    );
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <TokenDiffExport isOpen={true} onClose={onClose} previousTokens={prevTokens} currentTokens={currTokens} />
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('toggles export formats', () => {
    render(
      <TokenDiffExport isOpen={true} onClose={vi.fn()} previousTokens={prevTokens} currentTokens={currTokens} />
    );
    const pre = screen.getByLabelText(/Exported.*code/);
    
    // JSON is default
    expect(pre.textContent).toContain('"status": "changed"');

    // CSS
    fireEvent.click(screen.getByText('CSS Vars'));
    expect(pre.textContent).toContain('--primary: #new;');
    expect(pre.textContent).not.toContain('--removed:'); // removed tokens aren't in CSS

    // Sass
    fireEvent.click(screen.getByText('Sass'));
    expect(pre.textContent).toContain('$primary: #new;');
    expect(pre.textContent).toContain('$added: #addme;');
  });

  it('handles copy to clipboard', async () => {
    render(
      <TokenDiffExport isOpen={true} onClose={vi.fn()} previousTokens={prevTokens} currentTokens={currTokens} />
    );
    
    const copyBtn = screen.getByLabelText('Copy json to clipboard');
    fireEvent.click(copyBtn);
    
    expect(global.navigator.clipboard.writeText).toHaveBeenCalled();
    expect(await screen.findByText(/Copied!/)).toBeInTheDocument();
    
    // Wait for timeout
    await waitFor(() => {
      expect(screen.queryByText(/Copied!/)).not.toBeInTheDocument();
    }, { timeout: 2500 });
  });

  it('RTL support does not crash', () => {
    render(
      <div dir="rtl">
        <TokenDiffExport isOpen={true} onClose={vi.fn()} previousTokens={prevTokens} currentTokens={currTokens} />
      </div>
    );
    expect(screen.getByText('Review Changes & Export')).toBeInTheDocument();
  });
});
