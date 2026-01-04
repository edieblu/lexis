import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateAuth } from '@/lib/auth';
import { ProcessResponse } from '@/types';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a Greek language expert helping B2-C1 level learners build vocabulary from books they're reading.

When given a Greek word (which may be from speech recognition and could be misheard), you must:

1. **Assess confidence**: Is this clearly a recognizable Greek word, or could it be a mishearing?

2. If CONFIDENT (you clearly recognize the word):
   - Lemmatize to dictionary form
   - Translate to English (1-3 words)
   - Provide example sentence in Greek (B2 level, 8-15 words)
   - Brief explanation with usage notes

3. If UNCERTAIN (the input seems garbled, could be multiple words, or you're unsure what was intended):
   - Provide 3 alternative interpretations of what the speaker might have said
   - Consider phonetically similar Greek words
   - Each alternative should be a complete word entry

**Lemmatization rules:**
- Verbs: first person singular present indicative (e.g., γράφω, διαβάζω)
- Nouns: nominative singular (e.g., βιβλίο, άνθρωπος)
- Adjectives: masculine nominative singular (e.g., καλός, μεγάλος)

**Response format:**

When CONFIDENT, respond with:
{
  "confident": true,
  "word": {
    "lemma": "dictionary form",
    "translation": "English translation",
    "example": "Greek example sentence",
    "explanation": "Brief usage notes"
  }
}

When UNCERTAIN, respond with:
{
  "confident": false,
  "alternatives": [
    {
      "lemma": "first possibility",
      "translation": "English translation",
      "example": "Greek example sentence",
      "explanation": "Brief usage notes"
    },
    {
      "lemma": "second possibility",
      "translation": "English translation",
      "example": "Greek example sentence",
      "explanation": "Brief usage notes"
    },
    {
      "lemma": "third possibility",
      "translation": "English translation",
      "example": "Greek example sentence",
      "explanation": "Brief usage notes"
    }
  ]
}

Respond ONLY with valid JSON. Do not include any text outside the JSON object.`;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!validateAuth(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { word } = await request.json();

  if (!word) {
    return NextResponse.json({ error: 'Word is required' }, { status: 400 });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: word }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response format' }, { status: 500 });
    }

    const processed: ProcessResponse = JSON.parse(content.text);
    return NextResponse.json(processed);
  } catch (error) {
    console.error('Process error:', error);
    return NextResponse.json({ error: 'Failed to process word' }, { status: 500 });
  }
}
