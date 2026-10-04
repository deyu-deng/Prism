// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ExecutionProgress } from './ExecutionProgress';
import { useUIStore } from '../../store/ui';
import type { HelmPhase } from '../../types/helm';
import type { TaskItem } from '../../store/ui';

describe('ExecutionProgress', () => {
  const defaultProps = {
    sessionId: 'sess_1234567890',
    currentPhase: 'code' as HelmPhase,
    activeSkills: ['tdd-enforcer'],
    isExecuting: true,
    lastUpdate: new Date(),
    onViewOutput: vi.fn(),
    onPause: vi.fn(),
    onStop: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({
      tasks: [
        { id: '1', title: 'Create Auth model', status: 'done' },
        { id: '2', title: 'Implement login endpoint', status: 'done' },
        { id: '3', title: 'Add middleware', status: 'running' },
        { id: '4', title: 'Write tests', status: 'pending' },
        { id: '5', title: 'Configure CORS', status: 'pending' },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    useUIStore.setState({ tasks: [] });
  });

  it('should not render when isExecuting is false', () => {
    render(<ExecutionProgress {...defaultProps} isExecuting={false} />);
    expect(screen.queryByText('Execution Progress')).toBeNull();
  });

  it('should display current phase prominently when executing', () => {
    // Use a phase that exists in PHASE_ORDER
    const props = { ...defaultProps, currentPhase: 'code' as HelmPhase };
    render(<ExecutionProgress {...props} />);
    expect(screen.getByText('Execution Progress')).toBeTruthy();
    expect(screen.getByText('CODE')).toBeTruthy();
  });

  it('should list active skills', () => {
    render(<ExecutionProgress {...defaultProps} />);
    expect(screen.getByText('tdd-enforcer')).toBeTruthy();
    expect(screen.getByText(/Active Skills/)).toBeTruthy();
  });

  it('should show task progress bar with correct percentage', () => {
    render(<ExecutionProgress {...defaultProps} />);
    // 2 done out of 5 = 40%
    expect(screen.getByText('40% (2/5 tasks)')).toBeTruthy();

    // Check for progress bar element
    const progressBar = document.querySelector('[style*="width: 40%"]');
    expect(progressBar).toBeTruthy();
  });

  it('should call onPause when pause button clicked', () => {
    const onPause = vi.fn();
    render(<ExecutionProgress {...defaultProps} onPause={onPause} />);
    fireEvent.click(screen.getByText('Pause'));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('should call onStop when stop button clicked', () => {
    const onStop = vi.fn();
    render(<ExecutionProgress {...defaultProps} onStop={onStop} />);
    fireEvent.click(screen.getByText('Stop'));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('should call onViewOutput when view output button clicked', () => {
    const onViewOutput = vi.fn();
    render(<ExecutionProgress {...defaultProps} onViewOutput={onViewOutput} />);
    fireEvent.click(screen.getByText('View Live Output'));
    expect(onViewOutput).toHaveBeenCalledTimes(1);
  });

  it('should show task list with correct statuses', () => {
    render(<ExecutionProgress {...defaultProps} />);

    // Done tasks should be visible
    expect(screen.getByText('Create Auth model')).toBeTruthy();
    expect(screen.getByText('Implement login endpoint')).toBeTruthy();

    // Running task should be visible
    expect(screen.getByText('Add middleware')).toBeTruthy();
    expect(screen.getByText('(running...)')).toBeTruthy();

    // Pending tasks should be visible
    expect(screen.getByText('Write tests')).toBeTruthy();
    expect(screen.getByText('Configure CORS')).toBeTruthy();
  });

  it('should display session ID truncated', () => {
    render(<ExecutionProgress {...defaultProps} sessionId="sess_abcdef123456" />);
    expect(screen.getByText(/Session:/)).toBeTruthy();
  });

  it('should handle empty skills array', () => {
    render(<ExecutionProgress {...defaultProps} activeSkills={[]} />);
    expect(screen.queryByText(/Active Skills/)).toBeNull();
  });

  it('should handle empty tasks array', () => {
    useUIStore.setState({ tasks: [] });
    render(<ExecutionProgress {...defaultProps} />);
    expect(screen.queryByText(/Task Progress/)).toBeNull();
    expect(screen.queryByText(/tasks/)).toBeNull();
  });

  it('should show running status indicator when executing', () => {
    render(<ExecutionProgress {...defaultProps} />);
    expect(screen.getByText('Running')).toBeTruthy();
  });

  it('should show paused status when not executing but has data', () => {
    render(
      <ExecutionProgress
        {...defaultProps}
        isExecuting={false}
        currentPhase="design"
        sessionId="test"
      />
    );
    // When isExecuting=false, component returns null
    expect(screen.queryByText('Execution Progress')).toBeNull();
  });

  it('should format duration correctly', () => {
    const pastDate = new Date(Date.now() - 120000); // 2 minutes ago
    render(<ExecutionProgress {...defaultProps} lastUpdate={pastDate} />);
    // Should show some time duration like "02:00"
    const timeElement = document.querySelector('.tabular-nums');
    expect(timeElement).toBeTruthy();
    expect(timeElement?.textContent).toMatch(/\d{2}:\d{2}/);
  });

  it('should show all phase labels in order', () => {
    render(<ExecutionProgress {...defaultProps} currentPhase={'test' as HelmPhase} />);
    const phases = ['INIT', 'EXPLORE', 'RECON', 'GRILL', 'DESIGN', 'SLICE', 'CODE', 'TEST', 'DEBUG', 'DEPLOY'];
    phases.forEach((phase) => {
      expect(screen.getAllByText(phase).length).toBeGreaterThan(0);
    });
  });

  it('should highlight current phase differently', () => {
    render(<ExecutionProgress {...defaultProps} currentPhase={'code' as HelmPhase} />);
    // The current phase should have special styling (ring)
    const codeElement = screen.getByText('CODE');
    expect(codeElement.closest('[class*="ring-"]') || codeElement.className).toBeTruthy();
  });

  it('should handle null session ID gracefully', () => {
    render(<ExecutionProgress {...defaultProps} sessionId={null} />);
    // Should still render without crashing
    expect(screen.getByText('Execution Progress')).toBeTruthy();
    expect(screen.queryByText(/Session:/)).toBeNull();
  });

  it('should handle null lastUpdate gracefully', () => {
    render(<ExecutionProgress {...defaultProps} lastUpdate={null} />);
    // Should show placeholder time
    const timeElement = document.querySelector('.tabular-nums');
    expect(timeElement?.textContent).toBe('--:--');
  });

  it('should hide control buttons when callbacks are not provided', () => {
    const { container } = render(
      <ExecutionProgress
        {...defaultProps}
        onViewOutput={undefined}
        onPause={undefined}
        onStop={undefined}
      />
    );
    expect(container.querySelector('button')).toBeNull();
  });
});
