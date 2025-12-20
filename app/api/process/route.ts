import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateAuth } from '@/lib/auth';
import { ProcessedWord } from '@/types';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a Greek language expert helping B2-C1 level learners build vocabulary from books they're reading.

When given a Greek word (which may be in any grammatical form), you must:

1. **Lemmatize** the word to its dictionary form:
   - Verbs: first person singular present indicative (e.g., γράφω, διαβάζω, είμαι)
   - Nouns: nominative singular (e.g., βιβλίο, άνθρωπος)
   - Adjectives: masculine nominative singular (e.g., καλός, μεγάλος)
   - Other parts of speech: standard dictionary form

2. **Translate** to English (concise, 1-3 words typically)

3. **Example sentence** in Greek using the word naturally (B2 level, 8-15 words)

4. **Brief explanation** in English: usage notes, common collocations, register (formal/informal), or any nuances helpful for a learner

Respond ONLY with valid JSON in this exact format:
{
  "lemma": "the dictionary form",
  "translation": "English translation",
  "example": "Greek example sentence",
  "explanation": "Brief usage notes"
}

Do not include any text outside the JSON object.`;

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

    const processed: ProcessedWord = JSON.parse(content.text);
    return NextResponse.json(processed);
  } catch (error) {
    console.error('Process error:', error);
    return NextResponse.json({ error: 'Failed to process word' }, { status: 500 });
  }
}
