export interface Book {
  id: number;
  title: string;
  author: string;
  tag: string;
  created_at: string;
}

export interface Word {
  id: number;
  book_id: number;
  original: string;
  lemma: string;
  translation: string;
  example: string;
  explanation: string;
  created_at: string;
}

export interface ProcessedWord {
  lemma: string;
  translation: string;
  example: string;
  explanation: string;
}

export interface ProcessResponse {
  confident: boolean;
  word?: ProcessedWord;
  alternatives?: ProcessedWord[];
}
