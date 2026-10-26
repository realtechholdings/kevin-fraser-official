/**
 * @hivemind/support/widget — drop-in panel for any web app.
 *
 * People choose Bug, Feature request, Change request, or Update, then Send.
 * Bugs can self-heal. The other kinds wait for a plan and approval in HiveMind.
 *
 * @example
 * ```ts
 * import { mountSupportWidget } from '@hivemind/support/widget';
 *
 * mountSupportWidget({
 *   hiveMindUrl: 'https://hivemynd.io',
 *   ingestApiKey: 'hmsk_…',
 * });
 * ```
 */

export interface SupportWidgetConfig {
  /** HiveMind cloud base URL, e.g. https://hivemynd.io */
  hiveMindUrl: string;
  /** Application key from Horizons → Support centre */
  ingestApiKey: string;
  releaseStage?: string;
  appVersion?: string;
}

export interface SupportWidgetHandle {
  open: () => void;
  close: () => void;
  destroy: () => void;
}

type RequestKind = 'bug' | 'feature' | 'change' | 'update';

const KINDS: { id: RequestKind; label: string }[] = [
  { id: 'bug', label: 'Bug' },
  { id: 'feature', label: 'Feature request' },
  { id: 'change', label: 'Change request' },
  { id: 'update', label: 'Update' },
];

const HOST_ID = 'hivemind-support-widget';

export async function submitSupportRequest(
  config: SupportWidgetConfig,
  input: {
    kind: RequestKind;
    title: string;
    body?: string;
    reporter?: { name?: string; email?: string };
  }
): Promise<{ ok: boolean; incidentId?: string; error?: string }> {
  const base = config.hiveMindUrl.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/api/support/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Support-Ingest-Key': config.ingestApiKey,
      },
      body: JSON.stringify({
        source: 'widget',
        kind: input.kind,
        title: input.title,
        body: input.body,
        errorClass: input.kind === 'bug' ? 'Bug report' : undefined,
        errorMessage: input.kind === 'bug' ? input.title : undefined,
        reporter: input.reporter,
        pageUrl: typeof location !== 'undefined' ? location.href : undefined,
        releaseStage: config.releaseStage,
        appVersion: config.appVersion,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        fingerprint:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, incidentId: json.incidentId, error: json.error };
  } catch {
    return { ok: false, error: 'Could not reach HiveMind' };
  }
}

export function mountSupportWidget(config: SupportWidgetConfig): SupportWidgetHandle {
  const existing = document.getElementById(HOST_ID);
  existing?.remove();

  const host = document.createElement('div');
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .launcher, .panel, button, input, textarea, select { font-family: ui-sans-serif, system-ui, sans-serif; }
      .launcher {
        position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
        border: 0; border-radius: 999px; padding: 12px 16px; cursor: pointer;
        background: #e11d48; color: white; font-size: 14px; font-weight: 600;
        box-shadow: 0 8px 24px rgba(0,0,0,.25);
      }
      .panel {
        position: fixed; right: 20px; bottom: 72px; z-index: 2147483000;
        width: min(380px, calc(100vw - 32px));
        background: #111; color: #f5f5f5; border: 1px solid #333; border-radius: 14px;
        box-shadow: 0 16px 48px rgba(0,0,0,.4); padding: 16px; display: none;
      }
      .panel.open { display: block; }
      h2 { margin: 0 0 4px; font-size: 16px; }
      p.hint { margin: 0 0 12px; color: #a3a3a3; font-size: 12px; line-height: 1.4; }
      label { display: block; margin: 10px 0 4px; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; color: #a3a3a3; }
      input, textarea, select {
        width: 100%; box-sizing: border-box; border-radius: 8px; border: 1px solid #333;
        background: #0a0a0a; color: #f5f5f5; padding: 8px 10px; font-size: 14px;
      }
      textarea { min-height: 88px; resize: vertical; }
      .row { display: flex; gap: 8px; }
      .row > * { flex: 1; }
      .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
      .send, .cancel {
        border-radius: 8px; padding: 8px 12px; font-size: 13px; cursor: pointer;
      }
      .send { border: 0; background: #e11d48; color: white; font-weight: 600; }
      .send:disabled { opacity: .6; cursor: default; }
      .cancel { border: 1px solid #333; background: transparent; color: #e5e5e5; }
      .status { min-height: 16px; margin-top: 8px; font-size: 12px; color: #a3a3a3; }
      .status.ok { color: #4ade80; }
      .status.err { color: #f87171; }
    </style>
    <button class="launcher" type="button">Support</button>
    <form class="panel">
      <h2>Send to support</h2>
      <p class="hint">Bugs are fixed automatically when auto-heal is on. Features, changes, and updates are planned first and wait for approval.</p>
      <label for="hm-kind">Type</label>
      <select id="hm-kind" name="kind">
        ${KINDS.map((kind) => `<option value="${kind.id}">${kind.label}</option>`).join('')}
      </select>
      <label for="hm-title">Title</label>
      <input id="hm-title" name="title" required maxlength="200" placeholder="Short summary" />
      <label for="hm-body">Details</label>
      <textarea id="hm-body" name="body" maxlength="8000" placeholder="What happened, or what you want changed"></textarea>
      <div class="row">
        <div>
          <label for="hm-name">Your name</label>
          <input id="hm-name" name="name" maxlength="120" />
        </div>
        <div>
          <label for="hm-email">Email</label>
          <input id="hm-email" name="email" type="email" maxlength="200" />
        </div>
      </div>
      <div class="actions">
        <button class="cancel" type="button">Cancel</button>
        <button class="send" type="submit">Send</button>
      </div>
      <div class="status" role="status"></div>
    </form>
  `;

  const panel = shadow.querySelector('.panel') as HTMLFormElement;
  const launcher = shadow.querySelector('.launcher') as HTMLButtonElement;
  const status = shadow.querySelector('.status') as HTMLDivElement;
  const send = shadow.querySelector('.send') as HTMLButtonElement;

  const open = () => panel.classList.add('open');
  const close = () => panel.classList.remove('open');

  launcher.addEventListener('click', () => {
    panel.classList.contains('open') ? close() : open();
  });
  shadow.querySelector('.cancel')?.addEventListener('click', close);

  panel.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(panel);
    const title = String(data.get('title') || '').trim();
    const body = String(data.get('body') || '').trim();
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const kind = String(data.get('kind') || 'bug') as RequestKind;
    if (!title) return;

    send.disabled = true;
    status.className = 'status';
    status.textContent = 'Sending…';

    void submitSupportRequest(config, {
      kind,
      title,
      body,
      reporter: name || email ? { name: name || undefined, email: email || undefined } : undefined,
    }).then((result) => {
      send.disabled = false;
      if (result.ok) {
        status.className = 'status ok';
        status.textContent = 'Sent. The support centre has it.';
        panel.reset();
      } else {
        status.className = 'status err';
        status.textContent = result.error || 'Send failed';
      }
    });
  });

  document.body.appendChild(host);

  return {
    open,
    close,
    destroy: () => host.remove(),
  };
}
