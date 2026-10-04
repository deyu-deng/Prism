export interface SessionConfig {
  intentType: string;
  text: string;
}

export interface IDEAdapter {
  id: string;
  name: string;
  detect?(): Promise<boolean>;
  dispatchIntent(intentType: string, text: string, projectRoot: string): Promise<void>;
  injectSystemPrompt?(projectRoot: string, prompt: string, mode: 'override' | 'append'): Promise<void>;
  openSession?(projectRoot: string, config: SessionConfig): Promise<string>;
  sendMessage?(projectRoot: string, sessionId: string, message: string): Promise<void>;
  watchOutput?(projectRoot: string, callback: (data: any) => void): void;
  stopWatchOutput?(): void;
  getProjectRoot?(projectRoot: string): Promise<string>;
  injectRules?(projectRoot: string): Promise<void>;
  answerPendingQuestion?(questionId: string, answer: any): void;
  dispose?(): void;
}
