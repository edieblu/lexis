import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { initDb, getWords, createWord, deleteWord } from '@/lib/db';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!validateAuth(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await initDb();

  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get('bookId');

  const words = await getWords(bookId ? Number(bookId) : undefined);
  return NextResponse.json({ words });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!validateAuth(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await initDb();

  const { bookId, original, lemma, translation, example, explanation } = await request.json();

  if (!bookId || !original || !lemma || !translation || !example || !explanation) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  const word = await createWord(bookId, original, lemma, translation, example, explanation);
  return NextResponse.json({ word });
}

export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!validateAuth(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await initDb();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Word ID required' }, { status: 400 });
  }

  await deleteWord(Number(id));
  return NextResponse.json({ success: true });
}
