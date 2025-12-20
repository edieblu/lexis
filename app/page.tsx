'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Book, Word, ProcessedWord } from '@/types';

type Tab = 'capture' | 'words' | 'books';

export default function Home() {
  // Auth
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  // Navigation
  const [activeTab, setActiveTab] = useState<Tab>('capture');

  // Books
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [showAddBook, setShowAddBook] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookTag, setNewBookTag] = useState('');

  // Words
  const [words, setWords] = useState<Word[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedWord, setProcessedWord] = useState<ProcessedWord | null>(null);
  const [originalInput, setOriginalInput] = useState('');

  // Voice
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState<'' | 'error' | 'success'>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const selectedBook = books.find((b) => b.id === selectedBookId);
  const getAuthHeader = useCallback(() => `Bearer ${password}`, [password]);

  // Load saved auth
  useEffect(() => {
    const saved = localStorage.getItem('lexis-password');
    if (saved) {
      setPassword(saved);
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch books
  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/books', {
        headers: { Authorization: getAuthHeader() },
      });
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      setBooks(data.books || []);
      if (data.books?.length > 0 && !selectedBookId) {
        setSelectedBookId(data.books[0].id);
      }
    } catch (error) {
      console.error('Fetch books error:', error);
    }
  }, [getAuthHeader, selectedBookId]);

  // Fetch words
  const fetchWords = useCallback(async () => {
    try {
      const res = await fetch('/api/words', {
        headers: { Authorization: getAuthHeader() },
      });
      if (res.ok) {
        const data = await res.json();
        setWords(data.words || []);
      }
    } catch (error) {
      console.error('Fetch words error:', error);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBooks();
      fetchWords();
    }
  }, [isAuthenticated, fetchBooks, fetchWords]);

  // Auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/books', {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (res.ok) {
        localStorage.setItem('lexis-password', password);
        setIsAuthenticated(true);
        setAuthError('');
      } else {
        setAuthError('Invalid password');
      }
    } catch {
      setAuthError('Connection error');
    }
  };

  // Books
  const handleAddBook = async () => {
    if (!newBookTitle.trim() || !newBookAuthor.trim() || !newBookTag.trim()) return;

    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({
          title: newBookTitle.trim(),
          author: newBookAuthor.trim(),
          tag: newBookTag.trim().replace(/\s+/g, '-'),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBooks((prev) => [data.book, ...prev]);
        setSelectedBookId(data.book.id);
        setShowAddBook(false);
        setNewBookTitle('');
        setNewBookAuthor('');
        setNewBookTag('');
      }
    } catch (error) {
      console.error('Add book error:', error);
    }
  };

  const handleDeleteBook = async (id: number) => {
    if (!confirm('Delete this book and all its words?')) return;

    try {
      await fetch(`/api/books?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: getAuthHeader() },
      });
      setBooks((prev) => prev.filter((b) => b.id !== id));
      setWords((prev) => prev.filter((w) => w.book_id !== id));
      if (selectedBookId === id) {
        setSelectedBookId(books.find((b) => b.id !== id)?.id || null);
      }
    } catch (error) {
      console.error('Delete book error:', error);
    }
  };

  // Word processing
  const processWord = async (word: string) => {
    if (!word.trim() || !selectedBookId) return;

    setIsProcessing(true);
    setOriginalInput(word.trim());
    setStatus('Processing...');
    setStatusType('');

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({ word: word.trim() }),
      });

      if (res.ok) {
        const data: ProcessedWord = await res.json();
        setProcessedWord(data);
        setStatus('');
        setInputText('');
      } else {
        setStatus('Failed to process word');
        setStatusType('error');
      }
    } catch (error) {
      console.error('Process error:', error);
      setStatus('Connection error');
      setStatusType('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveWord = async () => {
    if (!processedWord || !selectedBookId) return;

    try {
      const res = await fetch('/api/words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({
          bookId: selectedBookId,
          original: originalInput,
          ...processedWord,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setWords((prev) => [data.word, ...prev]);
        setProcessedWord(null);
        setOriginalInput('');
        setStatus('Word saved!');
        setStatusType('success');
        setTimeout(() => setStatus(''), 2000);
      }
    } catch (error) {
      console.error('Save error:', error);
      setStatus('Failed to save');
      setStatusType('error');
    }
  };

  const discardWord = () => {
    setProcessedWord(null);
    setOriginalInput('');
  };

  const handleDeleteWord = async (id: number) => {
    try {
      await fetch(`/api/words?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: getAuthHeader() },
      });
      setWords((prev) => prev.filter((w) => w.id !== id));
    } catch (error) {
      console.error('Delete word error:', error);
    }
  };

  // Voice
  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('Voice input requires Chrome');
      setStatusType('error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'el-GR';

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('Listening...');
      setStatusType('');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setStatus(`Heard: "${transcript}"`);
      setStatusType('success');
      processWord(transcript);
    };

    recognition.onerror = (event) => {
      setStatus(`Error: ${event.error}`);
      setStatusType('error');
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognition.start();
  };

  // Export
  const handleExport = async (bookId?: number) => {
    const url = bookId ? `/api/export?bookId=${bookId}` : '/api/export';
    const res = await fetch(url, {
      headers: { Authorization: getAuthHeader() },
    });

    if (res.ok) {
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = bookId
        ? `lexis-${books.find((b) => b.id === bookId)?.tag || 'export'}.txt`
        : 'lexis-export.txt';
      a.click();
      URL.revokeObjectURL(downloadUrl);
    }
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="container">
        <form className="login-form" onSubmit={handleLogin}>
          <h1>Lexis</h1>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            Greek Vocabulary Builder
          </p>
          {authError && <p className="status error">{authError}</p>}
          <input
            type="password"
            className="text-input"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn-primary">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h1>Lexis</h1>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'capture' ? 'active' : ''}`}
            onClick={() => setActiveTab('capture')}
          >
            Capture
          </button>
          <button
            className={`tab ${activeTab === 'words' ? 'active' : ''}`}
            onClick={() => setActiveTab('words')}
          >
            Words
          </button>
          <button
            className={`tab ${activeTab === 'books' ? 'active' : ''}`}
            onClick={() => setActiveTab('books')}
          >
            Books
          </button>
        </div>
      </div>

      {/* Capture Tab */}
      {activeTab === 'capture' && (
        <>
          {/* Book selector */}
          <div className="book-section">
            <label>Current Book</label>
            <select
              value={selectedBookId || ''}
              onChange={(e) => setSelectedBookId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Select a book...</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title} - {book.author}
                </option>
              ))}
            </select>
            {selectedBook && (
              <div className="book-info">
                <span className="book-tag">{selectedBook.tag}</span>
              </div>
            )}
            {books.length === 0 && (
              <button
                className="btn btn-secondary"
                style={{ marginTop: '0.75rem', width: '100%' }}
                onClick={() => {
                  setShowAddBook(true);
                  setActiveTab('books');
                }}
              >
                Add your first book
              </button>
            )}
          </div>

          {/* Word input */}
          {selectedBookId && !processedWord && (
            <div className="input-section">
              <div className="input-row">
                <input
                  type="text"
                  className="text-input"
                  placeholder="Type Greek word..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && processWord(inputText)}
                  disabled={isProcessing}
                />
                <button
                  className="send-btn"
                  onClick={() => processWord(inputText)}
                  disabled={!inputText.trim() || isProcessing}
                >
                  {isProcessing ? <span className="spinner" /> : 'Go'}
                </button>
                <button
                  className={`mic-btn ${isListening ? 'listening' : ''}`}
                  onClick={startListening}
                  disabled={isProcessing}
                >
                  {isListening ? '...' : 'Mic'}
                </button>
              </div>
            </div>
          )}

          {/* Status */}
          {status && <div className={`status ${statusType}`}>{status}</div>}

          {/* Processing card */}
          {processedWord && (
            <div className="processing-card">
              <div className="lemma">{processedWord.lemma}</div>
              <div className="translation">{processedWord.translation}</div>
              <div className="example">{processedWord.example}</div>
              <div className="explanation">{processedWord.explanation}</div>
              <div className="processing-actions">
                <button className="btn btn-secondary" onClick={discardWord}>
                  Discard
                </button>
                <button className="btn btn-primary" onClick={saveWord}>
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Recent words */}
          {!processedWord && words.length > 0 && (
            <div className="word-list">
              <div className="word-list-header">
                <h2>Recent Words</h2>
                <span className="word-count">{words.length} total</span>
              </div>
              {words.slice(0, 5).map((word) => (
                <div key={word.id} className="word-card">
                  <div className="word-header">
                    <div>
                      <div className="lemma">{word.lemma}</div>
                      <div className="translation">{word.translation}</div>
                    </div>
                  </div>
                  <div className="example">{word.example}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Words Tab */}
      {activeTab === 'words' && (
        <>
          <div className="export-section">
            <h3>Export to Anki</h3>
            <p className="export-info">
              Download your words as a tab-separated file you can import into Anki.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => handleExport()}
                disabled={words.length === 0}
              >
                Export All ({words.length})
              </button>
              {selectedBook && (
                <button
                  className="btn btn-secondary"
                  onClick={() => handleExport(selectedBookId!)}
                  disabled={words.filter((w) => w.book_id === selectedBookId).length === 0}
                >
                  Export {selectedBook.tag}
                </button>
              )}
            </div>
          </div>

          <div className="word-list">
            <div className="word-list-header">
              <h2>All Words</h2>
              <span className="word-count">{words.length} words</span>
            </div>
            {words.length === 0 ? (
              <div className="empty-state">
                No words yet. Go to Capture to add words from your book.
              </div>
            ) : (
              words.map((word) => (
                <div key={word.id} className="word-card">
                  <div className="word-header">
                    <div>
                      <div className="lemma">{word.lemma}</div>
                      <div className="translation">{word.translation}</div>
                    </div>
                    <button className="delete-btn" onClick={() => handleDeleteWord(word.id)}>
                      x
                    </button>
                  </div>
                  <div className="example">{word.example}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Books Tab */}
      {activeTab === 'books' && (
        <>
          <button
            className="btn btn-primary"
            style={{ marginBottom: '1rem', width: '100%' }}
            onClick={() => setShowAddBook(true)}
          >
            Add New Book
          </button>

          <div className="books-list">
            {books.length === 0 ? (
              <div className="empty-state">No books yet. Add your first book to get started.</div>
            ) : (
              books.map((book) => (
                <div key={book.id} className="book-card">
                  <div className="book-details">
                    <h3>{book.title}</h3>
                    <p>
                      {book.author} · <span className="book-tag">{book.tag}</span>
                    </p>
                  </div>
                  <button className="btn btn-danger" onClick={() => handleDeleteBook(book.id)}>
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Add Book Modal */}
      {showAddBook && (
        <div className="modal-overlay" onClick={() => setShowAddBook(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Book</h3>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={newBookTitle}
                onChange={(e) => setNewBookTitle(e.target.value)}
                placeholder="e.g., Ο Χριστός ξανασταυρώνεται"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Author</label>
              <input
                type="text"
                value={newBookAuthor}
                onChange={(e) => setNewBookAuthor(e.target.value)}
                placeholder="e.g., Νίκος Καζαντζάκης"
              />
            </div>
            <div className="form-group">
              <label>Anki Tag</label>
              <input
                type="text"
                value={newBookTag}
                onChange={(e) => setNewBookTag(e.target.value)}
                placeholder="e.g., kazantzakis-christos"
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                This tag will be added to all words from this book in Anki
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddBook(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddBook}
                disabled={!newBookTitle.trim() || !newBookAuthor.trim() || !newBookTag.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
