import Anthropic from '@anthropic-ai/sdk';
import formidable from 'formidable';
import fs from 'fs/promises';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

export const config = { api: { bodyParser: false } };

function parseForm(req) {
  const form = formidable({ maxFileSize: 12 * 1024 * 1024, multiples: false, keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => err ? reject(err) : resolve({ fields, files }));
  });
}

async function extractText(file) {
  const filepath = file.filepath || file.path;
  const original = (file.originalFilename || file.name || '').toLowerCase();
  const mimetype = file.mimetype || file.type || '';
  const buffer = await fs.readFile(filepath);
  if (mimetype.includes('pdf') || original.endsWith('.pdf')) {
    const parsed = await pdfParse(buffer);
    return parsed.text || '';
  }
  if (mimetype.includes('word') || original.endsWith('.docx')) {
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value || '';
  }
  return buffer.toString('utf8');
}

function cleanJson(text) {
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  return first >= 0 && last >= first ? trimmed.slice(first, last + 1) : trimmed;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });

  try {
    const { fields, files } = await parseForm(req);
    const uploaded = Array.isArray(files.cv) ? files.cv[0] : files.cv;
    const jobDescription = Array.isArray(fields.jobDescription) ? fields.jobDescription[0] : fields.jobDescription;
    if (!uploaded) return res.status(400).json({ error: 'CV file is required.' });
    if (!jobDescription?.trim()) return res.status(400).json({ error: 'Job description is required.' });

    const cvText = await extractText(uploaded);
    if (!cvText.trim()) return res.status(400).json({ error: 'Could not extract text from this CV. Try DOCX or TXT.' });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = `You are an expert bilingual career writer. Detect whether the CV/job context is primarily English or Arabic. Return ONLY valid JSON with keys: language, coverLetter, cv, fitNotes.\n\nCV TEXT:\n${cvText.slice(0, 18000)}\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 12000)}\n\nRules:\n- Tailor the CV truthfully using only evidence from the CV.\n- Do not invent employers, degrees, dates, or certifications.\n- Improve wording, structure, keywords, and relevance to the job.\n- Cover letter should be concise, professional, and role-specific.\n- fitNotes must be 4-7 short bullets explaining match strengths and gaps.\n- If Arabic, write polished Modern Standard Arabic with correct RTL-friendly text.`;

    const msg = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content?.map(part => part.type === 'text' ? part.text : '').join('\n') || '';
    const data = JSON.parse(cleanJson(text));
    return res.status(200).json({
      language: data.language || 'English',
      coverLetter: data.coverLetter || data.cover_letter || '',
      cv: data.cv || data.tailoredCv || data.tailored_cv || '',
      fitNotes: Array.isArray(data.fitNotes) ? data.fitNotes : Array.isArray(data.fit_notes) ? data.fit_notes : [],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Generation failed' });
  }
}
