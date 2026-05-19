import { useEffect, useMemo, useRef, useState } from 'react';

const INITIAL_NOTE = {
  id: 1,
  title: 'React Application',
  tags: ['react', 'components', 'reusable', 'javascript', 'library', 'easy'],
  content: `# React Notes

React is a JavaScript library used for building user interfaces, especially single-page applications.

- It was developed by Meta Platforms
- Features of React:
  - Component-based architecture
  - Virtual DOM for fast performance
  - Reusable components
  - One-way data binding
  - Easy to learn and maintain

React uses a declarative approach to building UIs, making your code more predictable and easier to debug.`,
  updatedAt: '2 hours ago',
};

const TONES = ['Professional', 'Casual', 'Academic', 'Creative', 'Concise'];

const stopWords = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'have', 'will', 'just', 'also', 'can',
  'note', 'notes', 'need', 'needs', 'new', 'next', 'add', 'using', 'use', 'uses', 'build', 'may', 'could'
]);

const smartSummary = (text) => {
  if (!text.trim()) return '• No note content to summarize.';
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  if (sentences.length >= 3) {
    return sentences.slice(0, 3).map((sentence) => `• ${sentence.replace(/\.$/, '')}`).join('\n');
  }

  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const freq = {};
  words.forEach((word) => {
    if (!stopWords.has(word)) freq[word] = (freq[word] || 0) + 1;
  });
  const top = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 3);
  return top.length
    ? top.map((keyword) => `• Focus on ${keyword}`).join('\n')
    : '• Review the note and highlight the main ideas.';
};

const suggestTags = (text) => {
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const freq = {};
  words.forEach((word) => {
    if (!stopWords.has(word)) freq[word] = (freq[word] || 0) + 1;
  });
  return Object.keys(freq)
    .sort((a, b) => freq[b] - freq[a])
    .slice(0, 5)
    .map((word) => word.replace(/[^a-z]/g, ''))
    .filter(Boolean);
};

const rewriteTone = (text, tone) => {
  if (!text.trim()) return text;
  const base = text
    .replace(/\bI'm\b/g, 'I am')
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bdon't\b/g, 'do not')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\bI've\b/g, 'I have')
    .replace(/\bwe're\b/g, 'we are');

  if (tone === 'Formal') {
    return base
      .replace(/\bneed to\b/g, 'must')
      .replace(/\bwant to\b/g, 'would like to')
      .replace(/\bI can\b/g, 'I am able to')
      .replace(/\bshould\b/g, 'ought to');
  }

  if (tone === 'Casual') {
    return base
      .replace(/\bI am\b/g, "I'm")
      .replace(/\bDo not\b/g, "Don't")
      .replace(/\bcannot\b/g, "can't")
      .replace(/\bwould like to\b/g, "would love to")
      .replace(/\bmust\b/g, "should");
  }

  if (tone === 'Academic') {
    return base
      .replace(/\bReact\b/g, 'React')
      .replace(/\bIt\b/g, 'It')
      .replace(/\buses\b/g, 'utilizes')
      .replace(/\bis\b/g, 'is');
  }

  if (tone === 'Creative') {
    return base
      .replace(/\bReact is\b/g, 'React is like a powerful paintbrush for web pages,')
      .replace(/\bJavaScript\b/g, 'JavaScript magic')
      .replace(/\bbuilder\b/g, 'creator');
  }

  if (tone === 'Concise') {
    return base
      .replace(/\bReact is a JavaScript library used for building user interfaces, especially single-page applications\./g, 'React is a UI library for single-page apps.')
      .replace(/\bIt was developed by Meta Platforms\./g, 'Created by Meta.')
      .replace(/\bFeatures of React:\b/g, 'React features:');
  }

  return base;
};

const continueWriting = (text) => {
  if (!text.trim()) return 'Begin by writing the first ideas for this note.';
  const lower = text.toLowerCase();
  if (lower.includes('project') || lower.includes('plan')) {
    return 'Next, outline the implementation steps and assign ownership for each milestone.';
  }
  if (lower.includes('buy') || lower.includes('shopping') || lower.includes('purchase')) {
    return 'Also consider the budget, quantity, and timing so everything is ready when needed.';
  }
  if (lower.includes('deploy') || lower.includes('schedule') || lower.includes('release')) {
    return 'Make sure the timeline is confirmed and any dependencies are tracked before moving forward.';
  }
  return 'Add more detail to clarify the next step and make the note easy to act on.';
};

const runLocalAI = async (action, note, tone) => {
  await new Promise((resolve) => setTimeout(resolve, 250));

  switch (action) {
    case 'Summarize':
      return { type: 'summary', text: smartSummary(note) };
    case 'Rewrite Tone':
      return { type: 'rewrite', text: rewriteTone(note, tone) };
    case 'Auto Tag':
      return { type: 'tag', tags: suggestTags(note) };
    case 'Continue Writing':
      return { type: 'continue', text: continueWriting(note) };
    default:
      return { type: 'summary', text: smartSummary(note) };
  }
};

function NoteCard({ note, active, onClick, onDelete }) {
  return (
    <div
      onClick={onClick}
      className={`note-card ${active ? 'active' : ''}`}
      style={{
        background: active
          ? 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(168,85,247,0.10) 100%)'
          : 'rgba(255,255,255,0.03)',
        border: active ? '1.5px solid rgba(129,140,248,0.5)' : '1.5px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: '16px 18px',
        cursor: 'pointer',
        marginBottom: 10,
        position: 'relative',
        transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
        boxShadow: active ? '0 4px 32px rgba(99,102,241,0.13)' : 'none',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 4 }}>{note.title}</div>
      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, overflow: 'hidden', maxHeight: 42, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {note.content.replace(/[#*`]/g, '').slice(0, 80)}...
      </div>
      <div style={{ fontSize: 11, color: '#6366f1', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{note.updatedAt}</span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ background: 'rgba(239,68,68,0.12)', border: 'none', borderRadius: 6, padding: '2px 7px', color: '#f87171', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
        >×</button>
      </div>
    </div>
  );
}

function Tag({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: 'rgba(99,102,241,0.13)', border: '1px solid rgba(129,140,248,0.25)',
      borderRadius: 20, padding: '3px 11px', fontSize: 12, color: '#a5b4fc',
      fontWeight: 500, letterSpacing: 0.2,
    }}>
      {label}
      {onRemove && (
        <span onClick={onRemove} style={{ cursor: 'pointer', color: '#818cf8', fontSize: 14, lineHeight: 1 }}>×</span>
      )}
    </span>
  );
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 16, height: 16,
      border: '2px solid rgba(165,180,252,0.3)',
      borderTop: '2px solid #a5b4fc',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      verticalAlign: 'middle', marginRight: 6,
    }} />
  );
}

export default function QuickNotesAI() {
  const [notes, setNotes] = useState([INITIAL_NOTE]);
  const [activeId, setActiveId] = useState(1);
  const [tone, setTone] = useState('Professional');
  const [aiOutput, setAiOutput] = useState('');
  const [status, setStatus] = useState('Ready');
  const [loading, setLoading] = useState(false);
  const [centerView, setCenterView] = useState('note');
  const [newTag, setNewTag] = useState('');
  const [addingTag, setAddingTag] = useState(false);
  const textareaRef = useRef(null);
  const nextId = useRef(2);

  const activeNote = notes.find(n => n.id === activeId);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const API_BASE = '/api';

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    setIsLoadingNotes(true);
    try {
      const response = await fetch(`${API_BASE}/notes`);
      if (!response.ok) throw new Error('Failed to load notes');
      const loadedNotes = await response.json();
      if (Array.isArray(loadedNotes) && loadedNotes.length) {
        setNotes(loadedNotes);
        setActiveId(loadedNotes[0].id);
        const maxId = Math.max(...loadedNotes.map(n => Number(n.id) || 0));
        nextId.current = maxId + 1;
      }
    } catch (error) {
      console.error('Notes load failed:', error);
    } finally {
      setIsLoadingNotes(false);
    }
  }

  async function persistNote(note) {
    if (!note?.id) return;
    try {
      await fetch(`${API_BASE}/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: note.title,
          content: note.content,
          tags: note.tags,
          updatedAt: note.updatedAt,
        }),
      });
    } catch (error) {
      console.error('Persist note failed:', error);
    }
  }

  function updateNote(fields) {
    let updatedNote = null;
    setNotes(ns => {
      const updated = ns.map(n => {
        if (n.id !== activeId) return n;
        const next = { ...n, ...fields, updatedAt: new Date().toISOString() };
        updatedNote = next;
        return next;
      });
      return updated;
    });
    if (updatedNote) persistNote(updatedNote);
  }

  function newNote() {
    const id = nextId.current++;
    const note = { id, title: 'Untitled Note', tags: [], content: '', updatedAt: new Date().toISOString() };
    setNotes(ns => [...ns, note]);
    setActiveId(id);
    setAiOutput('');
    setStatus('Ready');

    fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    }).catch(error => console.error('Create note failed:', error));
  }

  function deleteNote(id) {
    setNotes(ns => {
      const updated = ns.filter(n => n.id !== id);
      if (id === activeId && updated.length > 0) setActiveId(updated[0].id);
      return updated;
    });

    fetch(`${API_BASE}/notes/${id}`, {
      method: 'DELETE',
    }).catch(error => console.error('Delete note failed:', error));
  }

  async function runAI(action) {
    if (!activeNote?.content.trim()) { setAiOutput('Please write some content first.'); return; }
    setLoading(true);
    setAiOutput('');
    setStatus(`Running: ${action}…`);
    try {
      const result = await runLocalAI(action, activeNote.content, tone);
      if (action === 'Auto Tag') {
        updateNote({ tags: [...new Set([...(activeNote.tags || []), ...result.tags])] });
        setAiOutput('✓ Tags updated automatically!');
      } else if (action === 'Continue Writing') {
        setAiOutput(result.text);
      } else {
        setAiOutput(result.text);
      }
      setStatus('Done');
    } catch (error) {
      setAiOutput('Error generating AI output.');
      setStatus('Error');
    }
    setLoading(false);
  }

  function addTag() {
    if (newTag.trim()) {
      updateNote({ tags: [...new Set([...(activeNote.tags || []), newTag.trim().toLowerCase()])] });
      setNewTag('');
    }
    setAddingTag(false);
  }

  function applyOutput() {
    if (aiOutput && activeNote) {
      updateNote({ content: `${activeNote.content}\n\n${aiOutput}` });
      setAiOutput('');
      setStatus('Applied!');
    }
  }

  const statusColor = status === 'Ready' ? '#34d399' : status === 'Done' ? '#34d399' : status === 'Error' ? '#f87171' : '#fbbf24';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a18 0%, #0f0f24 40%, #0a0a1a 100%)',
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      display: 'flex',
      color: '#e2e8f0',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'fixed', top: -80, left: -80, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: -60, right: 200, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '40%', left: '40%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 4px; }
        textarea { resize: none; outline: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px);} to { opacity:1; transform:translateY(0);} }
        .ai-btn {
          width: 100%;
          padding: 12px 0;
          border-radius: 12px;
          border: 1.5px solid rgba(129,140,248,0.18);
          background: rgba(99,102,241,0.10);
          color: #a5b4fc;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.3px;
          transition: all 0.18s ease;
          font-family: inherit;
        }
        .ai-btn:hover { background: rgba(99,102,241,0.22); border-color: rgba(129,140,248,0.4); color: #c7d2fe; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(99,102,241,0.15); }
        .ai-btn:active { transform: translateY(0); }
        .ai-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .note-card:hover { background: rgba(99,102,241,0.08) !important; border-color: rgba(129,140,248,0.25) !important; }
        textarea:focus { border-color: rgba(129,140,248,0.4) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.08) !important; }
      `}</style>

      <div style={{
        width: 260,
        minWidth: 220,
        background: 'rgba(255,255,255,0.02)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 16px 24px',
        zIndex: 1,
        backdropFilter: 'blur(12px)',
        position: 'relative',
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
            }}>✦</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.4px', color: '#f1f5f9' }}>QuickNotes</div>
              <div style={{ fontSize: 10, color: '#818cf8', fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase' }}>AI</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>Markdown notes with one-click AI actions.</div>
        </div>

        <button
          onClick={newNote}
          style={{
            width: '100%',
            padding: '11px 0',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13.5,
            cursor: 'pointer',
            marginBottom: 20,
            letterSpacing: 0.3,
            boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
            transition: 'all 0.18s ease',
            fontFamily: 'inherit',
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          + New Note
        </button>

        <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
          Notes ({notes.length})
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notes.map(n => (
            <NoteCard
              key={n.id}
              note={n}
              active={n.id === activeId}
              onClick={() => { setActiveId(n.id); setAiOutput(''); setStatus('Ready'); }}
              onDelete={() => deleteNote(n.id)}
            />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 28px', zIndex: 1, minWidth: 0 }}>
        {activeNote ? (
          <>
            <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <input
                  value={activeNote.title}
                  onChange={e => updateNote({ title: e.target.value })}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 26,
                    fontWeight: 800,
                    color: '#f1f5f9',
                    letterSpacing: '-0.6px',
                    width: '100%',
                    fontFamily: 'inherit',
                  }}
                  placeholder='Note title…'
                />
                <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(99,102,241,0.4) 0%, transparent 80%)', marginTop: 10 }} />
              </div>
              {aiOutput && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setCenterView('note')}
                    style={{
                      borderRadius: 12,
                      border: centerView === 'note' ? '1.5px solid #6366f1' : '1.5px solid rgba(255,255,255,0.12)',
                      background: centerView === 'note' ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.05)',
                      color: '#e2e8f0',
                      padding: '10px 14px',
                      cursor: 'pointer',
                    }}
                  >Note</button>
                  <button
                    onClick={() => setCenterView('output')}
                    style={{
                      borderRadius: 12,
                      border: centerView === 'output' ? '1.5px solid #6366f1' : '1.5px solid rgba(255,255,255,0.12)',
                      background: centerView === 'output' ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.05)',
                      color: '#e2e8f0',
                      padding: '10px 14px',
                      cursor: 'pointer',
                    }}
                  >AI Output</button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 20, alignItems: 'center' }}>
              {activeNote.tags.map(t => (
                <Tag key={t} label={t} onRemove={() => updateNote({ tags: activeNote.tags.filter(x => x !== t) })} />
              ))}
              {addingTag ? (
                <input
                  autoFocus
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onBlur={addTag}
                  onKeyDown={e => { if (e.key === 'Enter') addTag(); if (e.key === 'Escape') setAddingTag(false); }}
                  style={{
                    background: 'rgba(99,102,241,0.10)',
                    border: '1px solid rgba(129,140,248,0.35)',
                    borderRadius: 20, padding: '3px 11px',
                    fontSize: 12, color: '#a5b4fc',
                    outline: 'none', width: 90, fontFamily: 'inherit',
                  }}
                  placeholder='tag…'
                />
              ) : (
                <button
                  onClick={() => setAddingTag(true)}
                  style={{
                    background: 'transparent', border: '1px dashed rgba(99,102,241,0.35)',
                    borderRadius: 20, padding: '3px 11px',
                    fontSize: 12, color: '#6366f1', cursor: 'pointer',
                    fontFamily: 'inherit', fontWeight: 500,
                  }}
                >+ Add Tag</button>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {centerView === 'output' ? (
                <div style={{
                  flex: 1,
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1.5px solid rgba(99,102,241,0.18)',
                  borderRadius: 16,
                  padding: '24px',
                  fontSize: 15,
                  lineHeight: 1.8,
                  color: '#e2e8f0',
                  fontFamily: "'DM Mono', monospace",
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>AI Output</div>
                      <div style={{ color: '#cbd5e1', fontSize: 13 }}>Large output view in the middle pane.</div>
                    </div>
                  </div>
                  <div style={{ minHeight: 200, color: '#dbeafe' }}>
                    {aiOutput || 'Run an AI action to show the output here.'}
                  </div>
                </div>
              ) : (
                <>
                  <textarea
                    ref={textareaRef}
                    value={activeNote.content}
                    onChange={e => updateNote({ content: e.target.value })}
                    style={{
                      flex: 1,
                      width: '100%',
                      background: 'rgba(255,255,255,0.025)',
                      border: '1.5px solid rgba(255,255,255,0.07)',
                      borderRadius: 16,
                      padding: '20px 22px',
                      fontSize: 14.5,
                      lineHeight: 1.8,
                      color: '#cbd5e1',
                      fontFamily: "'DM Mono', monospace",
                      transition: 'border-color 0.18s, box-shadow 0.18s',
                      minHeight: 300,
                    }}
                    placeholder='Start writing your note in Markdown…'
                  />
                  <div style={{ fontSize: 11, color: '#334155', marginTop: 8, textAlign: 'right' }}>
                    {activeNote.content.length} chars · {activeNote.content.split(/\s+/).filter(Boolean).length} words
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 16 }}>
            Create a new note to get started.
          </div>
        )}
      </div>

      <div style={{
        width: 280,
        minWidth: 240,
        background: 'rgba(255,255,255,0.02)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 18px',
        zIndex: 1,
        backdropFilter: 'blur(12px)',
        overflowY: 'auto',
      }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px', marginBottom: 4 }}>AI Actions</div>
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>Enhance your note instantly with AI.</div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Rewrite Tone</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TONES.map(t => (
              <button
                key={t}
                onClick={() => setTone(t)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 8,
                  border: tone === t ? '1.5px solid #6366f1' : '1.5px solid rgba(255,255,255,0.08)',
                  background: tone === t ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: tone === t ? '#a5b4fc' : '#64748b',
                  fontSize: 12,
                  fontWeight: tone === t ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >{t}</button>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 18 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {['Summarize', 'Rewrite Tone', 'Auto Tag', 'Continue Writing'].map(action => (
            <button
              key={action}
              className='ai-btn'
              disabled={loading}
              onClick={() => runAI(action)}
            >
              {loading && status.includes(action) ? <><Spinner />{action}…</> : action}
            </button>
          ))}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 10, padding: '9px 13px',
          border: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 20,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 6px ${statusColor}` }} />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Status: <span style={{ color: statusColor, fontWeight: 600 }}>{status}</span></span>
        </div>

        <div className='result-card' style={{ alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, width: '100%' }}>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>AI Result</div>
              <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>Preview of the latest AI action.</div>
            </div>
            <button
              type='button'
              className='button secondary'
              style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, opacity: aiOutput ? 1 : 0.5, cursor: aiOutput ? 'pointer' : 'not-allowed' }}
              onClick={() => { if (aiOutput) setCenterView('output'); }}
              disabled={!aiOutput}
            >
              Open
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
