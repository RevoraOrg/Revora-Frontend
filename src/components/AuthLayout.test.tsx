import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthLayout } from './AuthLayout';
import { describe, it, expect } from 'vitest';

describe('AuthLayout', () => {
  it('renders with title and children', () => {
    render(
      <AuthLayout title="Test Title">
        <p>Test Content</p>
      </AuthLayout>
    );
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders with subtitle when provided', () => {
    render(
      <AuthLayout title="Test Title" subtitle="Test Subtitle">
        <p>Test Content</p>
      </AuthLayout>
    );
    
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('renders with helperText when provided', () => {
    render(
      <AuthLayout title="Test Title" helperText="Test Helper">
        <p>Test Content</p>
      </AuthLayout>
    );
    
    expect(screen.getByText('Test Helper')).toBeInTheDocument();
  });

  it('has responsive container classes for mobile-first design', () => {
    const { container } = render(
      <AuthLayout title="Test Title">
        <p>Test Content</p>
      </AuthLayout>
    );
    
    const outerDiv = container.querySelector('.animate-fade-in');
    expect(outerDiv).toHaveClass('px-4', 'py-6', 'sm:p-6');
  });

  it('has proper card responsive padding', () => {
    const { container } = render(
      <AuthLayout title="Test Title">
        <p>Test Content</p>
      </AuthLayout>
    );
    
    const card = container.querySelector('.glass-card');
    expect(card).toHaveClass('px-5', 'py-8', 'sm:p-8', 'md:p-10');
  });

  it('has responsive heading size', () => {
    const { container } = render(
      <AuthLayout title="Test Title">
        <p>Test Content</p>
      </AuthLayout>
    );
    
    const heading = container.querySelector('h1');
    expect(heading).toHaveClass('text-2xl', 'sm:text-3xl');
  });

  it('meets minimum max-width for readability', () => {
    const { container } = render(
      <AuthLayout title="Test Title">
        <p>Test Content</p>
      </AuthLayout>
    );
    
    const card = container.querySelector('.max-w-\\[480px\\]');
    expect(card).toBeInTheDocument();
  });
});
