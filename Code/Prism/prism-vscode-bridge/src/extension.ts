import * as vscode from 'vscode';
import { WebSocket } from 'ws';

let ws: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let isDisposed = false;

const PRISM_WS_URL = 'ws://localhost:1437';
const RECONNECT_DELAY_MS = 3000;

export function activate(context: vscode.ExtensionContext) {
  isDisposed = false;
  connectPrism();

  const reconnectCmd = vscode.commands.registerCommand('prismBridge.reconnect', () => {
    vscode.window.showInformationMessage('Reconnecting to Prism...');
    disconnectPrism();
    connectPrism();
  });

  context.subscriptions.push(reconnectCmd);
}

export function deactivate() {
  isDisposed = true;
  disconnectPrism();
}

function connectPrism() {
  if (isDisposed || ws?.readyState === WebSocket.OPEN) {
    return;
  }

  try {
    ws = new WebSocket(PRISM_WS_URL);

    ws.on('open', () => {
      console.log('[Prism Bridge] Connected to', PRISM_WS_URL);
      vscode.window.showInformationMessage('🔮 Prism bridge connected');
    });

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.type === 'intent') {
          handleIntent(data);
        }
      } catch (err) {
        console.error('[Prism Bridge] Failed to parse message:', err);
      }
    });

    ws.on('close', () => {
      console.log('[Prism Bridge] Disconnected');
      ws = null;
      scheduleReconnect();
    });

    ws.on('error', (err) => {
      console.error('[Prism Bridge] Error:', err.message);
      // on('close') will fire after error, reconnection handled there
    });
  } catch (err) {
    console.error('[Prism Bridge] Failed to create WebSocket:', err);
    scheduleReconnect();
  }
}

function disconnectPrism() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    try {
      ws.terminate();
    } catch {
      // ignore
    }
    ws = null;
  }
}

function scheduleReconnect() {
  if (isDisposed || reconnectTimer) {
    return;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectPrism();
  }, RECONNECT_DELAY_MS);
}

async function handleIntent(data: { intentType: string; text: string; projectRoot: string; timestamp: string }) {
  const title = `🔮 Prism [${data.intentType}]`;
  const detail = data.text.length > 120 ? data.text.slice(0, 120) + '…' : data.text;

  const action = await vscode.window.showInformationMessage(
    `${title}: ${detail}`,
    '复制到剪贴板',
    '打开意图文件',
    '忽略'
  );

  if (action === '复制到剪贴板') {
    await vscode.env.clipboard.writeText(data.text);
    vscode.window.showInformationMessage('✅ Prism 意图已复制到剪贴板，按 Ctrl+V 粘贴');
  } else if (action === '打开意图文件') {
    const uri = vscode.Uri.file(`${data.projectRoot}/.ai/prism-intent.md`);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
  }
}
