// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IdeSelectionWizard } from './IdeSelectionWizard';
import { useUIStore } from '../../store/ui';
import type { PluginSummary } from '../../store/ui';

// Mock ipc-client
vi.mock('../../lib/ipc-client', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '../../lib/ipc-client';

const mockInvoke = vi.mocked(invoke);

const mockPlugins: PluginSummary[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    description: 'AI-powered CLI for Claude',
    status: 'active',
    available: true,
    experimental: false,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'AI-first code editor',
    status: 'registered',
    available: false,
    experimental: false,
    installationGuide: {
      title: 'Install Cursor',
      steps: [
        { title: 'Download Cursor', description: 'Visit cursor.com and download the installer' },
        { title: 'Install', description: 'Run the installer' },
        { title: 'Verify', description: 'cursor --version', command: 'cursor --version' },
      ],
    },
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    description: 'IDE by Codeium',
    status: 'error',
    available: false,
    experimental: false,
  },
];

describe('IdeSelectionWizard', () => {
  const defaultProps = {
    projectRoot: '/test/project',
    onSelect: vi.fn().mockResolvedValue({ success: true }),
    onSkip: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    // Reset store state
    useUIStore.setState({
      plugins: [],
      pluginsLoading: false,
      selectedPluginId: null,
      expandedGuideId: null,
      diagnosticResult: null,
      diagnosticLoading: false,
    });
  });

  it('should render wizard header on mount', () => {
    mockInvoke.mockResolvedValue({ success: true, data: [] });
    render(<IdeSelectionWizard {...defaultProps} />);
    expect(screen.getByText('Welcome to Prism - IDE Setup Wizard')).toBeTruthy();
    expect(screen.getByText(/Let's configure your development environment/)).toBeTruthy();
  });

  it('should call get_plugin_summary IPC on mount', async () => {
    mockInvoke.mockResolvedValue({ success: true, data: mockPlugins });
    render(<IdeSelectionWizard {...defaultProps} />);

    // Wait for the invoke to be called
    await new Promise((r) => setTimeout(r, 100));
    expect(mockInvoke).toHaveBeenCalledWith('get_plugin_summary');
  });

  it('should show loading state while fetching plugins', () => {
    // Don't resolve immediately - keep in loading state
    mockInvoke.mockImplementation(() => new Promise(() => {}));
    render(<IdeSelectionWizard {...defaultProps} />);
    expect(screen.getByText(/Scanning for IDEs.../)).toBeTruthy();
    expect(screen.getByText(/Loading available IDEs.../)).toBeTruthy();
  });

  it('should display plugin list after loading', async () => {
    mockInvoke.mockResolvedValue({ success: true, data: mockPlugins });
    render(<IdeSelectionWizard {...defaultProps} />);

    // Wait for data
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.getByText('Claude Code')).toBeTruthy();
    expect(screen.getByText('Cursor')).toBeTruthy();
    expect(screen.getByText('Windsurf')).toBeTruthy();
  });

  it('should show correct status badges for plugins', async () => {
    mockInvoke.mockResolvedValue({ success: true, data: mockPlugins });
    render(<IdeSelectionWizard {...defaultProps} />);

    await new Promise((r) => setTimeout(r, 100));
    expect(screen.getByText('Available')).toBeTruthy();
    expect(screen.getByText('Not Installed')).toBeTruthy();
  });

  it('should show Install Guide button for unavailable plugin with guide', async () => {
    mockInvoke.mockResolvedValue({ success: true, data: mockPlugins });
    render(<IdeSelectionWizard {...defaultProps} />);

    await new Promise((r) => setTimeout(r, 100));
    expect(screen.getByText('Install Guide')).toBeTruthy();
  });

  it('should expand installation guide when clicking Install Guide', async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValue({ success: true, data: mockPlugins });
    render(<IdeSelectionWizard {...defaultProps} />);

    await new Promise((r) => setTimeout(r, 100));
    const installGuideBtn = screen.getAllByText('Install Guide')[0];
    await user.click(installGuideBtn);
    // Should show expanded guide content (use getAllByText since there may be multiple)
    expect(screen.getAllByText('Download Cursor').length).toBeGreaterThan(1);
  });

  it('should call onSelect when clicking available plugin', async () => {
    const onSelect = vi.fn().mockResolvedValue({ success: true });
    mockInvoke.mockResolvedValue({ success: true, data: mockPlugins });

    render(<IdeSelectionWizard {...defaultProps} onSelect={onSelect} />);

    await new Promise((r) => setTimeout(r, 100));

    // Click on Claude Code (available plugin)
    const claudeCard = screen.getByText('Claude Code').closest('button');
    if (claudeCard) fireEvent.click(claudeCard);

    expect(onSelect).toHaveBeenCalledWith('claude-code');
  });

  it('should run diagnostics when button clicked', async () => {
    mockInvoke
      .mockResolvedValueOnce({ success: true, data: mockPlugins })
      .mockResolvedValueOnce({
        success: true,
        report: 'All systems OK',
        userSummary: 'Your environment is ready.',
      });

    render(<IdeSelectionWizard {...defaultProps} />);

    await new Promise((r) => setTimeout(r, 100));

    const diagBtn = screen.getByText('Run Diagnostics');
    fireEvent.click(diagBtn);

    // Wait for diagnostic result
    await new Promise((r) => setTimeout(r, 100));
    expect(mockInvoke).toHaveBeenCalledWith('run_diagnostics');
    expect(screen.getByText('Detection Results')).toBeTruthy();
  });

  it('should show empty state when no plugins detected', async () => {
    mockInvoke.mockResolvedValue({ success: true, data: [] });
    render(<IdeSelectionWizard {...defaultProps} />);

    await new Promise((r) => setTimeout(r, 100));
    expect(screen.getByText(/No IDE plugins detected/)).toBeTruthy();
  });

  it('should show Skip for Now button when onSkip provided', () => {
    mockInvoke.mockResolvedValue({ success: true, data: [] });
    render(<IdeSelectionWizard {...defaultProps} />);
    expect(screen.getByText('Skip for Now')).toBeTruthy();
  });

  it('should call onSkip when skip button clicked', () => {
    const onSkip = vi.fn();
    mockInvoke.mockResolvedValue({ success: true, data: [] });
    render(<IdeSelectionWizard {...defaultProps} onSkip={onSkip} />);

    fireEvent.click(screen.getByText('Skip for Now'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('should display project root in environment section', () => {
    mockInvoke.mockResolvedValue({ success: true, data: [] });
    render(<IdeSelectionWizard {...defaultProps} projectRoot="/my/project" />);
    // Project root may be split across elements, use flexible matcher
    expect(screen.getByText((content) => content.includes('/my/project'))).toBeTruthy();
  });

  it('should handle experimental badge for experimental plugins', async () => {
    const experimentalPlugin: PluginSummary[] = [
      {
        id: 'antigravity',
        name: 'Antigravity',
        description: 'Experimental IDE',
        status: 'registered',
        available: false,
        experimental: true,
      },
    ];
    mockInvoke.mockResolvedValue({ success: true, data: experimentalPlugin });
    render(<IdeSelectionWizard {...defaultProps} />);

    await new Promise((r) => setTimeout(r, 100));
    expect(screen.getByText('Experimental')).toBeTruthy();
  });

  it('should toggle generic file mode checkbox', async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValue({ success: true, data: [] });
    render(<IdeSelectionWizard {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    await user.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });
});
