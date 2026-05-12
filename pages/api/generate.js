import Anthropic from '@anthropic-ai/sdk';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function extractTextFromFile(base64, filename) {
  const buffer = Buffer.from(base64, 'base64');
  const lower = filename.toLowerCase();

  if (lower.endsWith('.pdf')) {
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (lower.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (lower.endsWith('.txt')) {
    return buffer.toString('utf-8');
  }
  throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT.');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cvFile, cvFilename, jobDescription, tone } = req.body;

    if (!cvFile || !jobDescription) {
      return res.status(400).json({ error: 'CV file and job description are required.' });
    }

    // Extract text from uploaded CV
    const cvText = await extractTextFromFile(cvFile, cvFilename);

    if (!cvText || cvText.trim().length < 50) {
      return res.status(400).json({ error: 'Could not extract enough text from CV. Please try a different file.' });
    }

    const prompt = `You are an expert career writer. The user provides a job description and their current CV. Produce a tailored cover letter and a reformatted CV.

Detect the dominant language of the job description (English or Arabic). Respond in that language. If Arabic, write everything naturally in Arabic.

Tone for the cover letter: ${tone || 'professional'}.

Return ONLY a valid JSON object — no preamble, no markdown fences, no commentary. Use exactly this shape:
{
  "language": "en" or "ar",
  "candidate_name": "full name from the CV",
  "candidate_contact": { "email": "...", "phone": "...", "location": "..." },
  "cover_letter": "full cover letter, salutation through sign-off. Paragraphs separated by \\n\\n. Under 300 words. Use the candidate's actual name — never placeholders like [Your Name].",
  "cv": {
    "name": "candidate full name",
    "contact": { "email": "...", "phone": "...", "location": "...", "linkedin": "..." },
    "headline": "one-line professional headline tailored to this role",
    "summary": "3-4 sentence summary tailored to the JD",
    "experience": [
      { "role": "title", "company": "company", "location": "city", "dates": "start - end", "bullets": ["achievement rewritten to mirror JD keywords", "..."] }
    ],
    "skills": ["skill1", "skill2"],
    "education": [{ "degree": "...", "institution": "...", "location": "...", "dates": "..." }],
    "languages": ["Language - level"]
  },
  "fit_notes": "2-3 sentences explaining the angle taken and what to emphasize in interviews"
}

Rules:
- Rewrite experience bullets to mirror the JD's vocabulary and priorities, but never invent facts not in the CV.
- Quantify achievements where possible using numbers already in the CV.
- If a contact field is missing, use empty string.
- If a section is missing in the CV, return an empty array.
- Output must be valid parseable JSON.

===== JOB DESCRIPTION =====
${jobDescription}

===== CV =====
${cvText}`;

    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Generation error:', err);
    return res.status(500).json({ error: err.message || 'Generation failed.' });
  }
}
