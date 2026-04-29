import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App Components Accessibility', () => {
  it('renders standard links and buttons correctly', () => {
    render(<App />);
    
    // Test that the 'Get Started' and 'Sign In' links render and have href attributes
    const getStartedLink = screen.getByText('Get Started');
    const signInLink = screen.getByText('Sign In');
    
    expect(getStartedLink).toBeInTheDocument();
    expect(getStartedLink.tagName.toLowerCase()).toBe('a');
    expect(signInLink).toBeInTheDocument();
    expect(signInLink.tagName.toLowerCase()).toBe('a');
  });

  it('renders the header correctly', () => {
    render(<App />);
    const heading = screen.getByRole('heading', { name: /Stellar RevenueShare – Revora/i });
    expect(heading).toBeInTheDocument();
  });
});
