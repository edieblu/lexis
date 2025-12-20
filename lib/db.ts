import { createClient } from '@libsql/client';
import { Book, Word } from '@/types';

let db: ReturnType<typeof createClient> | null = null;

function getDb() {
  if (!db) {
    db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return db;
}

export async function initDb() {
  const client = getDb();

  await client.execute(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      tag TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      original TEXT NOT NULL,
      lemma TEXT NOT NULL,
      translation TEXT NOT NULL,
      example TEXT NOT NULL,
      explanation TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id)
    )
  `);
}

// Books
export async function getBooks(): Promise<Book[]> {
  const client = getDb();
  const result = await client.execute('SELECT * FROM books ORDER BY created_at DESC');
  return result.rows as unknown as Book[];
}

export async function createBook(title: string, author: string, tag: string): Promise<Book> {
  const client = getDb();
  const result = await client.execute({
    sql: 'INSERT INTO books (title, author, tag) VALUES (?, ?, ?) RETURNING *',
    args: [title, author, tag],
  });
  return result.rows[0] as unknown as Book;
}

export async function deleteBook(id: number): Promise<void> {
  const client = getDb();
  await client.execute({ sql: 'DELETE FROM words WHERE book_id = ?', args: [id] });
  await client.execute({ sql: 'DELETE FROM books WHERE id = ?', args: [id] });
}

// Words
export async function getWords(bookId?: number): Promise<Word[]> {
  const client = getDb();
  if (bookId) {
    const result = await client.execute({
      sql: 'SELECT * FROM words WHERE book_id = ? ORDER BY created_at DESC',
      args: [bookId],
    });
    return result.rows as unknown as Word[];
  }
  const result = await client.execute('SELECT * FROM words ORDER BY created_at DESC');
  return result.rows as unknown as Word[];
}

export async function createWord(
  bookId: number,
  original: string,
  lemma: string,
  translation: string,
  example: string,
  explanation: string
): Promise<Word> {
  const client = getDb();
  const result = await client.execute({
    sql: 'INSERT INTO words (book_id, original, lemma, translation, example, explanation) VALUES (?, ?, ?, ?, ?, ?) RETURNING *',
    args: [bookId, original, lemma, translation, example, explanation],
  });
  return result.rows[0] as unknown as Word;
}

export async function deleteWord(id: number): Promise<void> {
  const client = getDb();
  await client.execute({ sql: 'DELETE FROM words WHERE id = ?', args: [id] });
}

export async function getWordsWithBooks(): Promise<(Word & { book_title: string; book_tag: string })[]> {
  const client = getDb();
  const result = await client.execute(`
    SELECT words.*, books.title as book_title, books.tag as book_tag
    FROM words
    JOIN books ON words.book_id = books.id
    ORDER BY words.created_at DESC
  `);
  return result.rows as unknown as (Word & { book_title: string; book_tag: string })[];
}
