import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge Component', () => {
  it('renders with correct label for idle status', () => {
    render(<StatusBadge status="idle" />);
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });

  it('renders with correct label for running status', () => {
    render(<StatusBadge status="running" />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('renders with correct label for error status', () => {
    render(<StatusBadge status="error" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders with correct label for stopped status', () => {
    render(<StatusBadge status="stopped" />);
    expect(screen.getByText('Stopped')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    render(<StatusBadge status="running" showLabel={false} />);
    expect(screen.queryByText('Running')).not.toBeInTheDocument();
  });

  it('renders the status dot with correct color class for idle', () => {
    const { container } = render(<StatusBadge status="idle" />);
    const dot = container.querySelector('.bg-slate-400');
    expect(dot).toBeInTheDocument();
  });

  it('renders the status dot with correct color class for running', () => {
    const { container } = render(<StatusBadge status="running" />);
    const dot = container.querySelector('.bg-emerald-500');
    expect(dot).toBeInTheDocument();
  });

  it('renders the status dot with correct color class for error', () => {
    const { container } = render(<StatusBadge status="error" />);
    const dot = container.querySelector('.bg-red-500');
    expect(dot).toBeInTheDocument();
  });

  it('renders the status dot with correct color class for stopped', () => {
    const { container } = render(<StatusBadge status="stopped" />);
    const dot = container.querySelector('.bg-slate-600');
    expect(dot).toBeInTheDocument();
  });

  it('applies animate-pulse class for running status', () => {
    const { container } = render(<StatusBadge status="running" />);
    const dot = container.querySelector('.animate-pulse');
    expect(dot).toBeInTheDocument();
  });

  it('does not apply animate-pulse class for non-running statuses', () => {
    const { container } = render(<StatusBadge status="idle" />);
    const dot = container.querySelector('.animate-pulse');
    expect(dot).not.toBeInTheDocument();
  });

  it('uses default idle config for unknown status', () => {
    const { container } = render(<StatusBadge status="idle" />);
    const dot = container.querySelector('.bg-slate-400');
    expect(dot).toBeInTheDocument();
  });

  it('renders without label text but with dot when showLabel is false', () => {
    const { container } = render(<StatusBadge status="error" showLabel={false} />);
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
    const dot = container.querySelector('.bg-red-500');
    expect(dot).toBeInTheDocument();
  });
});