import React, { useState, useMemo, useRef } from 'react';
import {
  Calculator,
  Link2,
  Upload,
  FileCode2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  RotateCcw,
  Printer,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

const MARKING_PRESETS = [
  {
    id: 'ssc-t1',
    label: 'SSC CGL / CHSL Tier-I, CPO P-I, GD, Steno',
    correct: 2,
    wrong: 0.5,
  },
  {
    id: 'ssc-t2',
    label: 'SSC CGL / CHSL Tier-II',
    correct: 3,
    wrong: 1,
  },
  {
    id: 'ssc-mts-1',
    label: 'SSC MTS Session-I (No Negative)',
    correct: 3,
    wrong: 0,
  },
  {
    id: 'ssc-mts-2',
    label: 'SSC MTS Session-II',
    correct: 3,
    wrong: 1,
  },
  {
    id: 'ssc-je',
    label: 'SSC JE / CPO Paper-II',
    correct: 1,
    wrong: 0.25,
  },
  {
    id: 'rrb',
    label: 'RRB (NTPC / Group D / ALP / JE)',
    correct: 1,
    wrong: 1 / 3,
  },
  {
    id: 'custom',
    label: 'Custom Marking Scheme',
    correct: 1,
    wrong: 0.25,
  },
];

function generateSampleResponseHTML() {
  const sections = [
    { name: 'General Intelligence and Reasoning', count: 25, correctRate: 0.84, skipRate: 0.08 },
    { name: 'General Awareness', count: 25, correctRate: 0.56, skipRate: 0.2 },
    { name: 'Quantitative Aptitude', count: 25, correctRate: 0.76, skipRate: 0.12 },
    { name: 'English Comprehension', count: 25, correctRate: 0.8, skipRate: 0.08 },
  ];

  let qGlobal = 1;
  const sectionsHTML = sections
    .map((sec, sIdx) => {
      const panels = Array.from({ length: sec.count }, (_, idx) => {
        const qNo = qGlobal++;
        const qId = `264330${1000 + qNo}`;
        const rightOpt = ((qNo * 3 + sIdx) % 4) + 1;
        const r = ((qNo * 17 + sIdx * 31) % 100) / 100;
        let chosenOpt = '--';
        let status = 'Not Answered';
        if (r >= sec.skipRate) {
          status = 'Answered';
          if (r < sec.skipRate + sec.correctRate * (1 - sec.skipRate)) {
            chosenOpt = String(rightOpt);
          } else {
            chosenOpt = String(((rightOpt + 1) % 4) + 1);
          }
        }

        const optsHTML = [1, 2, 3, 4]
          .map((optNum) => {
            const cls = optNum === rightOpt ? 'rightAns' : 'wrngAns';
            return `<tr><td class="${cls}">${optNum}. Option ${optNum} for Q.${qNo}</td></tr>`;
          })
          .join('');

        return `
          <div class="question-pnl">
            <table class="questionRowTbl">
              <tr><td class="bold">Q.${qNo}</td><td>Sample ${sec.name} question #${idx + 1}</td></tr>
              ${optsHTML}
            </table>
            <table class="menu-tbl">
              <tr><td>Question Type :</td><td class="bold">MCQ</td></tr>
              <tr><td>Question ID :</td><td class="bold">${qId}</td></tr>
              <tr><td>Status :</td><td class="bold">${status}</td></tr>
              <tr><td>Chosen Option :</td><td class="bold">${chosenOpt}</td></tr>
            </table>
          </div>
        `;
      }).join('');

      return `
        <div class="section-cntnr">
          <div class="section-lbl"><span class="bold">${sec.name}</span></div>
          ${panels}
        </div>
      `;
    })
    .join('');

  return `
    <html>
      <body>
        <div class="main-info-tbl">
          <table>
            <tr><td>Roll Number</td><td>2201048912</td></tr>
            <tr><td>Candidate Name</td><td>AARAV SHARMA</td></tr>
            <tr><td>Venue Name</td><td>iON Digital Zone iDZ Sector 62</td></tr>
            <tr><td>Exam Date</td><td>14/10/2026</td></tr>
            <tr><td>Exam Time</td><td>9:00 AM - 10:00 AM</td></tr>
            <tr><td>Subject</td><td>Combined Graduate Level Examination 2026 Tier I</td></tr>
          </table>
        </div>
        ${sectionsHTML}
      </body>
    </html>
  `;
}

function cleanText(str) {
  return (str || '').replace(/\s+/g, ' ').trim();
}

function extractOptionNumber(text) {
  if (!text) return null;
  const cleaned = cleanText(text);
  if (cleaned === '--' || cleaned === '-' || /^not\s*(attempted|answered)/i.test(cleaned)) {
    return null;
  }
  const m = cleaned.match(/^(\d+)/) || cleaned.match(/Option\s*(\d+)/i) || cleaned.match(/\b([1-4])\b/);
  return m ? m[1] : cleaned;
}

function parseResponseSheetHTML(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Extract candidate metadata
  const info = {};
  const infoTables = doc.querySelectorAll('.main-info-tbl table, .main-info-tbl, table');
  for (const tbl of infoTables) {
    const rows = tbl.querySelectorAll('tr');
    if (rows.length >= 3 && rows.length <= 15) {
      rows.forEach((tr) => {
        const cells = tr.querySelectorAll('td, th');
        if (cells.length >= 2) {
          const key = cleanText(cells[0].textContent).replace(/:$/, '').toLowerCase();
          const val = cleanText(cells[1].textContent);
          if (!val || val.length > 120) return;
          if (key.includes('roll') && !info.rollNo) info.rollNo = val;
          else if ((key.includes('candidate') || key === 'name') && !info.name) info.name = val;
          else if (key.includes('exam date') && !info.examDate) info.examDate = val;
          else if ((key.includes('exam time') || key.includes('shift')) && !info.examTime) info.examTime = val;
          else if ((key.includes('subject') || key.includes('exam name')) && !info.subject) info.subject = val;
          else if (key.includes('venue') && !info.venue) info.venue = val;
        }
      });
    }
    if (info.rollNo || info.name) break;
  }

  const questions = [];

  // Strategy 1: TCS iON / Digialm (.section-cntnr + .question-pnl)
  const sectionContainers = doc.querySelectorAll('.section-cntnr');
  if (sectionContainers.length > 0) {
    sectionContainers.forEach((secEl, secIdx) => {
      const lblEl = secEl.querySelector('.section-lbl');
      const sectionName = cleanText(lblEl ? lblEl.textContent : '') || `Section ${secIdx + 1}`;
      const panels = secEl.querySelectorAll('.question-pnl');

      panels.forEach((pnl) => {
        const qRowTbl = pnl.querySelector('.questionRowTbl');
        const menuTbl = pnl.querySelector('.menu-tbl');

        // Question number & snippet
        let qNo = questions.length + 1;
        let qText = '';
        if (qRowTbl) {
          const firstRow = qRowTbl.querySelector('tr');
          if (firstRow) {
            const tds = firstRow.querySelectorAll('td');
            const numMatch = cleanText(tds[0]?.textContent).match(/(\d+)/);
            if (numMatch) qNo = parseInt(numMatch[1], 10);
            if (tds[1]) qText = cleanText(tds[1].textContent).slice(0, 120);
          }
        }

        // Right answer
        let rightAns = null;
        const rightEl = pnl.querySelector('.rightAns');
        if (rightEl) {
          rightAns = extractOptionNumber(rightEl.textContent);
        }

        // Chosen option & Question ID from menu-tbl
        let chosenOpt = null;
        let questionId = '';
        let statusText = '';
        if (menuTbl) {
          menuTbl.querySelectorAll('tr').forEach((tr) => {
            const cells = tr.querySelectorAll('td');
            if (cells.length >= 2) {
              const label = cleanText(cells[0].textContent).toLowerCase();
              const val = cleanText(cells[1].textContent);
              if (label.includes('chosen option')) {
                chosenOpt = extractOptionNumber(val);
              } else if (label.includes('question id')) {
                questionId = val;
              } else if (label.includes('status')) {
                statusText = val;
              }
            }
          });
        }

        if (rightAns !== null) {
          questions.push({
            qNo,
            questionId,
            section: sectionName,
            qText,
            rightAns,
            chosenOpt,
            statusText,
          });
        }
      });
    });
  }

  // Strategy 2: Flat .question-pnl without .section-cntnr
  if (questions.length === 0) {
    const panels = doc.querySelectorAll('.question-pnl');
    panels.forEach((pnl) => {
      const rightEl = pnl.querySelector('.rightAns');
      const menuTbl = pnl.querySelector('.menu-tbl');
      const qRowTbl = pnl.querySelector('.questionRowTbl');

      let qNo = questions.length + 1;
      let qText = '';
      if (qRowTbl) {
        const firstRow = qRowTbl.querySelector('tr');
        if (firstRow) {
          const tds = firstRow.querySelectorAll('td');
          const numMatch = cleanText(tds[0]?.textContent).match(/(\d+)/);
          if (numMatch) qNo = parseInt(numMatch[1], 10);
          if (tds[1]) qText = cleanText(tds[1].textContent).slice(0, 120);
        }
      }

      const rightAns = rightEl ? extractOptionNumber(rightEl.textContent) : null;
      let chosenOpt = null;
      let questionId = '';
      if (menuTbl) {
        menuTbl.querySelectorAll('tr').forEach((tr) => {
          const cells = tr.querySelectorAll('td');
          if (cells.length >= 2) {
            const label = cleanText(cells[0].textContent).toLowerCase();
            const val = cleanText(cells[1].textContent);
            if (label.includes('chosen option')) chosenOpt = extractOptionNumber(val);
            else if (label.includes('question id')) questionId = val;
          }
        });
      }

      if (rightAns !== null) {
        questions.push({
          qNo,
          questionId,
          section: 'General',
          qText,
          rightAns,
          chosenOpt,
          statusText: chosenOpt ? 'Answered' : 'Not Answered',
        });
      }
    });
  }

  // Strategy 3: Generic table-based response sheets (e.g. cbexams / ViewCandResponse.aspx)
  if (questions.length === 0) {
    const tables = doc.querySelectorAll('table');
    tables.forEach((tbl) => {
      const rows = Array.from(tbl.querySelectorAll('tr'));
      if (rows.length < 2) return;
      const headers = Array.from(rows[0].querySelectorAll('th, td')).map((c) =>
        cleanText(c.textContent).toLowerCase()
      );
      const qIdx = headers.findIndex((h) => h.includes('q.no') || h.includes('question no') || h === 'q no');
      const ansIdx = headers.findIndex(
        (h) => h.includes('correct') || h.includes('right') || h.includes('answer key')
      );
      const chosenIdx = headers.findIndex(
        (h) => h.includes('chosen') || h.includes('candidate') || h.includes('selected') || h.includes('your ans')
      );
      const secIdx = headers.findIndex((h) => h.includes('section') || h.includes('subject') || h.includes('part'));

      if (ansIdx !== -1 && chosenIdx !== -1) {
        rows.slice(1).forEach((tr) => {
          const cells = tr.querySelectorAll('td');
          if (cells.length <= Math.max(ansIdx, chosenIdx)) return;
          const rightAns = extractOptionNumber(cells[ansIdx].textContent);
          const chosenOpt = extractOptionNumber(cells[chosenIdx].textContent);
          const qNoRaw = qIdx !== -1 ? cleanText(cells[qIdx].textContent).match(/\d+/) : null;
          const qNo = qNoRaw ? parseInt(qNoRaw[0], 10) : questions.length + 1;
          const section = secIdx !== -1 ? cleanText(cells[secIdx].textContent) || 'General' : 'General';
          if (rightAns !== null) {
            questions.push({
              qNo,
              questionId: '',
              section,
              qText: '',
              rightAns,
              chosenOpt,
              statusText: chosenOpt ? 'Answered' : 'Not Answered',
            });
          }
        });
      }
    });
  }

  return { info, questions };
}

function formatNum(n) {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

export default function App() {
  const [inputMode, setInputMode] = useState('url'); // 'url' | 'file' | 'paste'
  const [urlInput, setUrlInput] = useState('');
  const [htmlPaste, setHtmlPaste] = useState('');
  const [fileName, setFileName] = useState('');
  const [presetId, setPresetId] = useState('ssc-t1');
  const [correctMark, setCorrectMark] = useState(2);
  const [wrongMark, setWrongMark] = useState(0.5);
  const [bonusMark, setBonusMark] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [copied, setCopied] = useState(false);

  const [showQuestions, setShowQuestions] = useState(false);
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef(null);

  const handlePresetChange = (id) => {
    setPresetId(id);
    const found = MARKING_PRESETS.find((p) => p.id === id);
    if (found && id !== 'custom') {
      setCorrectMark(found.correct);
      setWrongMark(found.wrong);
    }
  };

  const handleResetMarking = () => {
    const found = MARKING_PRESETS.find((p) => p.id === presetId) || MARKING_PRESETS[0];
    setCorrectMark(found.correct);
    setWrongMark(found.wrong);
    setBonusMark(0);
  };

  const processHTML = (html, sourceLabel) => {
    const result = parseResponseSheetHTML(html);
    if (!result.questions || result.questions.length === 0) {
      setErrorMsg(
        `Could not detect response sheet questions from ${sourceLabel}. Make sure it is a valid SSC / RRB / TCS iON Digialm response sheet HTML page.`
      );
      return;
    }
    setErrorMsg('');
    setParsedData(result);
    setSectionFilter('ALL');
    setStatusFilter('ALL');
    setSearchQuery('');
  };

  const handleCalculateFromURL = async (e) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMsg('Please paste your response sheet URL first.');
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      setErrorMsg('Please enter a valid URL starting with https:// or http://');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const fetchWithTimeout = async (targetUrl, timeoutMs = 10000) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(targetUrl, { signal: controller.signal });
        if (!res.ok) return '';
        const text = await res.text();
        return text && text.length > 200 ? text : '';
      } catch {
        return '';
      } finally {
        clearTimeout(timer);
      }
    };

    try {
      let html = '';
      const candidates = [
        `/api/fetch-sheet?url=${encodeURIComponent(trimmed)}`,
        trimmed,
        `https://corsproxy.io/?${encodeURIComponent(trimmed)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(trimmed)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(trimmed)}`,
      ];

      for (const candidate of candidates) {
        html = await fetchWithTimeout(candidate, 10000);
        if (html && /question-pnl|questionRowTbl|rightAns|Chosen Option/i.test(html)) {
          break;
        }
        html = '';
      }

      if (!html) {
        throw new Error('Unable to fetch response sheet HTML.');
      }

      processHTML(html, 'the URL');
    } catch {
      setErrorMsg(
        'Unable to fetch this URL directly from the browser (the exam server blocks cross-origin requests or requires your login session). Save your response sheet page as HTML (Ctrl+S) and upload it using the "Upload HTML File" tab.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        processHTML(content, file.name);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the selected HTML file.');
    };
    reader.readAsText(file);
  };

  const handlePasteCalculate = () => {
    if (!htmlPaste.trim()) {
      setErrorMsg('Please paste the HTML source of your response sheet.');
      return;
    }
    processHTML(htmlPaste, 'pasted HTML');
  };

  const handleLoadSample = () => {
    setErrorMsg('');
    setUrlInput('https://ssc.digialm.com/per/g27/pub/2207/touchstone/AssessmentQPHTMLMode1/SSC_CGL_2026_Sample.html');
    const sampleHTML = generateSampleResponseHTML();
    processHTML(sampleHTML, 'sample response sheet');
  };

  const evaluated = useMemo(() => {
    if (!parsedData) return null;
    const cVal = Number(correctMark) || 0;
    const wVal = Number(wrongMark) || 0;
    const bVal = Number(bonusMark) || 0;

    const sectionMap = new Map();
    const detailedQuestions = parsedData.questions.map((q) => {
      let outcome = 'unattempted';
      let marks = 0;
      if (q.chosenOpt !== null && q.chosenOpt !== '') {
        if (String(q.chosenOpt).toLowerCase() === String(q.rightAns).toLowerCase()) {
          outcome = 'correct';
          marks = cVal;
        } else {
          outcome = 'wrong';
          marks = -wVal;
        }
      }

      if (!sectionMap.has(q.section)) {
        sectionMap.set(q.section, {
          section: q.section,
          total: 0,
          attempted: 0,
          correct: 0,
          wrong: 0,
          unattempted: 0,
          positive: 0,
          negative: 0,
          net: 0,
          maxMarks: 0,
        });
      }
      const sec = sectionMap.get(q.section);
      sec.total += 1;
      sec.maxMarks += cVal;
      if (outcome === 'correct') {
        sec.attempted += 1;
        sec.correct += 1;
        sec.positive += cVal;
        sec.net += cVal;
      } else if (outcome === 'wrong') {
        sec.attempted += 1;
        sec.wrong += 1;
        sec.negative += wVal;
        sec.net -= wVal;
      } else {
        sec.unattempted += 1;
      }

      return { ...q, outcome, marks };
    });

    const sections = Array.from(sectionMap.values());
    const totals = sections.reduce(
      (acc, s) => ({
        total: acc.total + s.total,
        attempted: acc.attempted + s.attempted,
        correct: acc.correct + s.correct,
        wrong: acc.wrong + s.wrong,
        unattempted: acc.unattempted + s.unattempted,
        positive: acc.positive + s.positive,
        negative: acc.negative + s.negative,
        net: acc.net + s.net,
        maxMarks: acc.maxMarks + s.maxMarks,
      }),
      {
        total: 0,
        attempted: 0,
        correct: 0,
        wrong: 0,
        unattempted: 0,
        positive: 0,
        negative: 0,
        net: 0,
        maxMarks: 0,
      }
    );

    const finalScore = totals.net + bVal;
    const accuracy = totals.attempted > 0 ? (totals.correct / totals.attempted) * 100 : 0;
    const attemptPct = totals.total > 0 ? (totals.attempted / totals.total) * 100 : 0;

    return {
      sections,
      totals,
      finalScore,
      bonus: bVal,
      accuracy,
      attemptPct,
      questions: detailedQuestions,
    };
  }, [parsedData, correctMark, wrongMark, bonusMark]);

  const filteredQuestions = useMemo(() => {
    if (!evaluated) return [];
    return evaluated.questions.filter((q) => {
      if (sectionFilter !== 'ALL' && q.section !== sectionFilter) return false;
      if (statusFilter !== 'ALL' && q.outcome !== statusFilter) return false;
      if (searchQuery.trim()) {
        const sq = searchQuery.trim().toLowerCase();
        const matchNo = String(q.qNo).includes(sq);
        const matchText = (q.qText || '').toLowerCase().includes(sq);
        const matchId = (q.questionId || '').toLowerCase().includes(sq);
        if (!matchNo && !matchText && !matchId) return false;
      }
      return true;
    });
  }, [evaluated, sectionFilter, statusFilter, searchQuery]);

  const handleCopySummary = () => {
    if (!evaluated) return;
    const lines = [
      `Scorecard Summary`,
      parsedData.info?.subject ? `Exam: ${parsedData.info.subject}` : '',
      parsedData.info?.name ? `Candidate: ${parsedData.info.name}` : '',
      `Score: ${formatNum(evaluated.finalScore)} / ${formatNum(evaluated.totals.maxMarks)}`,
      `Correct: ${evaluated.totals.correct} | Wrong: ${evaluated.totals.wrong} | Unattempted: ${evaluated.totals.unattempted}`,
      `Accuracy: ${evaluated.accuracy.toFixed(1)}%`,
      '',
      ...evaluated.sections.map(
        (s) =>
          `${s.section}: ${formatNum(s.net)}/${formatNum(s.maxMarks)} (C:${s.correct}, W:${s.wrong}, U:${s.unattempted})`
      ),
    ]
      .filter(Boolean)
      .join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lines).catch(() => {});
    } else {
      const ta = document.createElement('textarea');
      ta.value = lines;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {}
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight">
                Response Sheet Marks Calculator
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Instant section-wise score & negative marking for SSC, RRB & CBT exams
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Try Sample</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Input Card */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 print:hidden">
          {/* Exam Marking Preset */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-5">
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Exam Pattern / Marking Scheme
              </label>
              <select
                value={presetId}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {MARKING_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} (+{p.correct} / −{p.wrong === 1 / 3 ? '0.33' : p.wrong})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-6 grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Correct (+)
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={correctMark}
                  onChange={(e) => {
                    setPresetId('custom');
                    setCorrectMark(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Wrong (−)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={wrongMark}
                  onChange={(e) => {
                    setPresetId('custom');
                    setWrongMark(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-rose-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Bonus
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={bonusMark}
                  onChange={(e) => setBonusMark(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Input Mode Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 mb-4">
            <button
              type="button"
              onClick={() => {
                setInputMode('url');
                setErrorMsg('');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                inputMode === 'url'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Link2 className="w-4 h-4" />
              Paste Response URL
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode('file');
                setErrorMsg('');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                inputMode === 'file'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Saved HTML (Ctrl+S)
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode('paste');
                setErrorMsg('');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                inputMode === 'paste'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileCode2 className="w-4 h-4" />
              Paste HTML Source
            </button>
          </div>

          {/* Tab Content */}
          {inputMode === 'url' && (
            <form onSubmit={handleCalculateFromURL} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://ssc.digialm.com//per/g27/pub/.../ViewCandResponse.html"
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  {loading ? 'Calculating...' : 'Calculate Marks'}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Paste the official response sheet URL from your browser address bar. If the exam portal blocks direct fetching, save the page with <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px]">Ctrl+S</kbd> and use <strong>Upload Saved HTML</strong>.
              </p>
            </form>
          )}

          {inputMode === 'file' && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/60"
              >
                <Upload className="w-7 h-7 text-indigo-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">
                  {fileName ? `Selected: ${fileName}` : 'Click to upload your saved response sheet (.html / .htm)'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Open your response sheet in browser → Press Ctrl+S → Save as Webpage, HTML Only → Upload here
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,.htm,text/html"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {inputMode === 'paste' && (
            <div className="space-y-3">
              <textarea
                rows={4}
                value={htmlPaste}
                onChange={(e) => setHtmlPaste(e.target.value)}
                placeholder="Open response sheet → Press Ctrl+U (View Source) → Ctrl+A, Ctrl+C → Paste here..."
                className="w-full rounded-xl border border-slate-300 p-3.5 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handlePasteCalculate}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
              >
                Calculate from HTML
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-sm text-rose-800">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>{errorMsg}</p>
                {inputMode === 'url' && (
                  <button
                    type="button"
                    onClick={() => setInputMode('file')}
                    className="text-xs font-semibold text-rose-700 underline hover:text-rose-900 cursor-pointer"
                  >
                    Switch to Upload Saved HTML →
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Results Section */}
        {evaluated && (
          <div className="space-y-6">
            {/* Candidate Metadata & Actions */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {parsedData.info?.name || 'Candidate Scorecard'}
                  </h2>
                  {parsedData.info?.rollNo && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      Roll No: {parsedData.info.rollNo}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  {[parsedData.info?.subject, parsedData.info?.examDate, parsedData.info?.examTime]
                    .filter(Boolean)
                    .join(' • ') || `${evaluated.totals.total} Questions Evaluated`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={handleResetMarking}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Default Marking
                </button>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Score'}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / PDF
                </button>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="col-span-2 lg:col-span-1 bg-indigo-600 text-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-medium text-indigo-100 uppercase tracking-wider">Total Marks</p>
                <p className="text-2xl sm:text-3xl font-extrabold mt-1">
                  {formatNum(evaluated.finalScore)}
                  <span className="text-sm font-normal text-indigo-200 ml-1">
                    / {formatNum(evaluated.totals.maxMarks)}
                  </span>
                </p>
                {evaluated.bonus !== 0 && (
                  <p className="text-[11px] text-indigo-100 mt-1">
                    Includes {evaluated.bonus > 0 ? `+${evaluated.bonus}` : evaluated.bonus} bonus
                  </p>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Correct</p>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{evaluated.totals.correct}</p>
                <p className="text-xs text-slate-500 mt-0.5">+{formatNum(evaluated.totals.positive)} marks</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Wrong</p>
                  <XCircle className="w-4 h-4 text-rose-500" />
                </div>
                <p className="text-2xl font-bold text-rose-600 mt-1">{evaluated.totals.wrong}</p>
                <p className="text-xs text-slate-500 mt-0.5">−{formatNum(evaluated.totals.negative)} marks</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Unattempted</p>
                  <MinusCircle className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-2xl font-bold text-slate-700 mt-1">{evaluated.totals.unattempted}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {evaluated.totals.attempted} / {evaluated.totals.total} attempted
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Accuracy</p>
                  <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-1">{evaluated.accuracy.toFixed(1)}%</p>
                <p className="text-xs text-slate-500 mt-0.5">Attempt rate {evaluated.attemptPct.toFixed(1)}%</p>
              </div>
            </div>

            {/* Section-wise Breakdown Table */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-900">Section-Wise Marks Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Section</th>
                      <th className="px-3 py-3 font-semibold text-center">Total</th>
                      <th className="px-3 py-3 font-semibold text-center">Attempted</th>
                      <th className="px-3 py-3 font-semibold text-center text-emerald-700">Correct</th>
                      <th className="px-3 py-3 font-semibold text-center text-rose-700">Wrong</th>
                      <th className="px-3 py-3 font-semibold text-center">Skipped</th>
                      <th className="px-4 py-3 font-semibold text-right">Net Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {evaluated.sections.map((sec) => (
                      <tr key={sec.section} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-medium text-slate-800">{sec.section}</td>
                        <td className="px-3 py-3 text-center text-slate-600">{sec.total}</td>
                        <td className="px-3 py-3 text-center text-slate-600">{sec.attempted}</td>
                        <td className="px-3 py-3 text-center font-semibold text-emerald-600">{sec.correct}</td>
                        <td className="px-3 py-3 text-center font-semibold text-rose-600">{sec.wrong}</td>
                        <td className="px-3 py-3 text-center text-slate-500">{sec.unattempted}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {formatNum(sec.net)}{' '}
                          <span className="text-xs font-normal text-slate-400">/ {formatNum(sec.maxMarks)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                    <tr>
                      <td className="px-4 py-3">Total (All Sections)</td>
                      <td className="px-3 py-3 text-center">{evaluated.totals.total}</td>
                      <td className="px-3 py-3 text-center">{evaluated.totals.attempted}</td>
                      <td className="px-3 py-3 text-center text-emerald-700">{evaluated.totals.correct}</td>
                      <td className="px-3 py-3 text-center text-rose-700">{evaluated.totals.wrong}</td>
                      <td className="px-3 py-3 text-center text-slate-600">{evaluated.totals.unattempted}</td>
                      <td className="px-4 py-3 text-right text-indigo-700">
                        {formatNum(evaluated.finalScore)}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          / {formatNum(evaluated.totals.maxMarks)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* Section Performance Chart */}
            {evaluated.sections.length > 1 && (
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-base font-bold text-slate-900 mb-4">Section-Wise Question Breakdown</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={evaluated.sections} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="section"
                        tick={{ fontSize: 11, fill: '#475569' }}
                        tickFormatter={(val) => (val.length > 18 ? `${val.slice(0, 18)}…` : val)}
                      />
                      <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="correct" name="Correct" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="wrong" name="Wrong" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="unattempted" name="Skipped" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* Question-by-Question Inspector */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:hidden">
              <button
                type="button"
                onClick={() => setShowQuestions((prev) => !prev)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Question-by-Question Breakdown ({evaluated.questions.length} Qs)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Inspect chosen option vs official answer key for every question
                  </p>
                </div>
                {showQuestions ? (
                  <ChevronUp className="w-5 h-5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-500" />
                )}
              </button>

              {showQuestions && (
                <div className="border-t border-slate-200 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by Q.No, Question ID, or text..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <select
                      value={sectionFilter}
                      onChange={(e) => setSectionFilter(e.target.value)}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                    >
                      <option value="ALL">All Sections</option>
                      {evaluated.sections.map((s) => (
                        <option key={s.section} value={s.section}>
                          {s.section}
                        </option>
                      ))}
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="correct">Correct Only</option>
                      <option value="wrong">Wrong Only</option>
                      <option value="unattempted">Unattempted Only</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500 sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5">Q.No</th>
                          <th className="px-3 py-2.5">Section</th>
                          <th className="px-3 py-2.5 text-center">Your Answer</th>
                          <th className="px-3 py-2.5 text-center">Correct Key</th>
                          <th className="px-3 py-2.5 text-center">Status</th>
                          <th className="px-3 py-2.5 text-right">Marks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredQuestions.map((q, i) => (
                          <tr key={`${q.section}-${q.qNo}-${i}`} className="hover:bg-slate-50">
                            <td className="px-3 py-2.5 font-semibold text-slate-800">Q.{q.qNo}</td>
                            <td className="px-3 py-2.5 text-slate-600 text-xs">{q.section}</td>
                            <td className="px-3 py-2.5 text-center font-mono text-xs">
                              {q.chosenOpt || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono text-xs font-semibold text-slate-800">
                              {q.rightAns}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {q.outcome === 'correct' && (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                  Correct
                                </span>
                              )}
                              {q.outcome === 'wrong' && (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                                  Wrong
                                </span>
                              )}
                              {q.outcome === 'unattempted' && (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                                  Skipped
                                </span>
                              )}
                            </td>
                            <td
                              className={`px-3 py-2.5 text-right font-semibold ${
                                q.marks > 0
                                  ? 'text-emerald-600'
                                  : q.marks < 0
                                  ? 'text-rose-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {q.marks > 0 ? `+${formatNum(q.marks)}` : formatNum(q.marks)}
                            </td>
                          </tr>
                        ))}
                        {filteredQuestions.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                              No questions match your current filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}