import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { resultToText } from '../../lib/render';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { result, type = 'cover' } = req.body || {};
    const text = resultToText(result, type);
    if (!text) return res.status(400).json({ error: 'No generated text to export.' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type === 'cv' ? 'tailored-cv' : 'cover-letter'}.pdf"`);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const regular = path.join(process.cwd(), 'public/fonts/NotoNaskhArabic-Regular.ttf');
    const bold = path.join(process.cwd(), 'public/fonts/NotoNaskhArabic-Bold.ttf');
    if (fs.existsSync(regular)) doc.registerFont('NotoArabic', regular).font('NotoArabic');
    if (fs.existsSync(bold)) doc.registerFont('NotoArabicBold', bold);
    doc.pipe(res);
    doc.fontSize(18).text(type === 'cv' ? 'Tailored CV' : 'Cover Letter', { align: 'left' });
    doc.moveDown();
    doc.fontSize(11).text(text, { align: /[\u0600-\u06FF]/.test(text) ? 'right' : 'left', lineGap: 5 });
    doc.end();
  } catch (error) {
    return res.status(500).json({ error: error.message || 'PDF export failed' });
  }
}
