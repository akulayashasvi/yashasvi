import React, { useEffect, useState } from "react";
// Single-file React component for a responsive wellness app
// Tailwind CSS utility classes assumed to be available in the host project.
// Uses Recharts for trend visualization (install: recharts)
// This file is meant to be a starting point: production apps should split into modules,
// add authentication, backend storage, secure handling of health data (HIPAA/GDPR considerations),
// and integrate a robust sentiment-analysis service (OpenAI, HuggingFace, or a dedicated NLP endpoint).

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { motion } from "framer-motion";

const STORAGE_KEY = "wellness_mood_entries_v1";

// Simple sentiment analyzer (placeholder). Replace with a server-side ML model or third-party API for production.
function basicSentimentAnalysis(text) {
  if (!text || !text.trim()) return { score: 0, label: "neutral" };
  const positive = ["good", "great", "happy", "joy", "love", "calm", "relaxed", "energized", "optimistic"];
  const negative = ["sad", "angry", "anxious", "depressed", "tired", "stressed", "worried", "lonely"];
  const t = text.toLowerCase();
  let score = 0;
  positive.forEach((w) => (score += (t.split(w).length - 1)));
  negative.forEach((w) => (score -= (t.split(w).length - 1)));
  const label = score > 0 ? "positive" : score < 0 ? "negative" : "neutral";
  return { score, label };
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed loading entries", e);
    return [];
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function App() {
  const [entries, setEntries] = useState(() => loadEntries());
  const [mood, setMood] = useState(5);
  const [notes, setNotes] = useState("");
  const [filterRange, setFilterRange] = useState(30);

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  function handleCheckIn(e) {
    e.preventDefault();
    const sentiment = basicSentimentAnalysis(notes);
    const entry = {
      id: uid(),
      date: new Date().toISOString(),
      mood: Number(mood),
      notes,
      sentiment,
    };
    const next = [entry, ...entries].slice(0, 3650); // keep up to ~10 years of daily entries
    setEntries(next);
    setNotes("");
    setMood(5);
  }

  function removeEntry(id) {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
  }

  function exportCSV() {
    const header = ["id", "date", "mood", "notes", "sentiment_label", "sentiment_score"].join(",") + "\n";
    const rows = entries
      .map((r) => [r.id, r.date, r.mood, '"' + (r.notes || "").replace(/"/g, '""') + '"', r.sentiment?.label || "", r.sentiment?.score || 0].join(","))
      .join("\n");
    const csv = header + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wellness_entries_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Simple rule-based personalized recommendations engine
  function getRecommendations(latest) {
    if (!latest) return ["Try checking in — small steps matter."];
    const recs = [];
    if (latest.mood <= 3) {
      recs.push("Try a short grounding exercise (4-4-4 breathing) for 5 minutes.");
      recs.push("Consider reaching out to a close friend or family member — connection helps.");
    }
    if (latest.sentiment?.label === "negative") {
      recs.push("Write down 3 small things that went well today, however small.");
      recs.push("Try a light walk — movement often shifts perspective.");
    }
    if (latest.mood >= 8 && latest.sentiment?.label === "positive") {
      recs.push("You're doing well — sustain momentum by keeping routines that work.");
      recs.push("Consider setting a small new goal for skill-building or rest.");
    }
    if (recs.length === 0) recs.push("Keep checking in. Try a 5-minute breathing break.");
    return recs;
  }

  const latest = entries[0];
  const recentEntries = entries.filter((e) => {
    const days = (Date.now() - new Date(e.date).getTime()) / (1000 * 60 * 60 * 24);
    return days <= filterRange;
  }).reverse(); // oldest -> newest for chart

  const chartData = recentEntries.map((e) => ({ date: new Date(e.date).toLocaleDateString(), mood: e.mood }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold">MindTrack — Responsive Wellness App</h1>
          <p className="text-sm text-slate-600 mt-1">Daily mood check-ins, sentiment analysis, tailored recommendations, and trends.</p>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column: Check-in */}
          <section className="md:col-span-1 bg-white p-4 rounded-2xl shadow-sm">
            <motion.form initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleCheckIn}>
              <h2 className="font-semibold text-lg">Quick Check-in</h2>
              <label className="block mt-3 text-sm">Mood (1 = low, 10 = high)</label>
              <input
                type="range"
                min={1}
                max={10}
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full mt-2"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>1</span>
                <span>{mood}</span>
                <span>10</span>
              </div>

              <label className="block mt-3 text-sm">Notes / What's on your mind?</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full mt-2 p-2 border rounded-md" />

              <div className="flex gap-2 mt-4">
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm">Save</button>
                <button
                  type="button"
                  className="px-4 py-2 bg-slate-100 rounded-xl"
                  onClick={() => {
                    setNotes("");
                    setMood(5);
                  }}
                >
                  Clear
                </button>
              </div>
            </motion.form>

            <div className="mt-6 text-sm">
              <h3 className="font-medium">Latest sentiment</h3>
              <p className="mt-1 text-slate-600">{latest ? `${latest.sentiment?.label} (score ${latest.sentiment?.score})` : "No check-ins yet."}</p>
            </div>

            <div className="mt-4 text-sm">
              <h3 className="font-medium">Recommendations</h3>
              <ul className="mt-2 list-disc list-inside">
                {getRecommendations(latest).map((r, i) => (
                  <li key={i} className="text-slate-700">{r}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* Middle column: Trends */}
          <section className="md:col-span-2 bg-white p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Trends & Insights</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm">Range (days)</label>
                <select value={filterRange} onChange={(e) => setFilterRange(Number(e.target.value))} className="p-1 border rounded-md">
                  <option value={7}>7</option>
                  <option value={14}>14</option>
                  <option value={30}>30</option>
                  <option value={90}>90</option>
                  <option value={365}>365</option>
                </select>
              </div>
            </div>

            <div className="mt-4 h-64">
              {chartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[1, 10]} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="mood" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">No data to chart yet — add some check-ins.</div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium">Recent entries</h3>
                <div className="mt-2 max-h-48 overflow-auto">
                  {entries.length ? (
                    entries.slice(0, 10).map((e) => (
                      <div key={e.id} className="p-2 border-b last:border-b-0">
                        <div className="flex justify-between">
                          <div>
                            <div className="text-sm font-medium">{new Date(e.date).toLocaleString()}</div>
                            <div className="text-xs text-slate-600">Mood: {e.mood} — {e.sentiment?.label}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="text-xs text-red-500" onClick={() => removeEntry(e.id)}>Delete</button>
                          </div>
                        </div>
                        {e.notes && <div className="mt-1 text-sm text-slate-700">{e.notes}</div>}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">No entries yet.</div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium">Analytics snapshot</h3>
                <div className="mt-2 text-sm text-slate-700">
                  <p>Entries: {entries.length}</p>
                  <p>Average mood (30 days): {(() => {
                    const last30 = entries.slice(0, 30);
                    if (!last30.length) return "—";
                    const avg = (last30.reduce((s, x) => s + x.mood, 0) / last30.length).toFixed(2);
                    return avg;
                  })()}</p>
                  <p>Recent sentiment mix: {(() => {
                    const mix = { positive: 0, negative: 0, neutral: 0 };
                    entries.slice(0, 30).forEach((e) => mix[e.sentiment?.label || "neutral"]++);
                    const total = Math.max(1, entries.slice(0, 30).length);
                    return `+${Math.round((mix.positive / total) * 100)}% / -${Math.round((mix.negative / total) * 100)}% / ~${Math.round((mix.neutral / total) * 100)}%`;
                  })()}</p>

                  <div className="mt-3 flex gap-2">
                    <button onClick={exportCSV} className="px-3 py-1 bg-slate-100 rounded-md text-sm">Export CSV</button>
                    <button onClick={() => { if (confirm('Clear all entries? This cannot be undone.')) { setEntries([]); } }} className="px-3 py-1 bg-red-50 text-red-600 rounded-md text-sm">Clear All</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-8 text-xs text-slate-500 text-center">
          <div>Prototype — not medical advice. For clinical concerns please contact a professional.</div>
        </footer>
      </div>
    </div>
  );
}
