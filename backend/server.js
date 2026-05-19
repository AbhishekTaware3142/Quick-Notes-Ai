import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'quicknotes_ai';

let notesCollection;

async function initDb() {
  try {
    const client = new MongoClient(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    const db = client.db(MONGODB_DB);
    notesCollection = db.collection('notes');
    await notesCollection.createIndex({ id: 1 }, { unique: true });
    console.log(`Connected to MongoDB (${MONGODB_DB})`);
  } catch (error) {
    console.error('MongoDB connection failed:', error);
  }
}

initDb();

const ensureDb = (res) => {
  if (!notesCollection) {
    res.status(503).json({ error: 'MongoDB is not connected yet.' });
    return false;
  }
  return true;
};

if (!CLAUDE_API_KEY) {
  console.warn('WARNING: CLAUDE_API_KEY is not set. Set it in backend/.env.');
}

app.use(cors());
app.use(express.json());

const buildPrompt = (action, note, tone) => {
  switch (action) {
    case 'summarize':
      return `Summarize the note below into three concise bullet points that capture the key ideas.`;
    case 'rewrite':
      return `Rewrite the note below in a ${tone} tone while preserving the original meaning and structure.`;
    case 'tag':
      return `Read the note below and suggest up to five relevant tags. Return only a short comma-separated list of tags.`;
    case 'continue':
      return `Continue writing the note naturally in the same style and tone.`;
    default:
      return `Explain the note below.`;
  }
};

app.get('/api/notes', async (req, res) => {
  if (!ensureDb(res)) return;
  try {
    const notes = await notesCollection.find().sort({ updatedAt: -1, id: -1 }).toArray();
    res.json(notes);
  } catch (error) {
    console.error('Failed to fetch notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes.' });
  }
});

app.post('/api/notes', async (req, res) => {
  if (!ensureDb(res)) return;
  const { id, title, content = '', tags = [], updatedAt } = req.body || {};
  if (id == null || !title) {
    return res.status(400).json({ error: 'Note id and title are required.' });
  }
  try {
    const note = { id, title, content, tags, updatedAt: updatedAt || new Date().toISOString() };
    await notesCollection.updateOne({ id }, { $set: note }, { upsert: true });
    res.status(201).json(note);
  } catch (error) {
    console.error('Failed to create note:', error);
    res.status(500).json({ error: 'Failed to create note.' });
  }
});

app.put('/api/notes/:id', async (req, res) => {
  if (!ensureDb(res)) return;
  const noteId = Number(req.params.id);
  const { title, content, tags, updatedAt } = req.body || {};
  try {
    const update = { updatedAt: updatedAt || new Date().toISOString() };
    if (title !== undefined) update.title = title;
    if (content !== undefined) update.content = content;
    if (tags !== undefined) update.tags = tags;
    const result = await notesCollection.findOneAndUpdate(
      { id: noteId },
      { $set: update },
      { returnDocument: 'after' }
    );
    if (!result.value) {
      return res.status(404).json({ error: 'Note not found.' });
    }
    res.json(result.value);
  } catch (error) {
    console.error('Failed to update note:', error);
    res.status(500).json({ error: 'Failed to update note.' });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  if (!ensureDb(res)) return;
  const noteId = Number(req.params.id);
  try {
    await notesCollection.deleteOne({ id: noteId });
    res.status(204).end();
  } catch (error) {
    console.error('Failed to delete note:', error);
    res.status(500).json({ error: 'Failed to delete note.' });
  }
});

app.post('/api/ai', async (req, res) => {
  const { note = '', action, tone = 'Professional' } = req.body || {};
  if (!action) {
    return res.status(400).json({ error: 'Missing action parameter.' });
  }

  const prompt = buildPrompt(action, note, tone);
  const body = {
    model: 'claude-sonnet-4-20250514',
    prompt: `\n\nHuman: ${prompt}\n\nNote:\n${note}\n\nAssistant:`,
    max_tokens_to_sample: 400,
    temperature: 0.35,
    top_p: 0.9,
    stream: true
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CLAUDE_API_KEY
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText || 'Claude API returned an error.' });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finished = false;

    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop();

      for (const event of events) {
        const trimmed = event.trim();
        if (!trimmed) continue;
        const lines = trimmed.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') {
            finished = true;
            break;
          }

          try {
            const parsed = JSON.parse(payload);
            const text = parsed.completion ?? parsed.output_text ?? parsed.delta?.content;
            if (typeof text === 'string' && text.length) {
              res.write(text);
            }
          } catch {
            res.write(payload);
          }
        }
      }
    }

    res.end();
  } catch (error) {
    console.error('AI request failed:', error);
    res.status(500).json({ error: 'Failed to stream AI response.' });
  }
});

app.get('/', (req, res) => {
  res.json({ name: 'QuickNotes AI backend', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`QuickNotes AI backend listening on http://localhost:${PORT}`);
});
