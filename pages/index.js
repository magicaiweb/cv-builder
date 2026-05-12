import { useState, useRef } from 'react';
import Head from 'next/head';

const API_BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function Home() {
  const [file, setFile] = useState(null);
  const [jd, setJd] = useState('');
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);

  const tones = [
    { id: 'professional', label: 'Professional' },
    { id: 'warm', label: 'Warm' },
    { id: 'direct', label: 'Direct' },
    { id: 'executive', label: 'Executive' },
  ];

  const detectRtl = (text) => /[\u0600-\u06FF]/.test(text);

  const handleFile = (f) => {
    if (!f) return;
    const ok = /\.(pdf|docx|txt)$/i.test(f.name);
    if (!ok) {
      setError('Please upload a PDF, DOCX, or TXT file.');
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      setError('File too large (max 8MB).');
      return;
    }
    setError('');
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(',')[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const generate = async () => {
    if (!file || !jd.trim()) {
      setError('Please upload your CV and paste a job description.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const base64 = await fileToBase64(file);
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvFile: base64,
          cvFilename: file.name,
          jobDescription: jd,
          tone,
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Generation failed.');
      }
      const data = await res.json();
      setResult(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const download = async (format, type) => {
    const res = await fetch(`${API_BASE}/api/${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data: result }),
    });
    if (!res.ok) {
      setError('Download failed.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const disposition = res.headers.get('content-disposition') || '';
    const match = disposition.match(/filename="(.+?)"/);
    a.download = match ? match[1] : `${type}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isRtl = result?.language === 'ar';

  return (
    <>
      <Head>
        <title>CoverCraft — tailored CV + cover letter</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="grain" style={{ minHeight: '100vh', padding: '48px 24px 80px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Header */}
          <header style={{ marginBottom: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid #1a1a1a', paddingBottom: 16 }}>
            <div>
              <div className="mono" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.6 }}>v0.1 — local</div>
              <h1 style={{ fontWeight: 800, fontSize: 42, margin: '4px 0 0', letterSpacing: '-0.02em', fontStyle: 'italic' }}>CoverCraft</h1>
            </div>
            <div className="mono" style={{ fontSize: 11, letterSpacing: 1, opacity: 0.6, textAlign: 'right' }}>EN · العربية<br/>auto-detect</div>
          </header>

          {/* Hero */}
          <section style={{ marginBottom: 56, maxWidth: 720 }}>
            <h2 style={{ fontSize: 52, lineHeight: 1.05, fontWeight: 400, letterSpacing: '-0.03em' }}>
              Anyone looking for a job:<br/>
              <em style={{ fontWeight: 300 }}>do it now</em> —<br/>
              tailored for every role.
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, marginTop: 24, opacity: 0.75, maxWidth: 560 }}>
              Upload your CV, paste each job description, and download a customised cover letter and tailored CV as DOCX or PDF. Auto-detects English and Arabic.
            </p>
          </section>

          {/* Inputs */}
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
            {/* CV upload */}
            <div>
              <label className="mono" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>01 — Your CV</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  minHeight: 280,
                  border: `1px ${dragOver ? 'solid' : 'dashed'} #1a1a1a`,
                  background: dragOver ? '#ebe3d3' : '#faf6ee',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 20,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => handleFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />
                {file ? (
                  <>
                    <div style={{ fontSize: 18, fontStyle: 'italic', marginBottom: 8 }}>{file.name}</div>
                    <div className="mono" style={{ fontSize: 11, opacity: 0.6, letterSpacing: 1 }}>
                      {(file.size / 1024).toFixed(0)} KB · click to change
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 22, fontStyle: 'italic', marginBottom: 8 }}>Drop your CV here</div>
                    <div className="mono" style={{ fontSize: 11, opacity: 0.6, letterSpacing: 1, textTransform: 'uppercase' }}>or click to browse</div>
                    <div className="mono" style={{ fontSize: 10, opacity: 0.4, letterSpacing: 1, marginTop: 16 }}>PDF · DOCX · TXT</div>
                  </>
                )}
              </div>
            </div>

            {/* JD */}
            <div>
              <label className="mono" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>02 — Job description</label>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full job posting here…"
                dir={detectRtl(jd) ? 'rtl' : 'ltr'}
                className={detectRtl(jd) ? 'ar' : ''}
                style={{
                  width: '100%',
                  minHeight: 280,
                  padding: 20,
                  border: '1px solid #1a1a1a',
                  background: '#faf6ee',
                  fontFamily: detectRtl(jd) ? "'Noto Naskh Arabic', serif" : "'Fraunces', serif",
                  fontSize: 15,
                  lineHeight: 1.6,
                  resize: 'vertical',
                  borderRadius: 0,
                }}
              />
            </div>
          </section>

          {/* Tone */}
          <section style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <label className="mono" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>03 — Tone</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {tones.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #1a1a1a',
                    background: tone === t.id ? '#1a1a1a' : 'transparent',
                    color: tone === t.id ? '#f4efe6' : '#1a1a1a',
                    fontStyle: 'italic',
                    fontSize: 15,
                    borderRadius: 0,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          {/* Generate */}
          <section style={{ marginBottom: 48 }}>
            <button
              onClick={generate}
              disabled={loading}
              style={{
                padding: '20px 40px',
                background: '#1a1a1a',
                color: '#f4efe6',
                border: 'none',
                fontStyle: 'italic',
                fontSize: 22,
                borderRadius: 0,
                letterSpacing: '-0.01em',
              }}
            >
              {loading ? 'Crafting…' : 'Generate documents →'}
            </button>
            {error && <div style={{ marginTop: 16, color: '#8b2a2a', fontSize: 14 }}>{error}</div>}
          </section>

          {/* Results */}
          {result && (
            <section ref={resultsRef} style={{ borderTop: '1px solid #1a1a1a', paddingTop: 48 }} dir={isRtl ? 'rtl' : 'ltr'} className={isRtl ? 'ar' : ''}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24, opacity: 0.6, direction: 'ltr', textAlign: isRtl ? 'right' : 'left' }}>
                Output · {result.language === 'ar' ? 'Arabic (RTL)' : 'English'}
              </div>

              {/* Downloads */}
              <div style={{ background: '#1a1a1a', color: '#f4efe6', padding: 28, marginBottom: 32 }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16, opacity: 0.6 }}>Downloads</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <div style={{ fontSize: 18, fontStyle: 'italic', marginBottom: 12 }}>{isRtl ? 'خطاب التقديم' : 'Cover letter'}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => download('docx', 'coverLetter')} style={btn}>DOCX</button>
                      <button onClick={() => download('pdf', 'coverLetter')} style={btn}>PDF</button>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontStyle: 'italic', marginBottom: 12 }}>{isRtl ? 'السيرة الذاتية' : 'Tailored CV'}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => download('docx', 'cv')} style={btn}>DOCX</button>
                      <button onClick={() => download('pdf', 'cv')} style={btn}>PDF</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cover letter preview */}
              <div style={{ marginBottom: 32, background: '#faf6ee', border: '1px solid #1a1a1a', padding: 36 }}>
                <h3 style={{ fontSize: 28, fontWeight: 400, fontStyle: 'italic', marginBottom: 20 }}>{isRtl ? 'خطاب التقديم' : 'Cover letter'}</h3>
                <div style={{ fontSize: 15, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{result.cover_letter}</div>
              </div>

              {/* CV preview */}
              <div style={{ background: '#faf6ee', border: '1px solid #1a1a1a', padding: 36 }}>
                <h3 style={{ fontSize: 28, fontWeight: 400, fontStyle: 'italic', marginBottom: 20 }}>{isRtl ? 'السيرة الذاتية' : 'Tailored CV'}</h3>
                <div style={{ borderBottom: '1px solid #1a1a1a', paddingBottom: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 24, fontWeight: 600 }}>{result.cv.name}</div>
                  <div style={{ fontSize: 14, fontStyle: 'italic', opacity: 0.8 }}>{result.cv.headline}</div>
                </div>
                {result.cv.summary && <p style={{ marginBottom: 20, lineHeight: 1.6 }}>{result.cv.summary}</p>}
                {result.cv.experience?.map((exp, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div><strong>{exp.role}</strong>{exp.company && ` — ${exp.company}`}</div>
                    <div className="mono" style={{ fontSize: 11, opacity: 0.6 }}>{exp.dates}</div>
                    <ul style={{ paddingInlineStart: 20, marginTop: 6, fontSize: 14, lineHeight: 1.55 }}>
                      {exp.bullets?.map((b, j) => <li key={j}>{b}</li>)}
                    </ul>
                  </div>
                ))}
                {result.cv.skills?.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div className="mono" style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>{isRtl ? 'المهارات' : 'Skills'}</div>
                    <div>{result.cv.skills.join(' · ')}</div>
                  </div>
                )}
              </div>

              {result.fit_notes && (
                <div style={{ marginTop: 24, padding: 24, background: '#1a1a1a', color: '#f4efe6' }}>
                  <div className="mono" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, opacity: 0.6 }}>
                    {isRtl ? 'ملاحظات للمقابلة' : 'Interview notes'}
                  </div>
                  <p style={{ fontSize: 15, lineHeight: 1.6, fontStyle: 'italic' }}>{result.fit_notes}</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}

const btn = {
  padding: '10px 18px',
  background: 'transparent',
  color: '#f4efe6',
  border: '1px solid #f4efe6',
  fontSize: 13,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  fontFamily: 'JetBrains Mono, monospace',
  borderRadius: 0,
};
