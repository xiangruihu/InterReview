export function filenameToInterviewTitle(filename: string): string {
  if (!filename) return '';
  return filename.replace(/\.[^/.]+$/, '');
}

export function isDefaultInterviewTitle(title?: string | null): boolean {
  if (!title) return true;
  const trimmed = title.trim();
  if (!trimmed) return true;
  return /^未命名面试/i.test(trimmed) || /^untitled/i.test(trimmed);
}
