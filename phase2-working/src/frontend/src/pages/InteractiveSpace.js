// Interactive Space - Rich Cognitive Chat with classification chips
import api from '../lib/api.js';
import { toast } from '../lib/toast.js';

export function InteractiveSpace() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-container" style="max-width:900px;">
      <div class="section-header card-reveal">
        <span class="dot" style="width:12px;height:12px;border-radius:50%;background:var(--md-sys-color-primary);box-shadow:0 0 10px rgba(204,255,0,0.4);"></span>
        <h1 style="font:var(--md-sys-typescale-headline-medium);">ReMentally</h1>
      </div>
      <p class="card-reveal" style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin-bottom:1rem;">
        Process thoughts, ask questions, or capture commitments. Every message is classified for half-life, urgency, and commitment detection.
      </p>

      <!-- Status bar -->
      <div id="status-bar" class="card-reveal" style="display:flex;gap:1rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap;">
        <span id="runs-info" style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);"><span class="tg-skeleton" style="display:inline-block;width:9rem;vertical-align:middle;"></span></span>
      </div>

      <!-- Chat area -->
      <div id="chat-area" class="surface-card card-reveal" style="padding:1rem;min-height:400px;max-height:600px;overflow-y:auto;margin-bottom:1rem;">
        <div style="text-align:center;padding:2rem;color:var(--md-sys-color-outline);">
          <p style="font:var(--md-sys-typescale-display-small);opacity:0.2;margin-bottom:0.5rem;">CHAT</p>
          <p style="margin-top:0.5rem;">Start a conversation. Your thoughts will be classified and stored in memory.</p>
        </div>
      </div>

      <!-- Input form -->
      <form id="chat-form" class="card-reveal" style="display:flex;gap:0.75rem;align-items:flex-end;">
        <div style="flex:1;display:flex;flex-direction:column;gap:0.5rem;">
          <div id="attachment-preview" style="display:none;background:var(--md-sys-color-surface-container-high);padding:0.5rem 1rem;border-radius:var(--md-sys-shape-small);font-size:12px;display:flex;align-items:center;justify-content:space-between;border:1px solid var(--md-sys-color-outline-variant);">
            <span id="attachment-name" style="color:var(--md-sys-color-primary);"></span>
            <button type="button" class="btn-m3 btn-text" id="remove-attach-btn" style="padding:0.2rem 0.5rem;min-width:auto;height:auto;font-size:11px;color:var(--md-sys-color-error);">REMOVE</button>
          </div>
          <textarea id="chat-input" class="input-m3" rows="2" placeholder="Type a thought, question, or commitment..." aria-label="Chat message input" style="resize:vertical;min-height:48px;"></textarea>
          <!-- Inline Quality Score + Sentiment -->
          <div id="quality-indicator" style="display:none;align-items:center;gap:0.5rem;padding:0.375rem 0.625rem;border-radius:6px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
            <div id="quality-grade" style="width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font:var(--md-sys-typescale-label-small);"></div>
            <div id="quality-tip" style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);flex:1;"></div>
            <div id="sentiment-indicator" style="display:none;font:var(--md-sys-typescale-label-small);padding:0.15rem 0.4rem;border-radius:4px;"></div>
          </div>
        </div>
        <button type="button" class="btn-m3 btn-tonal" id="dictate-btn" style="height:48px;width:48px;padding:0;display:grid;place-items:center;" title="Voice Dictation" aria-label="Start voice dictation">
          <span class="material-symbols-rounded">mic</span>
        </button>
        <button type="button" class="btn-m3 btn-tonal" id="attach-btn" style="height:48px;width:48px;padding:0;display:grid;place-items:center;" title="Attach File (Premium <1MB)" aria-label="Attach file">
          <span class="material-symbols-rounded">attach_file</span>
        </button>
        <button type="submit" class="btn-m3 btn-filled" id="send-btn" style="height:48px;" aria-label="Send message">
          <span style="font:var(--md-sys-typescale-label-large);">SEND</span>
        </button>
      </form>
    </div>`;

  const form = container.querySelector('#chat-form');
  const input = container.querySelector('#chat-input');
  const chatArea = container.querySelector('#chat-area');
  const runsInfo = container.querySelector('#runs-info');
  const dictateBtn = container.querySelector('#dictate-btn');
  const attachBtn = container.querySelector('#attach-btn');
  const attachPreview = container.querySelector('#attachment-preview');
  const attachName = container.querySelector('#attachment-name');
  const removeAttachBtn = container.querySelector('#remove-attach-btn');
  let firstMessage = true;
  let attachedFile = null;

  // Load conversation history + run status
  loadHistory(chatArea, runsInfo);

  // Voice Dictation
  let recognition = null;
  let isRecording = false;
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isRecording = true;
      dictateBtn.style.background = 'var(--md-sys-color-error)';
      dictateBtn.style.color = '#fff';
      dictateBtn.querySelector('span').textContent = 'mic_off';
      input.placeholder = 'Listening...';
    };

    recognition.onend = () => {
      isRecording = false;
      dictateBtn.style.background = '';
      dictateBtn.style.color = '';
      dictateBtn.querySelector('span').textContent = 'mic';
      input.placeholder = 'Type a thought, question, or commitment...';
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      input.value += (input.value ? ' ' : '') + text;
    };

    recognition.onerror = (e) => {
      console.error('Dictation error:', e);
      isRecording = false;
      dictateBtn.style.background = '';
      dictateBtn.style.color = '';
      dictateBtn.querySelector('span').textContent = 'mic';
    };
  }

  dictateBtn.addEventListener('click', () => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      toast.show('Speech recognition is not supported in this browser.', 'error');
      return;
    }
    if (isRecording) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });

  // Premium File Attachments
  attachBtn.addEventListener('click', () => {
    const currentUser = api.getUser();
    if (!currentUser || currentUser.tier === 'free') {
      toast.show('Document and file attachments are exclusive to Explorer Plus tier users.', 'error');
      return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,.pdf,image/*';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 1024 * 1024) {
        toast.show('File size exceeds the 1MB safety limit.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        attachedFile = {
          name: file.name,
          type: file.type,
          size: file.size,
          content: reader.result
        };
        attachName.textContent = `Attached: ${file.name} (${Math.round(file.size/1024)} KB)`;
        attachPreview.style.display = 'flex';
      };

      if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file); // Images/PDFs base64 encoded
      }
    };
    fileInput.click();
  });

  removeAttachBtn.addEventListener('click', () => {
    attachedFile = null;
    attachPreview.style.display = 'none';
  });

  // ── Inline Thought Quality Scoring (debounced) ───────────────────────
  const qualityIndicator = container.querySelector('#quality-indicator');
  const qualityGrade = container.querySelector('#quality-grade');
  const qualityTip = container.querySelector('#quality-tip');
  let qualityDebounce = null;
  const gradeColors = { A: 'var(--color-success)', B: 'var(--md-sys-color-primary)', C: 'var(--color-analytical)', D: 'var(--color-urgency)', F: 'var(--md-sys-color-error)' };

  input.addEventListener('input', () => {
    clearTimeout(qualityDebounce);
    const text = input.value.trim();
    if (text.length < 5) {
      qualityIndicator.style.display = 'none';
      return;
    }
    qualityDebounce = setTimeout(async () => {
      try {
        const [qualityResult, sentimentResult] = await Promise.all([
          api.post('/smart/score', { content: text }),
          api.post('/smart/sentiment', { content: text }).catch(() => null)
        ]);
        const s = qualityResult.score;
        if (s) {
          const color = gradeColors[s.grade] || 'var(--md-sys-color-outline)';
          qualityIndicator.style.display = 'flex';
          qualityGrade.textContent = s.grade;
          qualityGrade.style.color = color;
          qualityGrade.style.border = `1px solid ${color}33`;
          qualityGrade.style.background = `${color}11`;
          qualityTip.textContent = s.tips?.[0]?.message || s.grade + '/100';
          qualityTip.style.color = s.grade === 'A' || s.grade === 'B' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)';
        }
        // Show sentiment if available
        const sentEl = container.querySelector('#sentiment-indicator');
        const analysis = sentimentResult?.analysis;
        if (analysis && sentEl) {
          const sentColors = { positive: 'var(--color-success)', neutral: 'var(--md-sys-color-outline)', negative: 'var(--md-sys-color-error)' };
          sentEl.style.display = 'inline-block';
          sentEl.style.color = sentColors[analysis.label] || 'var(--md-sys-color-outline)';
          sentEl.style.background = (sentColors[analysis.label] || 'var(--md-sys-color-outline)') + '15';
          sentEl.textContent = analysis.emotional_state ? analysis.emotional_state.replace(/_/g, ' ') : analysis.label;
        }
      } catch { /* ignore scoring errors */ }
    }, 500);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (!msg && !attachedFile) return;

    if (firstMessage) { chatArea.innerHTML = ''; firstMessage = false; }

    const displayMsg = msg + (attachedFile ? `\n[File: ${attachedFile.name}]` : '');

    // User bubble
    chatArea.innerHTML += `
      <div style="display:flex;justify-content:flex-end;margin-bottom:0.75rem;animation:slide-up 300ms ease forwards;">
        <div style="max-width:80%;padding:0.75rem 1rem;border-radius:var(--md-sys-shape-large) var(--md-sys-shape-large) var(--md-sys-shape-extra-small) var(--md-sys-shape-large);background:var(--md-sys-color-primary-container);color:var(--md-sys-color-on-primary-container);font:var(--md-sys-typescale-body-medium);white-space:pre-wrap;">
          ${escHtml(displayMsg)}
        </div>
      </div>`;

    input.value = '';
    const btn = container.querySelector('#send-btn');
    btn.disabled = true;

    // Typing indicator
    const loadingId = 'loading-' + Date.now();
    chatArea.innerHTML += `
      <div id="${loadingId}" style="display:flex;margin-bottom:0.75rem;">
        <div style="padding:0.75rem 1rem;border-radius:var(--md-sys-shape-large);background:var(--md-sys-color-surface-container-high);">
          <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>
      </div>`;
    chatArea.scrollTop = chatArea.scrollHeight;

    // Fetch local memories from IndexedDB to inject into context
    let localMemories = [];
    try {
      const { searchLocalMemories } = await import('../lib/indexedDb.js');
      localMemories = await searchLocalMemories(msg, 5);
    } catch (e) {
      console.warn('Could not query local memories:', e);
    }

    const payload = { message: msg || `Uploaded file: ${attachedFile.name}`, localMemories, attachment: attachedFile };

    // Clear attachment
    attachedFile = null;
    attachPreview.style.display = 'none';

    // Try streaming first, fall back to non-streaming
    let result;
    let streamBuffer = '';
    let streamingWorked = false;
    let responseEl = null;

    try {
      const token = localStorage.getItem('rementally_token');
      const streamRes = await fetch('/api/process/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (streamRes.ok && streamRes.headers.get('content-type')?.includes('text/event-stream')) {
        streamingWorked = true;
        // Create response bubble immediately
        const bubbleId = 'stream-bubble-' + Date.now();
        chatArea.innerHTML += `
          <div style="display:flex;margin-bottom:0.75rem;animation:slide-up 300ms ease forwards;">
            <div style="max-width:85%;">
              <div id="${bubbleId}" style="padding:0.75rem 1rem;border-radius:var(--md-sys-shape-large) var(--md-sys-shape-large) var(--md-sys-shape-large) var(--md-sys-shape-extra-small);background:var(--md-sys-color-surface-container-high);font:var(--md-sys-typescale-body-medium);min-height:1.5rem;"></div>
            </div>
          </div>`;
        responseEl = document.getElementById(bubbleId);
        chatArea.scrollTop = chatArea.scrollHeight;

        // Read SSE stream
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.type === 'chunk' && evt.content) {
                streamBuffer += evt.content;
                if (responseEl) responseEl.innerHTML = formatResponse(streamBuffer);
                chatArea.scrollTop = chatArea.scrollHeight;
              }
              if (evt.type === 'done') {
                streamBuffer = evt.fullResponse || streamBuffer;
              }
            } catch {}
          }
        }
      }
    } catch {
      // Streaming not supported or failed
    }

    // Fall back to non-streaming if streaming didn't work
    if (!streamingWorked) {
      result = await api.post('/process/message', payload);
    }

    document.getElementById(loadingId)?.remove();
    btn.disabled = false;

    const runsRemaining = result?.runsRemaining;
    const latency = result?.latency;
    if (runsRemaining != null) {
      runsInfo.textContent = `${runsRemaining} runs remaining · ${latency || 0}ms`;
    }

    if (result?.error) {
      if (responseEl) responseEl.remove();
      let errorHtml = `<div style="padding:0.75rem;border-radius:var(--md-sys-shape-small);background:rgba(255,138,158,.1);color:var(--md-sys-color-error);margin-bottom:0.75rem;">${escHtml(result.error)}`;
      if (result.upgradeUrl) {
        errorHtml += `<div style="margin-top:0.75rem;"><button class="btn-m3 btn-filled" onclick="showPage('credits')" style="font-size:12px;height:32px;">ADD API KEY OR GET CREDITS</button></div>`;
      }
      errorHtml += `</div>`;
      chatArea.innerHTML += errorHtml;
    } else if (streamingWorked) {
      // Streaming response already rendered
      const classStrip = result ? buildClassificationStrip(result) : '';
      if (responseEl && classStrip) responseEl.parentElement.parentElement.innerHTML += classStrip;
    } else {
      // AI response bubble (non-streaming)
      const classStrip = buildClassificationStrip(result);
      const sourcesHtml = result.sources?.length > 0 ? `
        <div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06);">
          <div class="mono-label" style="font-size:9px;color:var(--md-sys-color-outline);text-transform:uppercase;margin-bottom:4px;">SOURCES</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            ${result.sources.slice(0, 4).map(s => `<a href="${escHtml(s.url || '#')}" target="_blank" rel="noopener" style="font:10px/1.3 system-ui;color:var(--md-sys-color-primary);text-decoration:none;background:var(--md-sys-color-primary-container);padding:2px 8px;border-radius:var(--md-sys-shape-full);border:1px solid rgba(204,255,0,0.15);">${escHtml(s.title || s.url || 'source').slice(0, 40)}</a>`).join('')}
          </div>
        </div>` : '';
      chatArea.innerHTML += `
        <div style="display:flex;margin-bottom:0.75rem;animation:slide-up 300ms ease forwards;">
          <div style="max-width:85%;">
            <div style="padding:0.75rem 1rem;border-radius:var(--md-sys-shape-large) var(--md-sys-shape-large) var(--md-sys-shape-large) var(--md-sys-shape-extra-small);background:var(--md-sys-color-surface-container-high);font:var(--md-sys-typescale-body-medium);">
              ${formatResponse(result.response)}
              ${sourcesHtml}
            </div>
            ${classStrip}
          </div>
        </div>`;

      // Clarification prompt card
      if (result.unanchored?.is_unanchored) {
        chatArea.innerHTML += `
          <div style="margin-bottom:0.75rem;animation:slide-up 300ms ease forwards;">
            <div class="surface-card" style="padding:1rem;border-left:3px solid var(--md-sys-color-tertiary);max-width:400px;">
              <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
                <span class="mono-label" style="color:var(--md-sys-color-tertiary);font-size:10px;">ANCHOR</span>
                <span style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-tertiary);">Needs anchoring</span>
              </div>
              <p style="font:var(--md-sys-typescale-body-medium);margin:0 0 0.5rem;">${escHtml(result.unanchored.clarification_question)}</p>
              <div style="display:flex;gap:0.5rem;">
                <input type="text" class="input-m3" placeholder="Your answer..." style="flex:1;padding:0.5rem 0.75rem;font-size:14px;" id="clarify-input-${Date.now()}">
                <button class="btn-m3 btn-tonal" style="height:36px;font-size:12px;" onclick="sendClarification(this)">Reply</button>
              </div>
            </div>
          </div>`;
      }

      // Witness prompt card
      if (result.commitment?.ask_for_witness) {
        chatArea.innerHTML += `
          <div style="margin-bottom:0.75rem;animation:slide-up 300ms ease forwards;">
            <div class="surface-card" style="padding:1rem;border-left:3px solid var(--md-sys-color-secondary);max-width:400px;">
              <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
                <span class="mono-label" style="color:var(--md-sys-color-secondary);font-size:10px;">WITNESS</span>
                <span style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-secondary);">Commitment detected</span>
              </div>
              <p style="font:var(--md-sys-typescale-body-medium);margin:0 0 0.5rem;">${escHtml(result.commitment.witness_ask_message)}</p>
              <div style="display:flex;gap:0.5rem;">
                <input type="text" class="input-m3" placeholder="Witness name or email..." style="flex:1;padding:0.5rem 0.75rem;font-size:14px;">
                <button class="btn-m3 btn-tonal" style="height:36px;font-size:12px;">Add Witness</button>
              </div>
            </div>
          </div>`;
      }
    }
    chatArea.scrollTop = chatArea.scrollHeight;
  });

  // Enter to send (shift+enter for newline)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.dispatchEvent(new Event('submit')); }
  });

  return container;
}

async function loadHistory(chatArea, runsInfo) {
  const [memData, billData] = await Promise.all([
    api.get('/memory?limit=10'),
    api.get('/billing/status'),
  ]);

  if (billData.dailyRunsRemaining != null) {
    runsInfo.textContent = `${billData.dailyRunsRemaining} runs remaining · ${billData.tier || 'free'} tier`;
  }

  if (memData.memories?.length > 0) {
    chatArea.innerHTML = '';
    memData.memories.reverse().forEach(m => {
      const isUser = true; // All stored memories are user messages
      chatArea.innerHTML += `
        <div style="display:flex;justify-content:flex-end;margin-bottom:0.5rem;">
          <div style="max-width:75%;padding:0.5rem 0.75rem;border-radius:var(--md-sys-shape-large) var(--md-sys-shape-large) var(--md-sys-shape-extra-small) var(--md-sys-shape-large);background:var(--md-sys-color-primary-container);color:var(--md-sys-color-on-primary-container);font:var(--md-sys-typescale-body-small);opacity:0.7;">
            ${escHtml(m.content)}
            ${m.urgencyTier ? `<div style="margin-top:4px;"><span class="classification-chip ${m.urgencyTier}" style="font-size:9px;padding:1px 6px;">${m.urgencyTier}</span></div>` : ''}
          </div>
        </div>`;
    });
    chatArea.innerHTML += `<div style="text-align:center;padding:0.5rem;color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">── Recent history above ──</div>`;
    chatArea.scrollTop = chatArea.scrollHeight;
  }
}

function buildClassificationStrip(result) {
  const chips = [];
  const c = result.classification;
  if (c) {
    if (c.urgencyTier) chips.push(`<span class="classification-chip ${c.urgencyTier}">${c.urgencyTier}</span>`);
    if (c.category && c.category !== 'other') chips.push(`<span class="classification-chip low">${c.category}</span>`);
    if (c.halfLifeHours) chips.push(`<span class="classification-chip low">${c.halfLifeHours}h half-life</span>`);
    if (c.actionVerb && c.actionVerb !== 'other') chips.push(`<span class="classification-chip low">${c.actionVerb}</span>`);
  }
  if (result.commitment?.is_commitment) {
    chips.push(`<span class="classification-chip high">Commitment</span>`);
  }
  if (result.unanchored?.is_unanchored) {
    chips.push(`<span class="classification-chip medium">Unanchored</span>`);
  }
  if (chips.length === 0) return '';
  return `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;padding-left:4px;">${chips.join('')}</div>`;
}

window.sendClarification = async (btn) => {
  const input = btn.previousElementSibling;
  const text = input?.value?.trim();
  if (!text) return;
  btn.disabled = true;
  input.disabled = true;
  input.value = text + ' (sent)';
};

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function formatResponse(text) {
  if (!text) return '';
  return escHtml(text).replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/- (.*?)(<br>|$)/g, '• $1$2');
}
