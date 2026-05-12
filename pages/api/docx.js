import { Document, Packer, Paragraph, TextRun } from 'docx';
import { resultToText } from '../../lib/render';

function paragraphs(text) {
  return String(text || '').split('\n').map(line => new Paragraph({ children: [new TextRun(line || ' ')] }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { result, type = 'cover' } = req.body || {};
    const text = resultToText(result, type);
    if (!text) return res.status(400).json({ error: 'No generated text to export.' });
    const doc = new Document({ sections: [{ properties: {}, children: paragraphs(text) }] });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${type === 'cv' ? 'tailored-cv' : 'cover-letter'}.docx"`);
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'DOCX export failed' });
  }
}
