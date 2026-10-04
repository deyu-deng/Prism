// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserErrorModal } from './UserErrorModal';
import type { UserFacingError } from './UserErrorModal';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

const mockError: UserFacingError = {
  title: 'IDE Connection Failed',
  message: 'The required CLI tool is not installed.',
  severity: 'error',
  suggestions: [
    {
      text: 'Install the CLI tool',
      action: {
        type: 'install',
        label: 'View Installation Guide',
      },
    },
    {
      text: 'Check if already installed',
      action: {
        type: 'copy-command',
        payload: 'claude --version',
        label: 'Copy Command',
      },
    },
  ],
  technicalDetails: 'command not found: claude\nat Object.spawnInternal (child_process.js)',
  documentationUrl: 'https://github.com/prism/issues',
};

describe('UserErrorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render error title and message', () => {
    render(<UserErrorModal error={mockError} onClose={vi.fn()} />);
    expect(screen.getByText('IDE Connection Failed')).toBeTruthy();
    expect(screen.getByText('The required CLI tool is not installed.')).toBeTruthy();
  });

  it('should apply correct styling for error severity', () => {
    render(<UserErrorModal error={mockError} onClose={vi.fn()} />);
    expect(screen.getByText('ERROR')).toBeTruthy();
    expect(screen.getByText('ERROR').className).toContain('text-red-600');
  });

  it('should apply correct styling for warning severity', () => {
    const warningError = { ...mockError, severity: 'warning' as const, title: 'Warning Test' };
    render(<UserErrorModal error={warningError} onClose={vi.fn()} />);
    expect(screen.getByText('WARNING')).toBeTruthy();
    expect(screen.getByText('WARNING').className).toContain('text-yellow-600');
  });

  it('should apply correct styling for info severity', () => {
    const infoError = { ...mockError, severity: 'info' as const, title: 'Info Test' };
    render(<UserErrorModal error={infoError} onClose={vi.fn()} />);
    expect(screen.getByText('INFO')).toBeTruthy();
    expect(screen.getByText('INFO').className).toContain('text-blue-600');
  });

  it('should show suggestions with action buttons', () => {
    render(<UserErrorModal error={mockError} onClose={vi.fn()} />);
    expect(screen.getByText('Suggestions')).toBeTruthy();
    expect(screen.getByText('Install the CLI tool')).toBeTruthy();
    expect(screen.getByText('Check if already installed')).toBeTruthy();
    expect(screen.getByText('View Installation Guide')).toBeTruthy();
    expect(screen.getByText('Copy Command')).toBeTruthy();
  });

  it('should hide technical details by default', () => {
    render(<UserErrorModal error={mockError} onClose={vi.fn()} />);
    expect(screen.queryByText('command not found: claude')).toBeNull();
    expect(screen.getByText(/Technical Details/)).toBeTruthy();
  });

  it('should toggle technical details visibility on click', async () => {
    render(<UserErrorModal error={mockError} onClose={vi.fn()} />);
    const toggleBtn = screen.getByText(/Technical Details/);
    fireEvent.click(toggleBtn);
    // Text may be inside a pre element, use more flexible matcher
    expect(screen.getByText(/command not found/)).toBeTruthy();

    fireEvent.click(toggleBtn);
    expect(screen.queryByText(/command not found/)).toBeNull();
  });

  it('should copy command to clipboard when copy button clicked', async () => {
    const user = userEvent.setup();
    const mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, 'clipboard', { value: mockClipboard, writable: true });
    render(<UserErrorModal error={mockError} onClose={vi.fn()} />);
    const copyBtn = screen.getByText('Copy Command');
    await user.click(copyBtn);
    expect(mockClipboard.writeText).toHaveBeenCalledWith('claude --version');
    expect(screen.getByText('Copied!')).toBeTruthy();
  });

  it('should call onClose when dismiss button clicked', () => {
    const onClose = vi.fn();
    render(<UserErrorModal error={mockError} onClose={onClose} />);
    fireEvent.click(screen.getByText('Dismiss'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<UserErrorModal error={mockError} onClose={onClose} />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when X button clicked', () => {
    const onClose = vi.fn();
    render(<UserErrorModal error={mockError} onClose={onClose} />);
    const xButton = screen.getByRole('button', { name: '' }).closest('button');
    if (xButton) fireEvent.click(xButton);
    // X button is the one without text
    const buttons = screen.getAllByRole('button');
    const closeIconBtn = buttons.find((b) => b.querySelector('svg'));
    if (closeIconBtn) fireEvent.click(closeIconBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose on Escape key press', () => {
    const onClose = vi.fn();
    render(<UserErrorModal error={mockError} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose on Enter key for info severity', () => {
    const onClose = vi.fn();
    const infoError = { ...mockError, severity: 'info' as const };
    render(<UserErrorModal error={infoError} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should NOT call onClose on Enter key for error severity', () => {
    const onClose = vi.fn();
    render(<UserErrorModal error={mockError} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should show Report Issue link when documentationUrl provided', () => {
    render(<UserErrorModal error={mockError} onClose={vi.fn()} />);
    const link = screen.getByText('Report Issue');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('https://github.com/prism/issues');
  });

  it('should hide Report Issue link when no documentationUrl', () => {
    const noUrlError = { ...mockError, documentationUrl: undefined };
    render(<UserErrorModal error={noUrlError} onClose={vi.fn()} />);
    expect(screen.queryByText('Report Issue')).toBeNull();
  });

  it('should show "OK, I Understand" button for info severity', () => {
    const infoError = { ...mockError, severity: 'info' as const };
    render(<UserErrorModal error={infoError} onClose={vi.fn()} />);
    expect(screen.getByText('OK, I Understand')).toBeTruthy();
    expect(screen.queryByText('Dismiss')).toBeNull();
  });

  it('should handle empty suggestions array', () => {
    const noSuggestionsError = { ...mockError, suggestions: [] };
    render(<UserErrorModal error={noSuggestionsError} onClose={vi.fn()} />);
    expect(screen.queryByText('Suggestions')).toBeNull();
  });

  it('should handle missing technicalDetails', () => {
    const noDetailsError = { ...mockError, technicalDetails: undefined };
    render(<UserErrorModal error={noDetailsError} onClose={vi.fn()} />);
    expect(screen.queryByText(/Technical Details/)).toBeNull();
  });
});
