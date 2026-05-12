import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx';

const isRtl = (lang) => lang === 'ar';

function makeRun(text, opts = {}) {
  return new TextRun({
    text: text || '',
    rtl: opts.rtl,
    bold: opts.bold,
    italics: opts.italics,
    size: opts.size, // half-points
    color: opts.color,
    font: opts.rtl ? 'Arial' : (opts.font || 'Calibri'),
  });
}

function buildCoverLetterDoc(data) {
  const rtl = isRtl(data.language);
  const alignment = rtl ? AlignmentType.RIGHT : AlignmentType.LEFT;

  const paragraphs = [];

  // Header with name + contact
  paragraphs.push(
    new Paragraph({
      alignment,
      bidirectional: rtl,
      children: [makeRun(data.candidate_name || data.cv?.name || '', { bold: true, size: 32, rtl })],
    })
  );

  const contact = data.candidate_contact || data.cv?.contact || {};
  const contactLine = [contact.email, contact.phone, contact.location].filter(Boolean).join(' · ');
  if (contactLine) {
    paragraphs.push(
      new Paragraph({
        alignment,
        bidirectional: rtl,
        spacing: { after: 400 },
        children: [makeRun(contactLine, { size: 20, color: '666666', rtl })],
      })
    );
  }

  // Body paragraphs
  const bodyParas = (data.cover_letter || '').split(/\n\n+/);
  bodyParas.forEach((p) => {
    paragraphs.push(
      new Paragraph({
        alignment,
        bidirectional: rtl,
        spacing: { after: 240, line: 320 },
        children: [makeRun(p.trim(), { size: 22, rtl })],
      })
    );
  });

  return new Document({
    sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } }, children: paragraphs }],
  });
}

function buildCvDoc(data) {
  const cv = data.cv;
  const rtl = isRtl(data.language);
  const alignment = rtl ? AlignmentType.RIGHT : AlignmentType.LEFT;
  const paragraphs = [];

  // Name
  paragraphs.push(
    new Paragraph({
      alignment,
      bidirectional: rtl,
      children: [makeRun(cv.name || '', { bold: true, size: 40, rtl })],
    })
  );

  // Headline
  if (cv.headline) {
    paragraphs.push(
      new Paragraph({
        alignment,
        bidirectional: rtl,
        children: [makeRun(cv.headline, { italics: true, size: 24, color: '555555', rtl })],
      })
    );
  }

  // Contact
  const c = cv.contact || {};
  const contactLine = [c.email, c.phone, c.location, c.linkedin].filter(Boolean).join(' · ');
  if (contactLine) {
    paragraphs.push(
      new Paragraph({
        alignment,
        bidirectional: rtl,
        spacing: { after: 300 },
        children: [makeRun(contactLine, { size: 20, color: '666666', rtl })],
      })
    );
  }

  const section = (title) =>
    new Paragraph({
      alignment,
      bidirectional: rtl,
      spacing: { before: 280, after: 120 },
      border: { bottom: { color: '000000', size: 6, style: BorderStyle.SINGLE } },
      children: [makeRun(title, { bold: true, size: 22, rtl })],
    });

  // Summary
  if (cv.summary) {
    paragraphs.push(section(rtl ? 'نبذة' : 'SUMMARY'));
    paragraphs.push(
      new Paragraph({
        alignment,
        bidirectional: rtl,
        spacing: { after: 120, line: 300 },
        children: [makeRun(cv.summary, { size: 22, rtl })],
      })
    );
  }

  // Experience
  if (cv.experience?.length) {
    paragraphs.push(section(rtl ? 'الخبرة' : 'EXPERIENCE'));
    cv.experience.forEach((exp) => {
      paragraphs.push(
        new Paragraph({
          alignment,
          bidirectional: rtl,
          spacing: { before: 180 },
          children: [
            makeRun(`${exp.role || ''}`, { bold: true, size: 22, rtl }),
            makeRun(exp.company ? ` — ${exp.company}` : '', { size: 22, rtl }),
            makeRun(exp.location ? `, ${exp.location}` : '', { size: 22, color: '666666', rtl }),
          ],
        })
      );
      if (exp.dates) {
        paragraphs.push(
          new Paragraph({
            alignment,
            bidirectional: rtl,
            children: [makeRun(exp.dates, { italics: true, size: 20, color: '666666', rtl })],
          })
        );
      }
      (exp.bullets || []).forEach((b) => {
        paragraphs.push(
          new Paragraph({
            alignment,
            bidirectional: rtl,
            spacing: { line: 280 },
            bullet: { level: 0 },
            children: [makeRun(b, { size: 21, rtl })],
          })
        );
      });
    });
  }

  // Skills
  if (cv.skills?.length) {
    paragraphs.push(section(rtl ? 'المهارات' : 'SKILLS'));
    paragraphs.push(
      new Paragraph({
        alignment,
        bidirectional: rtl,
        spacing: { line: 300 },
        children: [makeRun(cv.skills.join(' · '), { size: 21, rtl })],
      })
    );
  }

  // Education
  if (cv.education?.length) {
    paragraphs.push(section(rtl ? 'التعليم' : 'EDUCATION'));
    cv.education.forEach((ed) => {
      paragraphs.push(
        new Paragraph({
          alignment,
          bidirectional: rtl,
          spacing: { before: 100 },
          children: [
            makeRun(ed.degree || '', { bold: true, size: 21, rtl }),
            makeRun(ed.institution ? ` — ${ed.institution}` : '', { size: 21, rtl }),
            makeRun(ed.dates ? `  (${ed.dates})` : '', { italics: true, size: 20, color: '666666', rtl }),
          ],
        })
      );
    });
  }

  // Languages
  if (cv.languages?.length) {
    paragraphs.push(section(rtl ? 'اللغات' : 'LANGUAGES'));
    paragraphs.push(
      new Paragraph({
        alignment,
        bidirectional: rtl,
        children: [makeRun(cv.languages.join(' · '), { size: 21, rtl })],
      })
    );
  }

  return new Document({
    sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } }, children: paragraphs }],
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { type, data } = req.body;
    const doc = type === 'cv' ? buildCvDoc(data) : buildCoverLetterDoc(data);
    const buffer = await Packer.toBuffer(doc);

    const filename = type === 'cv'
      ? `${(data.cv?.name || 'CV').replace(/\s+/g, '_')}_CV.docx`
      : `${(data.candidate_name || data.cv?.name || 'CoverLetter').replace(/\s+/g, '_')}_CoverLetter.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    console.error('DOCX error:', err);
    return res.status(500).json({ error: err.message });
  }
}
