import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { initDb, getWordsWithBooks } from '@/lib/db';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!validateAuth(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await initDb();

  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get('bookId');

  let words = await getWordsWithBooks();

  if (bookId) {
    words = words.filter((w) => w.book_id === Number(bookId));
  }

  // Anki CSV format:
  // Front: lemma + example sentence
  // Back: translation + explanation
  // Tags: book tag
  const lines = words.map((w) => {
    const front = `<b>${w.lemma}</b><br><i>${w.example}</i>`;
    const back = `${w.translation}<br><br>${w.explanation}`;
    const tags = w.book_tag;

    // Escape quotes and format as CSV
    const escapeCsv = (s: string) => `"${s.replace(/"/g, '""')}"`;

    return `${escapeCsv(front)}\t${escapeCsv(back)}\t${escapeCsv(tags)}`;
  });

  // Add header comment for Anki
  const csv = `#separator:tab\n#html:true\n#tags column:3\n${lines.join('\n')}`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="lexis-export.txt"',
    },
  });
}
