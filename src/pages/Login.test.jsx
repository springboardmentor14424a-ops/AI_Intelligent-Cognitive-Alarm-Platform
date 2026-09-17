import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('renders the sign-in form by default', () => {
    render(<Login onAuthenticated={() => {}} />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByText('Welcome back.')).toBeInTheDocument();
  });

  it('stores the access token and calls onAuthenticated on successful login', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'abc123' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const onAuthenticated = vi.fn();

    render(<Login onAuthenticated={onAuthenticated} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Str0ngPass!' },
    });
    fireEvent.click(screen.getByText('ENTER BRAINOS'));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalled());
    expect(localStorage.getItem('brainos_token')).toBe('abc123');
  });

  it('shows an error notice when login fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Invalid credentials' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Login onAuthenticated={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByText('ENTER BRAINOS'));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('switches to the registration form', () => {
    render(<Login onAuthenticated={() => {}} />);
    fireEvent.click(screen.getByText('Create an account'));
    expect(screen.getByText('Start your signal.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
  });
});
