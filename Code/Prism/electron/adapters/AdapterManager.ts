import { IDEAdapter } from './types';
import { GenericFileAdapter } from './GenericFileAdapter';
import { AntigravityAdapter } from './AntigravityAdapter';
import { ClaudeCodeAdapter } from './ClaudeCodeAdapter';
import { ClaudeTerminalAdapter } from './ClaudeTerminalAdapter';
import { CursorAdapter } from './cursor';
import { WindsurfAdapter } from './windsurf';

export class AdapterManager {
  private adapters: Map<string, IDEAdapter> = new Map();

  constructor() {
    (global as any).prismAdapterManager = this;
    // Default fallback adapter for all IDEs
    this.registerAdapter(new GenericFileAdapter());
    this.registerAdapter(new AntigravityAdapter());
    this.registerAdapter(new ClaudeCodeAdapter());
    this.registerAdapter(new ClaudeTerminalAdapter());
    this.registerAdapter(new CursorAdapter());
    this.registerAdapter(new WindsurfAdapter());
  }

  registerAdapter(adapter: IDEAdapter) {
    this.adapters.set(adapter.id, adapter);
  }

  getAdapter(id: string): IDEAdapter | undefined {
    return this.adapters.get(id);
  }

  getAllAdapters(): IDEAdapter[] {
    return Array.from(this.adapters.values());
  }
}
