import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./pages/Dashboard', () => ({ default: () => <div>Dashboard view</div> }));

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the login screen when no session token is stored', () => {
    render(<App />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  });

  it('renders the dashboard when a session token exists', () => {
    localStorage.setItem('brainos_token', 'test-token');
    render(<App />);
    expect(screen.getByText('Dashboard view')).toBeInTheDocument();
  });
});
