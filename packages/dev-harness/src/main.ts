interface CommandEnvelope {
  kind: 'command';
  id: string;
  name: string;
  payload: unknown;
}

interface EventEnvelope {
  kind: 'event';
  id?: string;
  name: string;
  payload: unknown;
}

const RUNTIME_ORIGIN = 'http://localhost:5173';

const iframe = document.getElementById('runtime') as HTMLIFrameElement;
const log = document.getElementById('log') as HTMLDivElement;

let seq = 0;
function nextId(): string {
  seq += 1;
  return `cmd-${seq}`;
}

function appendLog(direction: '→' | '←', label: string, payload: unknown): void {
  const line = document.createElement('div');
  const time = new Date().toISOString().slice(11, 23);
  line.textContent = `[${time}] ${direction} ${label} ${JSON.stringify(payload)}`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function sendCommand(name: string, payload: unknown): void {
  const command: CommandEnvelope = { kind: 'command', id: nextId(), name, payload };
  appendLog('→', name, payload);
  iframe.contentWindow?.postMessage(command, RUNTIME_ORIGIN);
}

window.addEventListener('message', (event) => {
  if (event.source !== iframe.contentWindow) return;
  const data = event.data as EventEnvelope;
  if (data?.kind !== 'event') return;
  appendLog('←', data.name, data.payload);
});

const actions: Record<string, () => void> = {
  moveTokyo: () =>
    sendCommand('moveCamera', { position: { latitude: 35.681236, longitude: 139.767125 }, zoom: 12 }),
  animateSF: () =>
    sendCommand('animateCamera', {
      position: { position: { latitude: 37.7749, longitude: -122.4194 }, zoom: 13 },
      options: { durationMs: 1200 },
    }),
  addMarkers: () =>
    sendCommand('compositionMarkers', {
      markers: [
        { id: 'a', position: { latitude: 35.681236, longitude: 139.767125 }, icon: { type: 'colorDefault', fillColor: '#e53935', label: 'A' } },
        { id: 'b', position: { latitude: 35.6895, longitude: 139.6917 }, icon: { type: 'colorDefault', fillColor: '#1e88e5', label: 'B' } },
        { id: 'c', position: { latitude: 35.6586, longitude: 139.7454 }, icon: { type: 'colorDefault', fillColor: '#43a047', label: 'C' } },
      ],
    }),
  clearOverlays: () => sendCommand('clearOverlays', {}),
  startPulse: () =>
    sendCommand('upsertExtension', {
      id: 'demo-pulse',
      type: 'pulseCircle',
      payload: { latitude: 35.681236, longitude: 139.767125, color: '#8e24aa', maxRadiusMeters: 800 },
    }),
  stopPulse: () => sendCommand('removeExtension', { id: 'demo-pulse' }),
};

document.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach((button) => {
  const action = button.dataset.action!;
  button.addEventListener('click', () => actions[action]?.());
});
