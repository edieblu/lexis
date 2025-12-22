import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!validateAuth(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Send to whisper-api.com
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile);
    whisperFormData.append('language', 'el'); // Greek
    whisperFormData.append('model_size', 'large-v3');

    const response = await fetch('https://api.whisper-api.com/transcribe', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.WHISPER_API_KEY!,
      },
      body: whisperFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Whisper API error:', response.status, errorText);
      return NextResponse.json({ error: 'Transcription service error' }, { status: 502 });
    }

    const result = await response.json();
    return NextResponse.json({ text: result.text });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
