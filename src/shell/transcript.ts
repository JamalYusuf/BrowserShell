import { stripAnsi } from './output';

let transcript = '';
let currentEntry = '';

export function beginTranscriptEntry(prompt: string, command: string): void {
  currentEntry = `${stripAnsi(prompt)}${command}\n`;
}

export function appendTranscriptOutput(text: string): void {
  const plain = stripAnsi(text);
  currentEntry += plain;
  if (!plain.endsWith('\n')) currentEntry += '\n';
}

export function endTranscriptEntry(): void {
  if (currentEntry) {
    transcript += currentEntry;
    currentEntry = '';
  }
}

export function getTranscript(): string {
  return transcript + currentEntry;
}

export function clearTranscript(): void {
  transcript = '';
  currentEntry = '';
}

export function readTranscript(): string {
  const text = getTranscript().trimEnd();
  return text || '(empty session — run a few commands first)';
}