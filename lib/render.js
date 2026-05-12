export function normalizeGenerated(data = {}) {
  return {
    language: data.language || 'English',
    coverLetter: data.coverLetter || data.cover_letter || '',
    cv: data.cv || data.tailoredCv || data.tailored_cv || '',
    fitNotes: Array.isArray(data.fitNotes) ? data.fitNotes : Array.isArray(data.fit_notes) ? data.fit_notes : [],
  };
}

export function resultToText(result, type = 'cover') {
  const normalized = normalizeGenerated(result);
  if (type === 'cv') return normalized.cv;
  if (type === 'notes') return normalized.fitNotes.map((n, i) => `${i + 1}. ${n}`).join('\n');
  return normalized.coverLetter;
}
