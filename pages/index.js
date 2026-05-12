import { useMemo, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function Home() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState(null);
  const [active, setActive] = useState('coverLetter');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeText = useMemo(() => {
    if (!result) return '';
    if (active === 'coverLetter') return result.coverLetter || '';
    if (active === 'cv') return result.cv || '';
    return (result.fitNotes || []).map((note, index) => `${index + 1}. ${note}`).join('\n');
  }, [result, active]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!file) return setError('Upload a CV file first.');
    if (!jobDescription.trim()) return setError('Paste the job description first.');
    setLoading(true);
    try {
      const body = new FormData();
      body.append('cv', file);
      body.append('jobDescription', jobDescription);
      const res = await fetch(`${API_BASE}/api/generate`, { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function download(type, format) {
    if (!result) return;
    const res = await fetch(`${API_BASE}/api/${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result, type }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Download failed');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type === 'cv' ? 'tailored-cv' : 'cover-letter'}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return <main className="page"><div className="wrap">
    <section className="hero">
      <div>
        <span className="badge">⚡ CV Builder for job seekers</span>
        <h1>Anyone looking for a job: do it now.</h1>
        <p>For anyone applying to jobs: upload your CV, paste each job description, and get a customised cover letter plus a tailored CV for that exact role. English and Arabic are auto-detected.</p>
        <div className="stats"><div className="stat"><strong>PDF</strong><span>CV upload</span></div><div className="stat"><strong>DOCX</strong><span>exports</span></div><div className="stat"><strong>AR/EN</strong><span>language aware</span></div></div>
      </div>
      <div className="panel">
        <p className="micro">How it works</p>
        <h2>One CV. Every job.</h2>
        <p>Upload your CV once, paste a new job description for each application, then download a customised CV and cover letter.</p>
      </div>
    </section>

    <section className="grid">
      <form className="card" onSubmit={submit}>
        <p className="micro">Start here</p>
        <h2>Create your application pack</h2>
        <div className="field"><label>CV file</label><div className="filebox"><input type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(e)=>setFile(e.target.files?.[0] || null)} />{file && <small>Selected: {file.name}</small>}</div></div>
        <div className="field"><label>Job description</label><textarea placeholder="Paste the job description here..." value={jobDescription} onChange={(e)=>setJobDescription(e.target.value)} /></div>
        {error && <div className="error">{error}</div>}
        {result && <div className="success">Generated in {result.language || 'detected language'}.</div>}
        <button className="btn" disabled={loading}>{loading ? 'Generating…' : 'Generate tailored documents'}</button>
        <p className="foot">Requires ANTHROPIC_API_KEY on the server. Uploaded files are processed in-memory.</p>
      </form>

      <div className="card">
        <div className="tabs">
          <button className={`tab ${active==='coverLetter'?'active':''}`} onClick={()=>setActive('coverLetter')}>Cover letter</button>
          <button className={`tab ${active==='cv'?'active':''}`} onClick={()=>setActive('cv')}>Tailored CV</button>
          <button className={`tab ${active==='notes'?'active':''}`} onClick={()=>setActive('notes')}>Fit notes</button>
        </div>
        <div className="result">{result ? activeText : 'Generated content will appear here.'}</div>
        <div className="actions" style={{marginTop: 16}}>
          <button className="btn secondary" disabled={!result || active==='notes'} onClick={()=>download(active === 'cv' ? 'cv' : 'cover', 'docx')}>Download DOCX</button>
          <button className="btn secondary" disabled={!result || active==='notes'} onClick={()=>download(active === 'cv' ? 'cv' : 'cover', 'pdf')}>Download PDF</button>
        </div>
      </div>
    </section>
  </div></main>;
}
