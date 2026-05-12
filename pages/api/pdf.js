import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

const isRtl = (lang) => lang === 'ar';

// We'll load Arabic font if available; PDFKit's default Helvetica works for English.
function getArabicFontPath() {
  const candidates = [
    path.join(process.cwd(), 'public', 'fonts', 'NotoNaskhArabic-Regular.ttf'),
    path.join(process.cwd(), 'public', 'fonts', 'NotoNaskhArabic-Bold.ttf'),
  ];
  return candidates.filter((p) => fs.existsSync(p));
}

function setupFonts(doc, rtl) {
  if (rtl) {
    const fonts = getArabicFontPath();
    if (fonts[0]) {
      doc.registerFont('Body', fonts[0]);
      doc.registerFont('Bold', fonts[1] || fonts[0]);
      return { body: 'Body', bold: 'Bold' };
    }
  }
  return { body: 'Helvetica', bold: 'Helvetica-Bold' };
}

function writePara(doc, text, opts = {}) {
  const { rtl, bold, size = 11, color = '#1a1a1a', spaceAfter = 6, fonts } = opts;
  doc.font(bold ? fonts.bold : fonts.body).fontSize(size).fillColor(color);
  doc.text(text || '', {
    align: rtl ? 'right' : 'left',
    features: rtl ? ['rtla'] : undefined,
    lineGap: 2,
  });
  doc.moveDown(spaceAfter / 12);
}

function sectionHeader(doc, title, fonts, rtl) {
  doc.moveDown(0.6);
  doc.font(fonts.bold).fontSize(10).fillColor('#000');
  doc.text(title.toUpperCase(), { align: rtl ? 'right' : 'left', characterSpacing: 1.2 });
  const y = doc.y + 2;
  doc.moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .lineWidth(0.5)
    .strokeColor('#000')
    .stroke();
  doc.moveDown(0.4);
}

function buildCoverLetterPdf(data, res) {
  const rtl = isRtl(data.language);
  const doc = new PDFDocument({ size: 'A4', margin: 60 });
  const fonts = setupFonts(doc, rtl);

  const filename = `${(data.candidate_name || data.cv?.name || 'CoverLetter').replace(/\s+/g, '_')}_CoverLetter.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // Name
  doc.font(fonts.bold).fontSize(18).fillColor('#000');
  doc.text(data.candidate_name || data.cv?.name || '', { align: rtl ? 'right' : 'left', features: rtl ? ['rtla'] : undefined });

  // Contact
  const contact = data.candidate_contact || data.cv?.contact || {};
  const contactLine = [contact.email, contact.phone, contact.location].filter(Boolean).join(' · ');
  if (contactLine) {
    doc.font(fonts.body).fontSize(10).fillColor('#666');
    doc.text(contactLine, { align: rtl ? 'right' : 'left', features: rtl ? ['rtla'] : undefined });
  }
  doc.moveDown(1.5);

  // Body
  const paras = (data.cover_letter || '').split(/\n\n+/);
  paras.forEach((p) => {
    writePara(doc, p.trim(), { rtl, size: 11, fonts, spaceAfter: 10 });
  });

  doc.end();
}

function buildCvPdf(data, res) {
  const cv = data.cv;
  const rtl = isRtl(data.language);
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const fonts = setupFonts(doc, rtl);

  const filename = `${(cv?.name || 'CV').replace(/\s+/g, '_')}_CV.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // Name
  doc.font(fonts.bold).fontSize(22).fillColor('#000');
  doc.text(cv.name || '', { align: rtl ? 'right' : 'left', features: rtl ? ['rtla'] : undefined });

  // Headline
  if (cv.headline) {
    doc.font(fonts.body).fontSize(12).fillColor('#555');
    doc.text(cv.headline, { align: rtl ? 'right' : 'left', features: rtl ? ['rtla'] : undefined });
  }

  // Contact
  const c = cv.contact || {};
  const contactLine = [c.email, c.phone, c.location, c.linkedin].filter(Boolean).join(' · ');
  if (contactLine) {
    doc.font(fonts.body).fontSize(9.5).fillColor('#666');
    doc.text(contactLine, { align: rtl ? 'right' : 'left', features: rtl ? ['rtla'] : undefined });
  }

  // Summary
  if (cv.summary) {
    sectionHeader(doc, rtl ? 'نبذة' : 'Summary', fonts, rtl);
    writePara(doc, cv.summary, { rtl, size: 10.5, fonts });
  }

  // Experience
  if (cv.experience?.length) {
    sectionHeader(doc, rtl ? 'الخبرة' : 'Experience', fonts, rtl);
    cv.experience.forEach((exp) => {
      doc.moveDown(0.3);
      doc.font(fonts.bold).fontSize(11).fillColor('#000');
      const titleLine = `${exp.role || ''}${exp.company ? ' — ' + exp.company : ''}${exp.location ? ', ' + exp.location : ''}`;
      doc.text(titleLine, { align: rtl ? 'right' : 'left', features: rtl ? ['rtla'] : undefined });
      if (exp.dates) {
        doc.font(fonts.body).fontSize(9.5).fillColor('#666');
        doc.text(exp.dates, { align: rtl ? 'right' : 'left', features: rtl ? ['rtla'] : undefined });
      }
      doc.font(fonts.body).fontSize(10).fillColor('#1a1a1a');
      (exp.bullets || []).forEach((b) => {
        const bullet = rtl ? `${b} •` : `•  ${b}`;
        doc.text(bullet, { align: rtl ? 'right' : 'left', features: rtl ? ['rtla'] : undefined, indent: rtl ? 0 : 6 });
      });
    });
  }

  // Skills
  if (cv.skills?.length) {
    sectionHeader(doc, rtl ? 'المهارات' : 'Skills', fonts, rtl);
    writePara(doc, cv.skills.join(' · '), { rtl, size: 10, fonts });
  }

  // Education
  if (cv.education?.length) {
    sectionHeader(doc, rtl ? 'التعليم' : 'Education', fonts, rtl);
    cv.education.forEach((ed) => {
      doc.font(fonts.bold).fontSize(10.5).fillColor('#000');
      const line = `${ed.degree || ''}${ed.institution ? ' — ' + ed.institution : ''}${ed.dates ? '  (' + ed.dates + ')' : ''}`;
      doc.text(line, { align: rtl ? 'right' : 'left', features: rtl ? ['rtla'] : undefined });
    });
  }

  // Languages
  if (cv.languages?.length) {
    sectionHeader(doc, rtl ? 'اللغات' : 'Languages', fonts, rtl);
    writePara(doc, cv.languages.join(' · '), { rtl, size: 10, fonts });
  }

  doc.end();
}

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { type, data } = req.body;
    if (type === 'cv') return buildCvPdf(data, res);
    return buildCoverLetterPdf(data, res);
  } catch (err) {
    console.error('PDF error:', err);
    return res.status(500).json({ error: err.message });
  }
}
