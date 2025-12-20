import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { initDb, getBooks, createBook, deleteBook } from '@/lib/db';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!validateAuth(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await initDb();
  const books = await getBooks();
  return NextResponse.json({ books });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!validateAuth(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await initDb();

  const { title, author, tag } = await request.json();

  if (!title || !author || !tag) {
    return NextResponse.json({ error: 'Title, author, and tag are required' }, { status: 400 });
  }

  const book = await createBook(title, author, tag);
  return NextResponse.json({ book });
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
    return NextResponse.json({ error: 'Book ID required' }, { status: 400 });
  }

  await deleteBook(Number(id));
  return NextResponse.json({ success: true });
}
