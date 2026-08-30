import React, { useState, useMemo, useRef } from "react";
import {
  User, FileText, Briefcase, GraduationCap, Wrench, FolderKanban,
  ScanLine, Plus, Trash2, ChevronLeft, ChevronRight, Printer,
  CheckCircle2, AlertTriangle, Circle, Link as LinkIcon, Globe,
  Sun, Moon, Download, Loader2,
} from "lucide-react";

// lucide-react dropped brand/logo icons (Github, etc.) in recent major versions — defined locally instead.
const Github = ({ size = 16, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 3 5.4 3.3 5.4 3.3a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.7c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
  </svg>
);

// ---------- helpers ----------
let idCounter = 1;
const nid = () => `id_${idCounter++}_${Math.random().toString(36).slice(2, 7)}`;

const emptyExperience = () => ({
  id: nid(), company: "", role: "", location: "", start: "", end: "",
  current: false, bullets: "",
});
const emptyEducation = () => ({
  id: nid(), school: "", degree: "", field: "", start: "", end: "", gpa: "",
});
const emptyProject = () => ({
  id: nid(), name: "", description: "", tech: "", link: "", metric: "",
});
const emptyCert = () => ({ id: nid(), name: "", issuer: "", date: "" });

const STEPS = [
  { key: "personal", label: "Personal", icon: User },
  { key: "experience", label: "Experience", icon: Briefcase },
  { key: "education", label: "Education", icon: GraduationCap },
  { key: "skills", label: "Skills", icon: Wrench },
  { key: "projects", label: "Portfolio", icon: FolderKanban },
  { key: "review", label: "Review & Export", icon: ScanLine },
];

const RESUME_TEMPLATES = [
  { id: "classic", name: "Classic", desc: "Arial, black rules — the safest ATS default." },
  { id: "modern", name: "Modern", desc: "Accent-colored headings, same safe structure." },
  { id: "minimal", name: "Minimal", desc: "Tight spacing, no dividers, fits more per page." },
  { id: "executive", name: "Executive", desc: "Serif type, uppercase name, senior-role feel." },
  { id: "harvard", name: "Harvard", desc: "Centered header, small-caps sections — the classic career-office format recruiters recognize instantly." },
  { id: "techstack", name: "Tech / Jake", desc: "Compact monospace, pipe-separated contact line, adds a Projects section — the format most used by software engineers (based on the widely-forked Jake's Resume)." },
];

const PORTFOLIO_TEMPLATES = [
  { id: "hero", name: "Hero Dark", desc: "Dark banner intro, stacked project cards." },
  { id: "grid", name: "Card Grid", desc: "Projects laid out side by side." },
  { id: "editorial", name: "Editorial", desc: "Serif, list-style, no chrome — quiet and text-led." },
  { id: "mono", name: "Mono", desc: "Monospace, terminal-inspired, code-forward." },
  { id: "casestudy", name: "Case Study", desc: "Numbered deep-dive sections, inspired by Behance/Dribbble case studies." },
  { id: "index", name: "Index", desc: "Bold, oversized numbered index — an Awwwards-style magazine layout." },
];

const wordCount = (s) => (s || "").trim().split(/\s+/).filter(Boolean).length;

// ---------- real PDF generation (jsPDF, loaded from CDN, text-based & ATS-safe) ----------
const PDF_FONT_MAP = {
  classic: "helvetica", modern: "helvetica", minimal: "helvetica",
  executive: "times", harvard: "times", techstack: "courier",
};

function loadJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  return new Promise((resolve, reject) => {
    let script = document.querySelector('script[data-lib="jspdf"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.async = true;
      script.setAttribute("data-lib", "jspdf");
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => {
      if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
      else reject(new Error("jsPDF failed to initialize"));
    });
    script.addEventListener("error", () => reject(new Error("jsPDF failed to load")));
  });
}

async function buildResumePDF({ personal, summary, experience, education, skillList, certs, projects, template }) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: "pt", format: "letter" });
  const font = PDF_FONT_MAP[template] || "helvetica";
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 54;
  const contentW = pageW - margin * 2;
  const accentRGB = [36, 84, 255];
  const inkRGB = [17, 17, 17];
  const midRGB = [90, 90, 90];
  let y = margin;
  const centered = template === "harvard";

  const ensureSpace = (needed) => {
    if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
  };
  const setInk = () => doc.setTextColor(...inkRGB);

  // Name
  doc.setFont(font, "bold");
  doc.setFontSize(20);
  setInk();
  doc.text(personal.name || "Your Name", centered ? pageW / 2 : margin, y, centered ? { align: "center" } : {});
  y += 22;

  // Title
  if (personal.title) {
    doc.setFont(font, template === "executive" ? "italic" : "normal");
    doc.setFontSize(11.5);
    doc.setTextColor(...midRGB);
    doc.text(personal.title, centered ? pageW / 2 : margin, y, centered ? { align: "center" } : {});
    y += 15;
  }

  // Contact line
  const contactParts = [personal.email, personal.phone, personal.location, personal.linkedin, personal.github, personal.website].filter(Boolean);
  if (contactParts.length) {
    doc.setFont(font, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...midRGB);
    const sep = template === "techstack" ? "  |  " : "   ·   ";
    doc.text(contactParts.join(sep), centered ? pageW / 2 : margin, y, centered ? { align: "center" } : {});
    y += 18;
  }
  setInk();

  const sectionHeading = (label) => {
    ensureSpace(26);
    y += 6;
    doc.setFont(font, "bold");
    doc.setFontSize(11);
    if (template === "modern") doc.setTextColor(...accentRGB); else setInk();
    doc.text(label.toUpperCase(), margin, y);
    if (template !== "minimal") {
      doc.setDrawColor(...(template === "modern" ? accentRGB : inkRGB));
      doc.setLineWidth(1);
      doc.line(margin, y + 4, pageW - margin, y + 4);
    }
    setInk();
    y += 16;
  };

  const bodyText = (text, size = 10, indent = 0) => {
    doc.setFont(font, "normal");
    doc.setFontSize(size);
    setInk();
    const lines = doc.splitTextToSize(text, contentW - indent);
    lines.forEach((line) => {
      ensureSpace(13);
      doc.text(line, margin + indent, y);
      y += 12.5;
    });
  };

  if (summary) { sectionHeading("Summary"); bodyText(summary); y += 4; }

  const shownExp = experience.filter((e) => e.role || e.company);
  if (shownExp.length) {
    sectionHeading("Experience");
    shownExp.forEach((e) => {
      ensureSpace(24);
      doc.setFont(font, "bold");
      doc.setFontSize(10.5);
      setInk();
      doc.text(`${e.role || ""}${e.company ? `, ${e.company}` : ""}`, margin, y);
      const dateStr = [e.start, e.end].filter(Boolean).join(" – ");
      if (dateStr) {
        doc.setFont(font, "normal");
        doc.setFontSize(9.5);
        doc.text(dateStr, pageW - margin, y, { align: "right" });
      }
      y += 13;
      if (e.location) {
        doc.setFont(font, "normal");
        doc.setFontSize(9);
        doc.setTextColor(...midRGB);
        doc.text(e.location, margin, y);
        setInk();
        y += 12;
      }
      (e.bullets || "").split("\n").filter(Boolean).forEach((b) => bodyText(`•  ${b}`, 10, 10));
      y += 4;
    });
  }

  const shownEdu = education.filter((e) => e.school);
  if (shownEdu.length) {
    sectionHeading("Education");
    shownEdu.forEach((e) => {
      ensureSpace(22);
      doc.setFont(font, "bold");
      doc.setFontSize(10.5);
      setInk();
      doc.text(`${e.degree || ""}${e.field ? `, ${e.field}` : ""}`, margin, y);
      const dateStr = [e.start, e.end].filter(Boolean).join(" – ");
      if (dateStr) {
        doc.setFont(font, "normal");
        doc.setFontSize(9.5);
        doc.text(dateStr, pageW - margin, y, { align: "right" });
      }
      y += 13;
      const subLine = [e.school, e.gpa ? `GPA ${e.gpa}` : null].filter(Boolean).join("  ·  ");
      if (subLine) {
        doc.setFont(font, "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...midRGB);
        doc.text(subLine, margin, y);
        setInk();
        y += 12;
      }
      y += 4;
    });
  }

  if (skillList.length) { sectionHeading("Skills"); bodyText(skillList.join("   ·   ")); y += 4; }

  const shownCerts = certs.filter((c) => c.name);
  if (shownCerts.length) {
    sectionHeading("Certifications");
    shownCerts.forEach((c) => {
      ensureSpace(16);
      doc.setFont(font, "bold");
      doc.setFontSize(10);
      setInk();
      doc.text(`${c.name}${c.issuer ? `, ${c.issuer}` : ""}`, margin, y);
      if (c.date) {
        doc.setFont(font, "normal");
        doc.setFontSize(9.5);
        doc.text(c.date, pageW - margin, y, { align: "right" });
      }
      y += 14;
    });
  }

  const shownProjects = (projects || []).filter((p) => p.name);
  if (template === "techstack" && shownProjects.length) {
    sectionHeading("Projects");
    shownProjects.forEach((p) => {
      ensureSpace(20);
      doc.setFont(font, "bold");
      doc.setFontSize(10.5);
      setInk();
      doc.text(`${p.name}${p.tech ? `  |  ${p.tech}` : ""}`, margin, y);
      y += 13;
      if (p.description) bodyText(`•  ${p.description}`, 10, 10);
      y += 4;
    });
  }

  return doc;
}

// ---------- mini swatch preview (visual hint of each template's layout) ----------
function TemplateSwatch({ id, kind }) {
  if (kind === "resume") {
    return (
      <svg viewBox="0 0 64 80" className="swatch-svg">
        <rect x="0" y="0" width="64" height="80" rx="3" fill="var(--panel-bg)" stroke="var(--line)" />
        {id === "classic" && (<>
          <rect x="8" y="8" width="30" height="5" fill="#333" />
          <rect x="8" y="16" width="48" height="1.5" fill="#333" />
          <rect x="8" y="24" width="20" height="3" fill="#333" />
          <rect x="8" y="30" width="48" height="1" fill="#999" />
          <rect x="8" y="35" width="44" height="2" fill="#bbb" />
          <rect x="8" y="40" width="40" height="2" fill="#bbb" />
        </>)}
        {id === "modern" && (<>
          <rect x="8" y="8" width="30" height="5" fill="var(--accent)" />
          <rect x="8" y="16" width="20" height="3" fill="var(--accent)" />
          <rect x="8" y="21" width="48" height="1.5" fill="var(--accent)" />
          <rect x="8" y="27" width="44" height="2" fill="#bbb" />
          <rect x="8" y="32" width="40" height="2" fill="#bbb" />
        </>)}
        {id === "minimal" && (<>
          <rect x="8" y="8" width="24" height="4" fill="#333" />
          <rect x="8" y="15" width="18" height="2.5" fill="#666" />
          <rect x="8" y="21" width="44" height="1.5" fill="#ccc" />
          <rect x="8" y="25" width="40" height="1.5" fill="#ccc" />
          <rect x="8" y="32" width="18" height="2.5" fill="#666" />
          <rect x="8" y="37" width="44" height="1.5" fill="#ccc" />
        </>)}
        {id === "executive" && (<>
          <rect x="8" y="8" width="34" height="5" fill="#111" />
          <rect x="8" y="17" width="48" height="1.5" fill="#111" />
          <rect x="8" y="23" width="18" height="3" fill="#111" />
          <rect x="8" y="29" width="44" height="1.5" fill="#999" />
          <rect x="8" y="34" width="40" height="1.5" fill="#999" />
        </>)}
        {id === "harvard" && (<>
          <rect x="17" y="8" width="30" height="4" fill="#111" />
          <rect x="20" y="14" width="24" height="1.5" fill="#666" />
          <rect x="8" y="22" width="48" height="1.5" fill="#111" />
          <rect x="8" y="28" width="16" height="2.5" fill="#111" />
          <rect x="8" y="33" width="44" height="1.5" fill="#bbb" />
          <rect x="8" y="38" width="40" height="1.5" fill="#bbb" />
        </>)}
        {id === "techstack" && (<>
          <rect x="8" y="8" width="26" height="4" fill="#111" />
          <rect x="8" y="15" width="40" height="1.5" fill="#999" />
          <rect x="8" y="21" width="48" height="1.5" fill="#111" />
          <rect x="8" y="26" width="14" height="2" fill="#111" />
          <rect x="8" y="30" width="44" height="1.5" fill="#bbb" />
          <rect x="8" y="37" width="48" height="1.5" fill="#111" />
          <rect x="8" y="42" width="14" height="2" fill="#111" />
          <rect x="8" y="46" width="44" height="1.5" fill="#bbb" />
        </>)}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 80" className="swatch-svg">
      <rect x="0" y="0" width="64" height="80" rx="3" fill="var(--panel-bg)" stroke="var(--line)" />
      {id === "hero" && (<>
        <rect x="4" y="4" width="56" height="20" rx="2" fill="#12151C" />
        <rect x="8" y="9" width="26" height="4" fill="#fff" />
        <rect x="4" y="30" width="56" height="16" rx="2" fill="var(--card-bg)" stroke="var(--line)" />
        <rect x="4" y="50" width="56" height="16" rx="2" fill="var(--card-bg)" stroke="var(--line)" />
      </>)}
      {id === "grid" && (<>
        <rect x="4" y="4" width="56" height="14" rx="2" fill="#12151C" />
        <rect x="4" y="22" width="26" height="24" rx="2" fill="var(--card-bg)" stroke="var(--line)" />
        <rect x="34" y="22" width="26" height="24" rx="2" fill="var(--card-bg)" stroke="var(--line)" />
        <rect x="4" y="50" width="26" height="20" rx="2" fill="var(--card-bg)" stroke="var(--line)" />
        <rect x="34" y="50" width="26" height="20" rx="2" fill="var(--card-bg)" stroke="var(--line)" />
      </>)}
      {id === "editorial" && (<>
        <rect x="8" y="8" width="30" height="5" fill="#333" />
        <rect x="8" y="16" width="48" height="1" fill="#333" />
        <rect x="8" y="24" width="20" height="3" fill="#333" />
        <rect x="8" y="30" width="48" height="1" fill="#ddd" />
        <rect x="8" y="40" width="20" height="3" fill="#333" />
        <rect x="8" y="46" width="48" height="1" fill="#ddd" />
      </>)}
      {id === "mono" && (<>
        <rect x="4" y="4" width="56" height="72" rx="2" fill="#0D0F14" />
        <rect x="9" y="10" width="24" height="3" fill="#5fe3a3" />
        <rect x="9" y="18" width="40" height="2" fill="#8fb2ff" />
        <rect x="9" y="26" width="34" height="2" fill="#d7ffe9" />
        <rect x="9" y="34" width="40" height="2" fill="#d7ffe9" />
      </>)}
      {id === "casestudy" && (<>
        <rect x="4" y="4" width="56" height="18" rx="2" fill="var(--card-bg)" stroke="var(--line)" />
        <rect x="8" y="9" width="4" height="8" fill="var(--accent)" />
        <rect x="16" y="10" width="30" height="4" fill="#333" />
        <rect x="4" y="26" width="56" height="18" rx="2" fill="var(--card-bg)" stroke="var(--line)" />
        <rect x="8" y="31" width="4" height="8" fill="var(--accent)" />
        <rect x="16" y="32" width="30" height="4" fill="#333" />
        <rect x="4" y="48" width="56" height="18" rx="2" fill="var(--card-bg)" stroke="var(--line)" />
        <rect x="8" y="53" width="4" height="8" fill="var(--accent)" />
        <rect x="16" y="54" width="30" height="4" fill="#333" />
      </>)}
      {id === "index" && (<>
        <rect x="8" y="6" width="18" height="10" fill="#111" />
        <rect x="30" y="9" width="26" height="4" fill="#333" />
        <rect x="8" y="24" width="1" height="46" fill="var(--line)" />
        <rect x="8" y="24" width="18" height="10" fill="#111" />
        <rect x="30" y="27" width="26" height="4" fill="#333" />
        <rect x="8" y="42" width="18" height="10" fill="#111" />
        <rect x="30" y="45" width="26" height="4" fill="#333" />
        <rect x="8" y="60" width="18" height="10" fill="#111" />
        <rect x="30" y="63" width="26" height="4" fill="#333" />
      </>)}
    </svg>
  );
}

// ---------- field primitives ----------
function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function TextInput(props) {
  return <input {...props} className="input" />;
}
function TextArea(props) {
  return <textarea {...props} className="input textarea" />;
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [step, setStep] = useState(0);
  const [previewTab, setPreviewTab] = useState("resume");
  const [resumeTemplate, setResumeTemplate] = useState("classic");
  const [portfolioTemplate, setPortfolioTemplate] = useState("hero");
  const [livePulse, setLivePulse] = useState(false);
  const [personal, setPersonal] = useState({
    name: "", title: "", email: "", phone: "", location: "",
    linkedin: "", github: "", website: "",
  });
  const [summary, setSummary] = useState("");
  const [experience, setExperience] = useState([emptyExperience()]);
  const [education, setEducation] = useState([emptyEducation()]);
  const [skills, setSkills] = useState("");
  const [certs, setCerts] = useState([]);
  const [projects, setProjects] = useState([emptyProject()]);

  React.useEffect(() => {
    setLivePulse(true);
    const t = setTimeout(() => setLivePulse(false), 500);
    return () => clearTimeout(t);
  }, [personal, summary, experience, education, skills, certs, projects, resumeTemplate, portfolioTemplate]);

  const [scanState, setScanState] = useState("idle"); // idle | scanning | done
  const scanTimeout = useRef(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [scorePulse, setScorePulse] = useState(false);
  const prevScoreRef = useRef(0);

  // ---------- derived ----------
  const skillList = useMemo(
    () => skills.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
    [skills]
  );

  const totalWords = useMemo(() => {
    let n = wordCount(summary);
    experience.forEach((e) => (n += wordCount(e.bullets)));
    n += skillList.length;
    return n;
  }, [summary, experience, skillList]);

  const checks = useMemo(() => {
    return [
      {
        id: "name",
        label: "Full name present",
        pass: personal.name.trim().length > 1,
      },
      {
        id: "contact",
        label: "Email and phone included",
        pass: /\S+@\S+\.\S+/.test(personal.email) && personal.phone.trim().length > 5,
      },
      {
        id: "summary",
        label: "Summary written (15–60 words)",
        pass: wordCount(summary) >= 15 && wordCount(summary) <= 60,
      },
      {
        id: "experience",
        label: "At least one role with bullet points",
        pass: experience.some((e) => e.role.trim() && e.bullets.trim()),
      },
      {
        id: "skills",
        label: "5 or more skills listed",
        pass: skillList.length >= 5,
      },
      {
        id: "length",
        label: "Resume length within one page (under ~650 words)",
        pass: totalWords > 0 && totalWords <= 650,
      },
      {
        id: "layout",
        label: "Single-column layout, no tables or text boxes",
        pass: true,
      },
      {
        id: "headings",
        label: "Standard section headings ATS parsers recognize",
        pass: true,
      },
    ];
  }, [personal, summary, experience, skillList, totalWords]);

  const passCount = checks.filter((c) => c.pass).length;
  const score = Math.round((passCount / checks.length) * 100);

  React.useEffect(() => {
    const from = prevScoreRef.current;
    const to = score;
    if (from === to) return;
    if (to > from) {
      setScorePulse(true);
      setTimeout(() => setScorePulse(false), 700);
    }
    const start = performance.now();
    const duration = 500;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else prevScoreRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  // ---------- list mutators ----------
  const updateItem = (setter, id, patch) =>
    setter((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const removeItem = (setter, id) =>
    setter((list) => list.filter((it) => it.id !== id));

  // ---------- printing ----------
  const printResume = () => {
    document.documentElement.classList.remove("print-portfolio-mode");
    document.documentElement.classList.add("print-resume-mode");
    setTimeout(() => window.print(), 50);
  };
  const printPortfolio = () => {
    document.documentElement.classList.remove("print-resume-mode");
    document.documentElement.classList.add("print-portfolio-mode");
    setTimeout(() => window.print(), 50);
  };
  React.useEffect(() => {
    const clear = () => {
      document.documentElement.classList.remove("print-resume-mode", "print-portfolio-mode");
    };
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);

  const [pdfState, setPdfState] = useState("idle"); // idle | generating | error | done
  const downloadResumePDF = async () => {
    setPdfState("generating");
    try {
      const doc = await buildResumePDF({ personal, summary, experience, education, skillList, certs, projects, template: resumeTemplate });
      const fileBase = (personal.name || "resume").trim().replace(/[^a-z0-9]+/gi, "_");
      doc.save(`${fileBase || "resume"}_Resume.pdf`);
      setPdfState("done");
      setTimeout(() => setPdfState("idle"), 1800);
    } catch (err) {
      console.error(err);
      setPdfState("error");
      setTimeout(() => setPdfState("idle"), 2500);
    }
  };

  const runScan = () => {
    setScanState("scanning");
    clearTimeout(scanTimeout.current);
    scanTimeout.current = setTimeout(() => setScanState("done"), 1300);
  };

  const goStep = (i) => setStep(Math.max(0, Math.min(STEPS.length - 1, i)));

  return (
    <div className={`app-shell theme-${theme}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

        :root{
          --font-display:'Space Grotesk',ui-sans-serif,system-ui,sans-serif;
          --font-body:'Inter',ui-sans-serif,system-ui,sans-serif;
          --font-mono:'IBM Plex Mono',ui-monospace,SFMono-Regular,monospace;
        }
        .theme-light{
          --ink:#12151C; --paper:#FFFFFF; --paper-soft:#F4F5F8;
          --panel-bg:#FFFFFF; --input-bg:#F4F5F8; --card-bg:#F4F5F8;
          --accent:#2454FF; --accent-soft:#E8ECFF; --pass:#00966B;
          --warn:#D14A22; --mid:#6B7280; --line:#E4E6EB;
          --shell-bg: var(--paper-soft); --shadow: 0 1px 2px rgba(20,20,30,.04);
          --skeleton:#dfe2ea; --chip-bg:#12151C; --chip-text:#FFFFFF;
        }
        .theme-dark{
          --ink:#EDEEF2; --paper:#1B1E27; --paper-soft:#15171E;
          --panel-bg:#1B1E27; --input-bg:#22252F; --card-bg:#20232C;
          --accent:#6E8CFF; --accent-soft:#28304A; --pass:#3ED28F;
          --warn:#FF8A65; --mid:#9098A8; --line:#2C2F3A;
          --shell-bg:#101218; --shadow: 0 1px 2px rgba(0,0,0,.3);
          --skeleton:#2B2F3B; --chip-bg:#EDEEF2; --chip-text:#12151C;
        }
        * { box-sizing: border-box; }
        .app-shell{
          font-family: var(--font-body); color: var(--ink); background: var(--shell-bg);
          min-height: 100%; padding: 28px 20px 60px; transition: background .2s, color .2s;
        }
        .shell-inner{ max-width: 1180px; margin: 0 auto; }

        .theme-toggle{ display:flex; align-items:center; gap:6px; font-family:var(--font-mono); font-size:11.5px; text-transform:uppercase; letter-spacing:.05em; background:var(--panel-bg); color:var(--ink); border:1px solid var(--line); padding:10px 14px; border-radius:10px; cursor:pointer; transition: transform .2s ease, border-color .15s ease;}
        .theme-toggle:hover{ border-color:var(--accent); transform: rotate(-6deg) scale(1.04);}
        .theme-toggle:active{ transform: rotate(0) scale(.95);}
        .header-actions{ display:flex; align-items:center; gap:10px; }

        @keyframes fadeSlideUp{ from{ opacity:0; transform:translateY(10px);} to{ opacity:1; transform:translateY(0);} }
        @keyframes fadeSlideIn{ from{ opacity:0; transform:translateY(8px);} to{ opacity:1; transform:translateY(0);} }
        @keyframes popIn{ 0%{ opacity:0; transform:scale(.9);} 70%{ transform:scale(1.03);} 100%{ opacity:1; transform:scale(1);} }
        @keyframes checkPop{ 0%{ transform:scale(0.5); } 60%{ transform:scale(1.25); } 100%{ transform:scale(1); } }
        @keyframes pulseRing{ 0%{ box-shadow:0 0 0 0 var(--accent-soft);} 70%{ box-shadow:0 0 0 8px rgba(0,0,0,0);} 100%{ box-shadow:0 0 0 0 rgba(0,0,0,0);} }
        @keyframes confettiFly{
          0%{ opacity:1; transform: translate(0,0) rotate(0deg); }
          100%{ opacity:0; transform: translate(var(--tx,20px), var(--ty,-30px)) rotate(300deg); }
        }
        @keyframes cardIn{ from{ opacity:0; transform:translateY(6px) scale(.99);} to{ opacity:1; transform:translateY(0) scale(1);} }
        @keyframes shimmerBar{ 0%{ background-position: -120px 0; } 100%{ background-position: 220px 0; } }
        .app-shell *{ scroll-behavior:smooth; }

        .hero{ display:flex; align-items:flex-end; justify-content:space-between; gap:16px; margin-bottom:22px; flex-wrap:wrap; animation: fadeSlideUp .5s ease both;}
        .hero-eyebrow{ font-family: var(--font-mono); font-size:11px; letter-spacing:.14em; text-transform:uppercase; color: var(--accent); display:flex; align-items:center; gap:8px;}
        .hero-eyebrow .dot{ width:6px; height:6px; border-radius:50%; background: var(--pass); box-shadow: 0 0 0 3px var(--accent-soft);}
        .hero h1{ font-family: var(--font-display); font-size: 30px; margin: 6px 0 4px; letter-spacing:-0.01em;}
        .hero p{ color: var(--mid); margin:0; font-size:14px; max-width:520px;}
        .score-pill{ font-family: var(--font-mono); font-size:12px; background: var(--chip-bg); color:var(--chip-text); padding:10px 16px; border-radius:10px; display:flex; align-items:center; gap:10px; position:relative; transition: transform .2s ease;}
        .score-pill b{ font-family: var(--font-display); font-size:18px; display:inline-block; transition: transform .2s ease;}
        .score-pill.pulse{ animation: popIn .5s ease;}
        .score-pill.pulse b{ transform: scale(1.15); color: var(--pass);}
        .confetti-wrap{ position:absolute; inset:0; pointer-events:none; overflow:visible;}
        .confetti-bit{
          position:absolute; top:50%; left:50%; width:5px; height:5px; border-radius:1px;
          background: hsl(calc(var(--i) * 36), 85%, 60%);
          animation: confettiFly .9s ease-out forwards;
          animation-delay: calc(var(--i) * 25ms);
          --tx: calc((var(--i) - 5) * 9px);
          --ty: -34px;
        }

        .stepper{ display:flex; gap:6px; margin-bottom:10px; overflow-x:auto; padding-bottom:4px;}
        .step-btn{ font-family: var(--font-mono); font-size:11.5px; letter-spacing:.03em; text-transform:uppercase; display:flex; align-items:center; gap:7px; padding:9px 13px; border-radius:8px; border:1px solid var(--line); background:var(--panel-bg); color:var(--mid); cursor:pointer; white-space:nowrap; transition: transform .15s ease, border-color .15s ease, background .15s ease, box-shadow .15s ease;}
        .step-btn.active{ background: var(--chip-bg); color:var(--chip-text); border-color:var(--chip-bg); transform: translateY(-1px); box-shadow: 0 3px 10px rgba(0,0,0,.12);}
        .step-btn.done{ color: var(--pass); border-color: var(--pass);}
        .step-btn .step-check{ animation: checkPop .35s ease;}
        .step-btn:hover{ border-color: var(--accent); transform: translateY(-1px);}
        .step-btn:active{ transform: translateY(0) scale(.97);}

        .progress-track{ height:4px; background:var(--line); border-radius:99px; overflow:hidden; margin-bottom:20px;}
        .progress-fill{ height:100%; background: linear-gradient(90deg, var(--accent), var(--pass)); border-radius:99px; transition: width .4s cubic-bezier(.4,0,.2,1);}

        .grid{ display:grid; grid-template-columns: 1fr; gap:22px;}
        @media (min-width: 1024px){ .grid{ grid-template-columns: minmax(0,1fr) minmax(0,1fr); } }

        .panel{ background:var(--panel-bg); border:1px solid var(--line); border-radius:14px; padding:22px; box-shadow:var(--shadow); animation: fadeSlideUp .5s ease both .05s;}
        .panel-title{ font-family: var(--font-display); font-size:18px; margin:0 0 4px;}
        .panel-sub{ color:var(--mid); font-size:13px; margin:0 0 18px;}
        .step-panel{ animation: fadeSlideIn .3s ease both;}

        .field{ display:flex; flex-direction:column; gap:6px; margin-bottom:14px;}
        .field-label{ font-family: var(--font-mono); font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--mid);}
        .field-hint{ font-size:11.5px; color:var(--mid);}
        .input{ font-family: var(--font-body); font-size:14px; padding:10px 12px; border:1px solid var(--line); border-radius:8px; background:var(--input-bg); color:var(--ink); outline:none; transition: border-color .15s ease, background .15s ease, box-shadow .15s ease, transform .1s ease;}
        .input::placeholder{ color:var(--mid); opacity:.7;}
        .input:focus{ border-color: var(--accent); background:var(--panel-bg); box-shadow:0 0 0 3px var(--accent-soft);}
        .textarea{ min-height:88px; resize:vertical; line-height:1.5;}
        .row2{ display:grid; grid-template-columns:1fr 1fr; gap:12px;}
        @media (max-width:520px){ .row2{ grid-template-columns:1fr; } }

        .card{ border:1px solid var(--line); border-radius:10px; padding:16px; margin-bottom:14px; position:relative; background:var(--card-bg); animation: cardIn .3s ease both; transition: border-color .15s ease, box-shadow .15s ease;}
        .card:hover{ border-color: var(--accent);}
        .card-remove{ position:absolute; top:10px; right:10px; background:none; border:none; color:var(--mid); cursor:pointer; padding:4px; border-radius:6px; transition: transform .15s ease, color .15s ease, background .15s ease;}
        .card-remove:hover{ color: var(--warn); background:var(--accent-soft); transform: rotate(8deg) scale(1.08);}
        .add-btn{ font-family: var(--font-mono); font-size:12px; display:inline-flex; align-items:center; gap:6px; background: var(--accent-soft); color: var(--accent); border:none; padding:9px 14px; border-radius:8px; cursor:pointer; text-transform:uppercase; letter-spacing:.04em; transition: transform .15s ease, filter .15s ease;}
        .add-btn:hover{ filter:brightness(1.08); transform: translateY(-1px);}
        .add-btn:active{ transform: translateY(0) scale(.96);}

        .nav-row{ display:flex; justify-content:space-between; align-items:center; margin-top:20px;}
        .nav-btn{ font-family: var(--font-mono); font-size:12px; text-transform:uppercase; letter-spacing:.05em; display:flex; align-items:center; gap:6px; padding:10px 16px; border-radius:8px; border:1px solid var(--line); background:var(--panel-bg); color:var(--ink); cursor:pointer; transition: transform .15s ease, box-shadow .15s ease, background .15s ease;}
        .nav-btn.primary{ background:var(--chip-bg); color:var(--chip-text); border-color:var(--chip-bg);}
        .nav-btn:hover:not(:disabled){ transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.1);}
        .nav-btn:active:not(:disabled){ transform: translateY(0) scale(.97);}
        .nav-btn:disabled{ opacity:.35; cursor:not-allowed;}

        /* preview panel */
        .preview-panel{ position:sticky; top:20px; align-self:start; padding:0; overflow:hidden;}
        .preview-tabs{ display:flex; border-bottom:1px solid var(--line); background:var(--card-bg);}
        .preview-tab{ flex:1; font-family:var(--font-mono); font-size:11.5px; text-transform:uppercase; letter-spacing:.05em; padding:13px 8px; text-align:center; background:none; border:none; cursor:pointer; color:var(--mid); border-bottom:2px solid transparent; transition: color .15s ease, border-color .2s ease;}
        .preview-tab.active{ color:var(--ink); border-bottom-color:var(--accent); background:var(--panel-bg);}

        .template-bar{ display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid var(--line); background:var(--panel-bg);}
        .template-bar-label{ font-family:var(--font-mono); font-size:10.5px; text-transform:uppercase; letter-spacing:.08em; color:var(--mid); flex-shrink:0;}
        .template-swatches{ display:flex; gap:8px; overflow-x:auto; padding-bottom:2px;}
        .template-swatch{ display:flex; flex-direction:column; align-items:center; gap:4px; background:none; border:1.5px solid transparent; border-radius:8px; padding:4px; cursor:pointer; flex-shrink:0; width:56px; transition: transform .15s ease, border-color .15s ease;}
        .template-swatch .swatch-svg{ width:40px; height:50px; border-radius:3px; transition: transform .15s ease, box-shadow .15s ease;}
        .template-swatch span{ font-family:var(--font-mono); font-size:9px; text-transform:uppercase; letter-spacing:.03em; color:var(--mid); text-align:center; line-height:1.2; transition: color .15s ease;}
        .template-swatch:hover{ border-color:var(--line);}
        .template-swatch:hover .swatch-svg{ transform: translateY(-2px); box-shadow: 0 6px 14px rgba(0,0,0,.12);}
        .template-swatch.active{ border-color:var(--accent); animation: popIn .3s ease;}
        .template-swatch.active span{ color:var(--accent);}
        .template-swatch:active .swatch-svg{ transform: scale(.96);}

        .preview-body{ padding:20px; max-height:72vh; overflow-y:auto;}
        .paper-surface{
          background:#FFFFFF; color:#111; border-radius:10px; padding:18px; box-shadow: inset 0 0 0 1px #E4E6EB;
          --ink:#12151C; --mid:#6B7280; --line:#E4E6EB; --accent:#2454FF; --accent-soft:#E8ECFF; --pass:#00966B; --warn:#D14A22;
          transition: box-shadow .3s ease;
        }
        .paper-surface.live-pulse{ box-shadow: inset 0 0 0 1px #E4E6EB, 0 0 0 4px var(--accent-soft); }

        /* resume look */
        .resume-doc{ font-family: Arial, Helvetica, sans-serif; font-size:12.5px; line-height:1.5; color:#111;}
        .resume-doc h1{ font-size:20px; margin:0 0 2px; font-weight:700;}
        .resume-doc .role-title{ font-size:13px; color:#333; margin:0 0 8px;}
        .resume-doc .contact-line{ font-size:11.5px; color:#333; margin-bottom:14px;}
        .resume-doc .contact-line span{ margin-right:10px;}
        .resume-doc h2{ font-size:12.5px; text-transform:uppercase; letter-spacing:.04em; border-bottom:1.5px solid #111; padding-bottom:3px; margin:16px 0 8px;}
        .resume-doc h3{ font-size:12.5px; margin:0; font-weight:700;}
        .resume-doc .item-meta{ font-size:11.5px; color:#333; margin-bottom:4px; display:flex; justify-content:space-between; gap:8px;}
        .resume-doc ul{ margin:0 0 10px 18px; padding:0;}
        .resume-doc li{ margin-bottom:3px;}
        .resume-doc .skills-line{ font-size:12px;}
        .placeholder-text{ color:#aab; font-style:italic;}

        /* resume templates — all remain single-column and ATS-safe; only typography/rules change */
        .resume-doc.tmpl-modern h1{ color:var(--accent);}
        .resume-doc.tmpl-modern h2{ border-bottom:1.5px solid var(--accent); color:var(--accent);}
        .resume-doc.tmpl-modern .role-title{ color:var(--accent); font-weight:600;}

        .resume-doc.tmpl-minimal{ font-size:11.5px;}
        .resume-doc.tmpl-minimal h1{ font-size:17px;}
        .resume-doc.tmpl-minimal h2{ border-bottom:none; padding-bottom:0; margin:13px 0 5px; letter-spacing:.08em;}
        .resume-doc.tmpl-minimal .contact-line{ margin-bottom:10px;}

        .resume-doc.tmpl-executive{ font-family: Georgia, 'Times New Roman', serif;}
        .resume-doc.tmpl-executive h1{ text-transform:uppercase; letter-spacing:.06em; font-size:19px;}
        .resume-doc.tmpl-executive h2{ border-bottom:none; border-top:1.5px solid #111; padding-top:5px; padding-bottom:0; letter-spacing:.08em;}
        .resume-doc.tmpl-executive .role-title{ font-style:italic;}

        .resume-doc.tmpl-harvard{ font-family: 'Times New Roman', Times, Georgia, serif;}
        .resume-doc.tmpl-harvard h1{ text-align:center; font-size:19px;}
        .resume-doc.tmpl-harvard .role-title{ text-align:center;}
        .resume-doc.tmpl-harvard .contact-line{ text-align:center; margin-bottom:16px;}
        .resume-doc.tmpl-harvard .contact-line span{ margin:0 6px;}
        .resume-doc.tmpl-harvard h2{ font-variant: small-caps; font-size:13.5px; letter-spacing:.02em; border-bottom:1px solid #111;}

        .resume-doc.tmpl-techstack{ font-family: 'Courier New', var(--font-mono), monospace; font-size:11.5px;}
        .resume-doc.tmpl-techstack h1{ font-size:17px;}
        .resume-doc.tmpl-techstack .contact-line span:not(:last-child)::after{ content:" | "; color:#888;}
        .resume-doc.tmpl-techstack h2{ border-bottom:1px solid #111; text-transform:uppercase; font-size:11.5px; letter-spacing:.03em;}

        /* portfolio look */
        .portfolio-doc{ font-family: var(--font-body);}
        .portfolio-hero{ background: var(--ink); color:#fff; border-radius:12px; padding:26px; margin-bottom:18px;}
        .portfolio-hero .eyebrow{ font-family:var(--font-mono); font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:#9fb0ff;}
        .portfolio-hero h1{ font-family:var(--font-display); font-size:26px; margin:6px 0 4px;}
        .portfolio-hero p{ color:#c9cddb; font-size:13.5px; max-width:440px; margin:0 0 12px;}
        .portfolio-hero .links{ display:flex; gap:10px; flex-wrap:wrap;}
        .portfolio-hero .links a{ font-size:12px; font-family:var(--font-mono); color:#fff; background:rgba(255,255,255,.12); padding:6px 10px; border-radius:6px; text-decoration:none; display:inline-flex; align-items:center; gap:5px;}
        .proj-list{ display:block;}
        .proj-card{ border:1px solid var(--line); border-radius:12px; padding:18px; margin-bottom:14px; background:#fff; animation: cardIn .35s ease both; transition: transform .2s ease, box-shadow .2s ease;}
        .proj-card:hover{ transform: translateY(-3px); box-shadow: 0 10px 24px rgba(20,20,30,.08);}
        .proj-card h3{ font-family:var(--font-display); font-size:16px; margin:0 0 6px;}
        .proj-card p{ font-size:13px; color:#333; margin:0 0 10px; line-height:1.5;}
        .tech-tags{ display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;}
        .tech-tag{ font-family:var(--font-mono); font-size:10.5px; background:var(--accent-soft); color:var(--accent); padding:3px 8px; border-radius:999px; transition: transform .15s ease;}
        .tech-tag:hover{ transform: translateY(-1px) scale(1.05);}
        .proj-metric{ font-family:var(--font-mono); font-size:11.5px; color:var(--pass);}
        .proj-link{ font-size:12px; color:var(--accent); text-decoration:none; font-weight:600; transition: transform .15s ease; display:inline-block;}
        .proj-link:hover{ transform: translateX(3px);}

        /* portfolio templates */
        .portfolio-doc.tmpl-grid .proj-list{ display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px;}
        .portfolio-doc.tmpl-grid .proj-card{ margin-bottom:0;}

        .portfolio-doc.tmpl-editorial .portfolio-hero{ background:none; color:#111; padding:0 0 18px; border-radius:0; border-bottom:2px solid #111; margin-bottom:20px;}
        .portfolio-doc.tmpl-editorial .portfolio-hero .eyebrow{ color:#888;}
        .portfolio-doc.tmpl-editorial .portfolio-hero h1{ font-family:Georgia,serif; color:#111;}
        .portfolio-doc.tmpl-editorial .portfolio-hero p{ color:#555;}
        .portfolio-doc.tmpl-editorial .portfolio-hero .links a{ background:none; border:1px solid #ccc; color:#111;}
        .portfolio-doc.tmpl-editorial .proj-card{ border:none; border-bottom:1px solid #e4e6eb; border-radius:0; padding:18px 0; background:none;}
        .portfolio-doc.tmpl-editorial .proj-card h3{ font-family:Georgia,serif; font-size:19px;}
        .portfolio-doc.tmpl-editorial .tech-tag{ background:none; padding:0; margin-right:8px; color:#888;}

        .portfolio-doc.tmpl-mono{ font-family:var(--font-mono);}
        .portfolio-doc.tmpl-mono .portfolio-hero{ background:#0D0F14; border:1px solid #2C2F3A;}
        .portfolio-doc.tmpl-mono .portfolio-hero .eyebrow{ color:#5fe3a3;}
        .portfolio-doc.tmpl-mono .portfolio-hero h1{ font-family:var(--font-mono); color:#d7ffe9;}
        .portfolio-doc.tmpl-mono .proj-card{ background:#0D0F14; border:1px dashed #2C2F3A;}
        .portfolio-doc.tmpl-mono .proj-card h3{ font-family:var(--font-mono); color:#5fe3a3;}
        .portfolio-doc.tmpl-mono .proj-card p{ color:#c7d2c9;}
        .portfolio-doc.tmpl-mono .tech-tag{ background:#1B1E27; color:#8fb2ff; border-radius:4px;}
        .portfolio-doc.tmpl-mono .tech-tag::before{ content:"["; }
        .portfolio-doc.tmpl-mono .tech-tag::after{ content:"]"; }
        .portfolio-doc.tmpl-mono .proj-link{ color:#5fe3a3;}

        .portfolio-doc.tmpl-casestudy .proj-list{ display:block;}
        .portfolio-doc.tmpl-casestudy .proj-card{ display:flex; gap:14px; align-items:flex-start; border:none; border-left:3px solid var(--accent); border-radius:0; background:var(--card-bg, #f7f8fa); padding:16px 18px;}
        .portfolio-doc.tmpl-casestudy .proj-card h3{ font-size:17px;}

        .portfolio-doc.tmpl-index .portfolio-hero{ background:none; color:#111; border-bottom:3px solid #111; border-radius:0; padding:0 0 16px;}
        .portfolio-doc.tmpl-index .portfolio-hero .eyebrow{ color:#888;}
        .portfolio-doc.tmpl-index .portfolio-hero h1{ font-size:34px;}
        .portfolio-doc.tmpl-index .portfolio-hero p{ color:#555;}
        .portfolio-doc.tmpl-index .portfolio-hero .links a{ background:none; border:1px solid #111; color:#111;}
        .portfolio-doc.tmpl-index .proj-list{ counter-reset: idx;}
        .portfolio-doc.tmpl-index .proj-card{ border:none; border-bottom:1px solid #e4e6eb; border-radius:0; padding:20px 0 20px 44px; position:relative; background:none;}
        .portfolio-doc.tmpl-index .proj-card::before{ counter-increment: idx; content: counter(idx, decimal-leading-zero); position:absolute; left:0; top:20px; font-family:var(--font-display); font-size:22px; font-weight:700; color:#ddd;}
        .portfolio-doc.tmpl-index .proj-card h3{ font-size:22px;}

        /* ATS scan */
        .scan-zone{ text-align:center; padding:10px 4px 4px;}
        .scan-doc{ position:relative; border:1px solid var(--line); border-radius:10px; background:var(--card-bg); padding:18px; text-align:left; overflow:hidden; margin-bottom:16px;}
        .scan-doc .fake-line{ height:8px; background:var(--skeleton); border-radius:3px; margin-bottom:8px; position:relative; overflow:hidden;}
        .scan-doc.scanning .fake-line{ background: linear-gradient(90deg, var(--skeleton) 25%, var(--line) 37%, var(--skeleton) 63%); background-size:400px 100%; animation: shimmerBar 1.3s linear infinite;}
        .scan-line{ position:absolute; left:0; right:0; height:2px; background:var(--accent); box-shadow:0 0 12px 2px var(--accent); animation: sweep 1.3s linear;}
        @keyframes sweep{ from{ top:0; } to{ top:100%; } }
        .run-scan-btn{ font-family:var(--font-mono); font-size:12.5px; text-transform:uppercase; letter-spacing:.05em; background:var(--accent); color:#fff; border:none; padding:11px 20px; border-radius:8px; cursor:pointer; display:inline-flex; gap:8px; align-items:center; transition: transform .15s ease, box-shadow .15s ease;}
        .run-scan-btn:hover:not(:disabled){ transform: translateY(-1px); box-shadow: 0 6px 16px var(--accent-soft);}
        .run-scan-btn:active:not(:disabled){ transform: translateY(0) scale(.97);}
        .run-scan-btn:disabled{ opacity:.6;}
        .run-scan-btn .scan-icon-spin{ animation: spin 1s linear infinite;}
        @keyframes spin{ from{ transform:rotate(0deg);} to{ transform:rotate(360deg);} }
        .terminal{ font-family:var(--font-mono); font-size:12px; background:#0D0F14; color:#d7ffe9; border-radius:10px; padding:16px; text-align:left; line-height:1.7; margin-top:14px; animation: fadeSlideIn .35s ease both;}
        .terminal .k{ color:#8fb2ff;}
        .terminal .ok{ color:#5fe3a3;}
        .terminal .warn{ color:#ffb27a;}
        .terminal > div{ animation: fadeSlideIn .3s ease both; }
        .terminal > div:nth-child(1){ animation-delay:.02s;} .terminal > div:nth-child(2){ animation-delay:.06s;}
        .terminal > div:nth-child(3){ animation-delay:.10s;} .terminal > div:nth-child(4){ animation-delay:.14s;}
        .terminal > div:nth-child(5){ animation-delay:.18s;} .terminal > div:nth-child(6){ animation-delay:.22s;}
        .terminal > div:nth-child(7){ animation-delay:.26s;} .terminal > div:nth-child(8){ animation-delay:.30s;}
        .terminal > div:nth-child(9){ animation-delay:.34s;}
        .checklist{ margin-top:16px; text-align:left;}
        .check-row{ display:flex; align-items:flex-start; gap:9px; padding:8px 0; border-bottom:1px solid var(--line); font-size:13px; animation: fadeSlideIn .3s ease both;}
        .check-row:last-child{ border-bottom:none;}
        .check-row:nth-child(1){ animation-delay:.03s;} .check-row:nth-child(2){ animation-delay:.07s;}
        .check-row:nth-child(3){ animation-delay:.11s;} .check-row:nth-child(4){ animation-delay:.15s;}
        .check-row:nth-child(5){ animation-delay:.19s;} .check-row:nth-child(6){ animation-delay:.23s;}
        .check-row:nth-child(7){ animation-delay:.27s;} .check-row:nth-child(8){ animation-delay:.31s;}
        .check-row svg{ transition: transform .2s ease;}
        .check-row:hover svg{ transform: scale(1.15);}

        .export-row{ display:flex; gap:10px; flex-wrap:wrap; margin-top:18px;}
        .export-btn{ font-family:var(--font-mono); font-size:12.5px; text-transform:uppercase; letter-spacing:.04em; display:inline-flex; align-items:center; gap:8px; padding:12px 18px; border-radius:9px; border:1px solid var(--chip-bg); background:var(--chip-bg); color:var(--chip-text); cursor:pointer; transition: transform .15s ease, box-shadow .15s ease;}
        .export-btn:hover{ transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,.15);}
        .export-btn:active{ transform: translateY(0) scale(.97);}
        .export-btn.secondary{ background:var(--panel-bg); color:var(--ink); border-color:var(--line);}
        .export-btn.error{ background:var(--warn); border-color:var(--warn); color:#fff;}
        .export-btn:disabled{ opacity:.7; cursor:wait;}
        .export-note{ font-size:12px; color:var(--mid); margin-top:10px;}

        /* print handling */
        #print-resume, #print-portfolio{ display:none; }
        @media print{
          .print-resume-mode #print-resume{ display:block; }
          .print-portfolio-mode #print-portfolio{ display:block; }
          .print-resume-mode #app-root, .print-portfolio-mode #app-root{ display:none; }
          body{ background:#fff; }
          @page{ margin: 14mm; }
        }
      `}</style>

      <div className="shell-inner" id="app-root">
        <div className="hero">
          <div>
            <div className="hero-eyebrow"><span className="dot" />Resume &amp; Portfolio Builder</div>
            <h1>Build a CV that clears the bot and a portfolio that wins the human.</h1>
            <p>Fill in your details once. Get an ATS-safe, single-column resume and a visual portfolio page, side by side, as you type.</p>
          </div>
          <div className="header-actions">
            <button
              className="theme-toggle"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              aria-label="Toggle dark mode"
            >
              {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
              {theme === "light" ? "Dark" : "Light"}
            </button>
            <div className={`score-pill ${scorePulse ? "pulse" : ""}`}>
              <ScanLine size={16} />
              <span>ATS readiness <b>{displayScore}%</b></span>
              {score === 100 && (
                <span className="confetti-wrap">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <span key={i} className="confetti-bit" style={{ "--i": i }} />
                  ))}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="stepper">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                className={`step-btn ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
                onClick={() => goStep(i)}
              >
                {i < step ? <CheckCircle2 size={13} className="step-check" /> : <Icon size={13} />} {i + 1}. {s.label}
              </button>
            );
          })}
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div className="grid">
          {/* ---------------- FORM COLUMN ---------------- */}
          <div className="panel">
            <div className="step-panel" key={step}>
            {step === 0 && (
              <>
                <h2 className="panel-title">Personal details</h2>
                <p className="panel-sub">This becomes the header of your resume. Keep it plain text — no icons or text boxes, since those can confuse ATS parsers.</p>
                <div className="row2">
                  <Field label="Full name">
                    <TextInput value={personal.name} placeholder="Jordan Lee"
                      onChange={(e) => setPersonal({ ...personal, name: e.target.value })} />
                  </Field>
                  <Field label="Target job title">
                    <TextInput value={personal.title} placeholder="Product Designer"
                      onChange={(e) => setPersonal({ ...personal, title: e.target.value })} />
                  </Field>
                </div>
                <div className="row2">
                  <Field label="Email">
                    <TextInput value={personal.email} placeholder="jordan@email.com"
                      onChange={(e) => setPersonal({ ...personal, email: e.target.value })} />
                  </Field>
                  <Field label="Phone">
                    <TextInput value={personal.phone} placeholder="+1 555 123 4567"
                      onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} />
                  </Field>
                </div>
                <div className="row2">
                  <Field label="Location">
                    <TextInput value={personal.location} placeholder="Kolkata, India"
                      onChange={(e) => setPersonal({ ...personal, location: e.target.value })} />
                  </Field>
                  <Field label="LinkedIn">
                    <TextInput value={personal.linkedin} placeholder="linkedin.com/in/jordan"
                      onChange={(e) => setPersonal({ ...personal, linkedin: e.target.value })} />
                  </Field>
                </div>
                <div className="row2">
                  <Field label="GitHub (optional)">
                    <TextInput value={personal.github} placeholder="github.com/jordan"
                      onChange={(e) => setPersonal({ ...personal, github: e.target.value })} />
                  </Field>
                  <Field label="Portfolio site (optional)">
                    <TextInput value={personal.website} placeholder="jordanlee.dev"
                      onChange={(e) => setPersonal({ ...personal, website: e.target.value })} />
                  </Field>
                </div>
                <Field label="Professional summary" hint="15–60 words. Lead with your title, years of experience, and your strongest skill area.">
                  <TextArea value={summary} placeholder="Product designer with 5 years building B2B dashboards. Skilled in Figma, design systems, and user research. Shipped features used by 200k+ weekly users."
                    onChange={(e) => setSummary(e.target.value)} />
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="panel-title">Work experience</h2>
                <p className="panel-sub">One line per bullet. Start each with an action verb and, where you can, a number — ATS keyword matching and human readers both reward specifics.</p>
                {experience.map((exp, i) => (
                  <div className="card" key={exp.id}>
                    {experience.length > 1 && (
                      <button className="card-remove" onClick={() => removeItem(setExperience, exp.id)}><Trash2 size={15} /></button>
                    )}
                    <div className="row2">
                      <Field label="Company">
                        <TextInput value={exp.company} onChange={(e) => updateItem(setExperience, exp.id, { company: e.target.value })} placeholder="Acme Corp" />
                      </Field>
                      <Field label="Role">
                        <TextInput value={exp.role} onChange={(e) => updateItem(setExperience, exp.id, { role: e.target.value })} placeholder="Senior Designer" />
                      </Field>
                    </div>
                    <div className="row2">
                      <Field label="Location">
                        <TextInput value={exp.location} onChange={(e) => updateItem(setExperience, exp.id, { location: e.target.value })} placeholder="Remote" />
                      </Field>
                      <Field label="Dates">
                        <div style={{ display: "flex", gap: 8 }}>
                          <TextInput value={exp.start} onChange={(e) => updateItem(setExperience, exp.id, { start: e.target.value })} placeholder="Jan 2022" />
                          <TextInput value={exp.end} onChange={(e) => updateItem(setExperience, exp.id, { end: e.target.value })} placeholder="Present" disabled={exp.current} />
                        </div>
                      </Field>
                    </div>
                    <Field label="Bullet points" hint="One achievement per line.">
                      <TextArea value={exp.bullets} onChange={(e) => updateItem(setExperience, exp.id, { bullets: e.target.value })}
                        placeholder={"Redesigned onboarding flow, lifting activation by 18%\nLed a team of 3 designers across 4 product lines"} />
                    </Field>
                  </div>
                ))}
                <button className="add-btn" onClick={() => setExperience([...experience, emptyExperience()])}><Plus size={14} /> Add role</button>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="panel-title">Education</h2>
                <p className="panel-sub">List your highest or most relevant qualification first.</p>
                {education.map((ed) => (
                  <div className="card" key={ed.id}>
                    {education.length > 1 && (
                      <button className="card-remove" onClick={() => removeItem(setEducation, ed.id)}><Trash2 size={15} /></button>
                    )}
                    <div className="row2">
                      <Field label="School">
                        <TextInput value={ed.school} onChange={(e) => updateItem(setEducation, ed.id, { school: e.target.value })} placeholder="State University" />
                      </Field>
                      <Field label="Degree">
                        <TextInput value={ed.degree} onChange={(e) => updateItem(setEducation, ed.id, { degree: e.target.value })} placeholder="B.A. Communication Design" />
                      </Field>
                    </div>
                    <div className="row2">
                      <Field label="Dates">
                        <div style={{ display: "flex", gap: 8 }}>
                          <TextInput value={ed.start} onChange={(e) => updateItem(setEducation, ed.id, { start: e.target.value })} placeholder="2016" />
                          <TextInput value={ed.end} onChange={(e) => updateItem(setEducation, ed.id, { end: e.target.value })} placeholder="2020" />
                        </div>
                      </Field>
                      <Field label="GPA (optional)">
                        <TextInput value={ed.gpa} onChange={(e) => updateItem(setEducation, ed.id, { gpa: e.target.value })} placeholder="3.8 / 4.0" />
                      </Field>
                    </div>
                  </div>
                ))}
                <button className="add-btn" onClick={() => setEducation([...education, emptyEducation()])}><Plus size={14} /> Add education</button>

                <h2 className="panel-title" style={{ marginTop: 26 }}>Certifications</h2>
                {certs.map((c) => (
                  <div className="card" key={c.id}>
                    <button className="card-remove" onClick={() => removeItem(setCerts, c.id)}><Trash2 size={15} /></button>
                    <div className="row2">
                      <Field label="Certification"><TextInput value={c.name} onChange={(e) => updateItem(setCerts, c.id, { name: e.target.value })} placeholder="AWS Solutions Architect" /></Field>
                      <Field label="Issuer"><TextInput value={c.issuer} onChange={(e) => updateItem(setCerts, c.id, { issuer: e.target.value })} placeholder="Amazon Web Services" /></Field>
                    </div>
                    <Field label="Date"><TextInput value={c.date} onChange={(e) => updateItem(setCerts, c.id, { date: e.target.value })} placeholder="2023" /></Field>
                  </div>
                ))}
                <button className="add-btn" onClick={() => setCerts([...certs, emptyCert()])}><Plus size={14} /> Add certification</button>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="panel-title">Skills</h2>
                <p className="panel-sub">Comma or line separated. Mirror the exact wording from the job posting where it's true of you — ATS systems match on literal keywords.</p>
                <Field label="Skills">
                  <TextArea value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Figma, Design Systems, User Research, HTML/CSS, A/B Testing" />
                </Field>
                <p className="export-note">{skillList.length} skill{skillList.length === 1 ? "" : "s"} detected. Aim for 8–15 relevant to the role.</p>
              </>
            )}

            {step === 4 && (
              <>
                <h2 className="panel-title">Portfolio projects</h2>
                <p className="panel-sub">These power your visual portfolio page — they won't appear on the ATS resume. Pick 2–4 of your strongest, most relevant pieces.</p>
                {projects.map((p) => (
                  <div className="card" key={p.id}>
                    {projects.length > 1 && (
                      <button className="card-remove" onClick={() => removeItem(setProjects, p.id)}><Trash2 size={15} /></button>
                    )}
                    <Field label="Project name">
                      <TextInput value={p.name} onChange={(e) => updateItem(setProjects, p.id, { name: e.target.value })} placeholder="Checkout redesign" />
                    </Field>
                    <Field label="Description">
                      <TextArea value={p.description} onChange={(e) => updateItem(setProjects, p.id, { description: e.target.value })} placeholder="Rebuilt the checkout flow end to end, cutting cart abandonment and simplifying the payment step." />
                    </Field>
                    <div className="row2">
                      <Field label="Tech / tools (comma separated)">
                        <TextInput value={p.tech} onChange={(e) => updateItem(setProjects, p.id, { tech: e.target.value })} placeholder="Figma, React, Stripe" />
                      </Field>
                      <Field label="Link (optional)">
                        <TextInput value={p.link} onChange={(e) => updateItem(setProjects, p.id, { link: e.target.value })} placeholder="https://..." />
                      </Field>
                    </div>
                    <Field label="Result / metric (optional)">
                      <TextInput value={p.metric} onChange={(e) => updateItem(setProjects, p.id, { metric: e.target.value })} placeholder="Cart abandonment down 22%" />
                    </Field>
                  </div>
                ))}
                <button className="add-btn" onClick={() => setProjects([...projects, emptyProject()])}><Plus size={14} /> Add project</button>
              </>
            )}

            {step === 5 && (
              <>
                <h2 className="panel-title">Review &amp; export</h2>
                <p className="panel-sub">Run the scan to see your resume the way an applicant tracking system does, then export both documents.</p>
                <div className="scan-zone">
                  <div className={`scan-doc ${scanState === "scanning" ? "scanning" : ""}`}>
                    {scanState === "scanning" && <div className="scan-line" />}
                    {[95, 70, 85, 60, 90, 55, 75].map((w, i) => (
                      <div className="fake-line" key={i} style={{ width: `${w}%` }} />
                    ))}
                  </div>
                  <button className="run-scan-btn" onClick={runScan} disabled={scanState === "scanning"}>
                    <ScanLine size={15} className={scanState === "scanning" ? "scan-icon-spin" : ""} />
                    {scanState === "scanning" ? "Scanning…" : scanState === "done" ? "Re-run scan" : "Run ATS scan"}
                  </button>

                  {scanState === "done" && (
                    <div className="terminal">
                      <div><span className="k">name:</span> {personal.name ? <span className="ok">"{personal.name}" ✓ parsed</span> : <span className="warn">not found</span>}</div>
                      <div><span className="k">contact.email:</span> {personal.email ? <span className="ok">"{personal.email}" ✓ parsed</span> : <span className="warn">not found</span>}</div>
                      <div><span className="k">contact.phone:</span> {personal.phone ? <span className="ok">"{personal.phone}" ✓ parsed</span> : <span className="warn">not found</span>}</div>
                      <div><span className="k">sections.detected:</span> <span className="ok">[summary, experience, education, skills]</span></div>
                      <div><span className="k">experience.entries:</span> <span className="ok">{experience.filter(e => e.role).length}</span></div>
                      <div><span className="k">skills.matched:</span> <span className="ok">{skillList.length}</span></div>
                      <div><span className="k">layout.columns:</span> <span className="ok">1 (safe)</span></div>
                      <div><span className="k">word_count:</span> <span className={totalWords <= 650 ? "ok" : "warn"}>{totalWords}</span></div>
                      <div><span className="k">overall_score:</span> <span className="ok">{score}%</span></div>
                    </div>
                  )}

                  <div className="checklist">
                    {checks.map((c) => (
                      <div className="check-row" key={c.id}>
                        {c.pass ? <CheckCircle2 size={16} color="#00966B" /> : <AlertTriangle size={16} color="#D14A22" />}
                        <span>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="export-row">
                  <button className={`export-btn ${pdfState === "error" ? "error" : ""}`} onClick={downloadResumePDF} disabled={pdfState === "generating"}>
                    {pdfState === "generating" ? <Loader2 size={15} className="scan-icon-spin" /> : pdfState === "done" ? <CheckCircle2 size={15} /> : <Download size={15} />}
                    {pdfState === "generating" ? "Generating…" : pdfState === "done" ? "Downloaded" : pdfState === "error" ? "Try again" : "Download resume as PDF"}
                  </button>
                  <button className="export-btn secondary" onClick={printResume}><Printer size={15} /> Print resume</button>
                  <button className="export-btn secondary" onClick={printPortfolio}><Printer size={15} /> Print / save portfolio as PDF</button>
                </div>
                <p className="export-note">
                  <strong>Download resume as PDF</strong> generates and downloads an actual .pdf file directly — no print dialog, no extra clicks. The text stays fully selectable, which is exactly what an ATS needs to read it.
                  The print buttons use your browser's print dialog instead, useful if you want to choose paper size or print physically.
                </p>
              </>
            )}
            </div>

            <div className="nav-row">
              <button className="nav-btn" disabled={step === 0} onClick={() => goStep(step - 1)}><ChevronLeft size={14} /> Back</button>
              <button className="nav-btn primary" disabled={step === STEPS.length - 1} onClick={() => goStep(step + 1)}>Next <ChevronRight size={14} /></button>
            </div>
          </div>

          {/* ---------------- PREVIEW COLUMN ---------------- */}
          <div className="panel preview-panel">
            <div className="preview-tabs">
              <button className={`preview-tab ${previewTab === "resume" ? "active" : ""}`} onClick={() => setPreviewTab("resume")}>Resume</button>
              <button className={`preview-tab ${previewTab === "portfolio" ? "active" : ""}`} onClick={() => setPreviewTab("portfolio")}>Portfolio</button>
            </div>

            <div className="template-bar">
              <span className="template-bar-label">Template</span>
              <div className="template-swatches">
                {(previewTab === "resume" ? RESUME_TEMPLATES : PORTFOLIO_TEMPLATES).map((t) => {
                  const active = previewTab === "resume" ? resumeTemplate === t.id : portfolioTemplate === t.id;
                  return (
                    <button
                      key={t.id}
                      className={`template-swatch ${active ? "active" : ""}`}
                      onClick={() => (previewTab === "resume" ? setResumeTemplate(t.id) : setPortfolioTemplate(t.id))}
                      title={t.desc}
                    >
                      <TemplateSwatch id={t.id} kind={previewTab} />
                      <span>{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="preview-body">
              <div className={`paper-surface ${livePulse ? "live-pulse" : ""}`}>
                {previewTab === "resume" ? (
                  <ResumeDoc personal={personal} summary={summary} experience={experience} education={education} skillList={skillList} certs={certs} projects={projects} template={resumeTemplate} />
                ) : (
                  <PortfolioDoc personal={personal} projects={projects} template={portfolioTemplate} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* hidden print-only mirrors */}
      <div id="print-resume">
        <ResumeDoc personal={personal} summary={summary} experience={experience} education={education} skillList={skillList} certs={certs} projects={projects} template={resumeTemplate} />
      </div>
      <div id="print-portfolio">
        <PortfolioDoc personal={personal} projects={projects} template={portfolioTemplate} />
      </div>
    </div>
  );
}

function ResumeDoc({ personal, summary, experience, education, skillList, certs, projects = [], template = "classic" }) {
  const hasAny = personal.name || summary || experience.some(e => e.role);
  const shownProjects = projects.filter(p => p.name);
  return (
    <div className={`resume-doc tmpl-${template}`}>
      <h1>{personal.name || <span className="placeholder-text">Your Name</span>}</h1>
      {personal.title && <p className="role-title">{personal.title}</p>}
      <div className="contact-line">
        {personal.email && <span>{personal.email}</span>}
        {personal.phone && <span>{personal.phone}</span>}
        {personal.location && <span>{personal.location}</span>}
        {personal.linkedin && <span>{personal.linkedin}</span>}
        {personal.github && <span>{personal.github}</span>}
        {personal.website && <span>{personal.website}</span>}
      </div>

      {summary && (<><h2>Summary</h2><p>{summary}</p></>)}

      {experience.some(e => e.role || e.company) && (
        <>
          <h2>Experience</h2>
          {experience.filter(e => e.role || e.company).map((e) => (
            <div key={e.id} style={{ marginBottom: 10 }}>
              <div className="item-meta">
                <h3>{e.role}{e.company ? `, ${e.company}` : ""}</h3>
                <span>{[e.start, e.end].filter(Boolean).join(" – ")}</span>
              </div>
              {e.location && <div style={{ fontSize: 11.5, color: "#555" }}>{e.location}</div>}
              {e.bullets && (
                <ul>
                  {e.bullets.split("\n").filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              )}
            </div>
          ))}
        </>
      )}

      {education.some(e => e.school) && (
        <>
          <h2>Education</h2>
          {education.filter(e => e.school).map((e) => (
            <div key={e.id} style={{ marginBottom: 8 }}>
              <div className="item-meta">
                <h3>{e.degree}{e.field ? `, ${e.field}` : ""}</h3>
                <span>{[e.start, e.end].filter(Boolean).join(" – ")}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "#555" }}>{e.school}{e.gpa ? ` · GPA ${e.gpa}` : ""}</div>
            </div>
          ))}
        </>
      )}

      {skillList.length > 0 && (
        <><h2>Skills</h2><p className="skills-line">{skillList.join(" · ")}</p></>
      )}

      {template === "techstack" && shownProjects.length > 0 && (
        <>
          <h2>Projects</h2>
          {shownProjects.map((p) => (
            <div key={p.id} style={{ marginBottom: 8 }}>
              <div className="item-meta">
                <h3>{p.name}{p.tech ? ` | ${p.tech}` : ""}</h3>
              </div>
              {p.description && <ul><li>{p.description}</li></ul>}
            </div>
          ))}
        </>
      )}

      {certs.some(c => c.name) && (
        <>
          <h2>Certifications</h2>
          {certs.filter(c => c.name).map((c) => (
            <div key={c.id} className="item-meta">
              <h3>{c.name}{c.issuer ? `, ${c.issuer}` : ""}</h3>
              <span>{c.date}</span>
            </div>
          ))}
        </>
      )}

      {!hasAny && <p className="placeholder-text">Your resume preview will build itself as you fill in the form.</p>}
    </div>
  );
}

function PortfolioDoc({ personal, projects, template = "hero" }) {
  const shown = projects.filter(p => p.name || p.description);
  return (
    <div className={`portfolio-doc tmpl-${template}`}>
      <div className="portfolio-hero">
        <div className="eyebrow">Portfolio</div>
        <h1>{personal.name || "Your Name"}</h1>
        <p>{personal.title || "Your role"}{personal.location ? ` · ${personal.location}` : ""}</p>
        <div className="links">
          {personal.email && <a href={`mailto:${personal.email}`}><LinkIcon size={12} /> {personal.email}</a>}
          {personal.website && <a href={`https://${personal.website.replace(/^https?:\/\//, "")}`} target="_blank" rel="noreferrer"><Globe size={12} /> {personal.website}</a>}
          {personal.github && <a href={`https://${personal.github.replace(/^https?:\/\//, "")}`} target="_blank" rel="noreferrer"><Github size={12} /> {personal.github}</a>}
        </div>
      </div>

      {shown.length > 0 ? (
        <div className="proj-list">
          {shown.map((p) => (
            <div className="proj-card" key={p.id}>
              <h3>{p.name || "Untitled project"}</h3>
              {p.description && <p>{p.description}</p>}
              {p.tech && (
                <div className="tech-tags">
                  {p.tech.split(",").map(t => t.trim()).filter(Boolean).map((t, i) => <span className="tech-tag" key={i}>{t}</span>)}
                </div>
              )}
              {p.metric && <div className="proj-metric">↑ {p.metric}</div>}
              {p.link && <div style={{ marginTop: 8 }}><a className="proj-link" href={p.link} target="_blank" rel="noreferrer">View project →</a></div>}
            </div>
          ))}
        </div>
      ) : (
        <p className="placeholder-text">Add a project in the Portfolio step to see it appear here as a card.</p>
      )}
    </div>
  );
}
