import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AppShell from './AppShell';

describe('AppShell', () => {
  test('renders children content', () => {
    render(
      <AppShell>
        <div>Test Content</div>
      </AppShell>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('displays logo and navigation items', () => {
    render(<AppShell><div>Content</div></AppShell>);
    
    expect(screen.getByText('Revora')).toBeInTheDocument();
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Management')).toBeInTheDocument();
  });

  test('mobile menu opens and closes', () => {
    // Mock mobile viewport
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));
    
    render(<AppShell><div>Content</div></AppShell>);
    
    const menuButton = screen.getByLabelText('Menu');
    fireEvent.click(menuButton);
    
    expect(screen.getByLabelText('Mobile navigation')).toBeInTheDocument();
    
    fireEvent.click(menuButton);
    expect(screen.queryByLabelText('Mobile navigation')).not.toBeVisible();
  });
});