import { useEffect, useRef, useState } from "react";

/**
 * Looping "product demo" animation matching the Cascade landing page theme
 * (cream bg, black type, terracotta accent). No video file — pure CSS/JS.
 *
 * <DemoAnimation persona="researcher" />
 * <DemoAnimation persona="analyst" />
 * <DemoAnimation persona="writer" />
 */

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const SCRIPTS = {
  researcher: {
    label: "Researcher",
    task: "Research Q3 competitor landscape",
    steps: [
      { label: "researcher.search", end: "done" },
      { label: "researcher.cite", end: "done" },
      { label: "Dropping unverifiable claims", end: "done" },
    ],
    result: "Complete · 0 retries",
  },
  analyst: {
    label: "Analyst",
    task: "Score Q3 findings against rubric",
    steps: [
      { label: "Attempt 1 — output failed schema check", end: "fail" },
      { label: "Attempt 2 — re-planned with error context", end: "retry" },
      { label: "Attempt 3 — validated · confidence 0.94", end: "done" },
    ],
    result: "Self-corrected · 2 retries",
  },
  writer: {
    label: "Writer",
    task: "Draft Q3 competitor brief",
    steps: [
      { label: "Outlining brief", end: "done" },
      { label: "Drafting copy", end: "done" },
    ],
    checkpoint: {
      title: "Publish Q3 competitor brief",
      body: "1,400-word brief citing 12 sources. 2 claims flagged low-confidence, need review before send.",
    },
    result: "Approved · sent",
  },
};

function StepIcon({ state }) {
  if (state === "pending") return <span className="dot" />;
  if (state === "active")
    return <span className="spinner" />;
  if (state === "fail")
    return (
      <svg viewBox="0 0 16 16" className="icon-svg">
        <circle cx="8" cy="8" r="7" fill="none" className="fail-ring" />
        <path d="M8 4.5v4.5M8 11.2v.3" className="fail-mark" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  if (state === "retry")
    return (
      <svg viewBox="0 0 16 16" className="icon-svg retry-spin">
        <path
          d="M13 8a5 5 0 11-1.6-3.65M13 3v3.2h-3.2"
          fill="none"
          className="retry-mark"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  // done
  return (
    <svg viewBox="0 0 16 16" className="icon-svg">
      <path
        className="check-path"
        d="M3 8.5l3.2 3.2L13 4.8"
        fill="none"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DemoAnimation({ persona = "researcher" }) {
  const script = SCRIPTS[persona] || SCRIPTS.researcher;
  const [typedChars, setTypedChars] = useState(0);
  const [cursor, setCursor] = useState({ x: 85, y: 8, click: false, visible: true });
  const [running, setRunning] = useState(false);
  const [stepStates, setStepStates] = useState(script.steps.map(() => "pending"));
  const [checkpointVisible, setCheckpointVisible] = useState(false);
  const [checkpointApproved, setCheckpointApproved] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    async function loop() {
      while (!cancelledRef.current) {
        // reset
        setTypedChars(0);
        setRunning(false);
        setStepStates(script.steps.map(() => "pending"));
        setCheckpointVisible(false);
        setCheckpointApproved(false);
        setResultVisible(false);
        setCursor({ x: 85, y: 8, click: false, visible: true });
        await delay(500);
        if (cancelledRef.current) return;

        // move to input, type task
        setCursor((c) => ({ ...c, x: 50, y: 32 }));
        await delay(500);
        for (let i = 1; i <= script.task.length; i++) {
          if (cancelledRef.current) return;
          setTypedChars(i);
          await delay(24);
        }
        await delay(250);

        // move to run button, click
        setCursor((c) => ({ ...c, x: 78, y: 48 }));
        await delay(450);
        setCursor((c) => ({ ...c, click: true }));
        await delay(250);
        setCursor((c) => ({ ...c, click: false, visible: false }));
        setRunning(true);
        await delay(200);

        // steps
        for (let i = 0; i < script.steps.length; i++) {
          if (cancelledRef.current) return;
          setStepStates((prev) => {
            const next = [...prev];
            next[i] = "active";
            return next;
          });
          await delay(750);
          if (cancelledRef.current) return;
          setStepStates((prev) => {
            const next = [...prev];
            next[i] = script.steps[i].end;
            return next;
          });
          await delay(350);
        }

        // writer-only checkpoint + approve click
        if (script.checkpoint) {
          await delay(400);
          setCheckpointVisible(true);
          await delay(1000);
          setCursor({ x: 74, y: 78, click: false, visible: true });
          await delay(500);
          setCursor((c) => ({ ...c, click: true }));
          await delay(250);
          setCheckpointApproved(true);
          setCursor((c) => ({ ...c, visible: false }));
        }

        await delay(500);
        setResultVisible(true);
        await delay(1500);
      }
    }

    loop();
    return () => {
      cancelledRef.current = true;
    };
  }, [persona]);

  const typedText = script.task.slice(0, typedChars);
  const showInputRow = !running;

  return (
    <div className="demo-frame">
      <div className="demo-topbar">
        <span className="demo-persona">{script.label}</span>
        <span className="demo-run-id">CASCADE</span>
      </div>

      <div className="demo-body">
        {showInputRow && (
          <div className="demo-input-row">
            <div className="demo-input">
              <span>{typedText}</span>
              <span className="caret" />
            </div>
            <button className="demo-run-btn">Run</button>
            {cursor.visible && (
              <div
                className={`fake-cursor ${cursor.click ? "click" : ""}`}
                style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
              >
                <svg viewBox="0 0 16 16" width="14" height="14">
                  <path d="M1 1l6 13 2-5 5-2z" fill="#141210" stroke="#F4F1EA" strokeWidth="1" />
                </svg>
              </div>
            )}
          </div>
        )}

        {running && (
          <div className="demo-run-card">
            <div className="demo-task-title">{script.task}</div>
            <ul className="demo-steps">
              {script.steps.map((step, i) => (
                <li key={step.label} className={stepStates[i]}>
                  <span className="step-marker">
                    <StepIcon state={stepStates[i]} />
                  </span>
                  <span className="step-label">{step.label}</span>
                </li>
              ))}
            </ul>

            {script.checkpoint && checkpointVisible && (
              <div className="checkpoint-card">
                <div className="checkpoint-head">
                  <span>CHECKPOINT</span>
                  <span>{checkpointApproved ? "APPROVED" : "PAUSED"}</span>
                </div>
                <div className="checkpoint-title">{script.checkpoint.title}</div>
                <div className="checkpoint-body">{script.checkpoint.body}</div>
                {!checkpointApproved && (
                  <div className="checkpoint-actions">
                    <button className="approve-btn">Approve</button>
                  </div>
                )}
                {cursor.visible && (
                  <div
                    className={`fake-cursor ${cursor.click ? "click" : ""}`}
                    style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
                  >
                    <svg viewBox="0 0 16 16" width="14" height="14">
                      <path d="M1 1l6 13 2-5 5-2z" fill="#141210" stroke="#F4F1EA" strokeWidth="1" />
                    </svg>
                  </div>
                )}
              </div>
            )}

            {resultVisible && (
              <div className="demo-result">
                <svg viewBox="0 0 20 20" className="result-check">
                  <circle cx="10" cy="10" r="8.5" fill="none" className="result-circle" />
                  <path d="M5.5 10.3l2.8 2.8L14.5 6.8" fill="none" className="result-tick" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{script.result}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .demo-frame {
          width: 100%;
          max-width: 420px;
          border-radius: 20px;
          background: #efebe2;
          border: 1px solid #ddd7c9;
          overflow: hidden;
          font-family: Georgia, "Iowan Old Style", serif;
        }
        .demo-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #ddd7c9;
        }
        .demo-persona {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-weight: 700;
          font-size: 13px;
          color: #141210;
        }
        .demo-run-id {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          color: #a39c8a;
        }
        .demo-body {
          position: relative;
          min-height: 210px;
          padding: 20px;
        }
        .demo-input-row {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .demo-input {
          height: 42px;
          border-radius: 10px;
          background: #f7f5ee;
          border: 1px solid #ddd7c9;
          display: flex;
          align-items: center;
          padding: 0 14px;
          font-size: 13px;
          color: #141210;
          white-space: nowrap;
          overflow: hidden;
        }
        .caret {
          width: 1.5px;
          height: 14px;
          background: #d2704a;
          margin-left: 2px;
          animation: blink 0.9s step-end infinite;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
        .demo-run-btn {
          align-self: flex-end;
          padding: 9px 18px;
          border-radius: 999px;
          border: none;
          background: #141210;
          color: #f4f1ea;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 12.5px;
          font-weight: 600;
        }
        .fake-cursor {
          position: absolute;
          transform: translate(-2px, -2px);
          transition: left 0.5s cubic-bezier(0.65, 0, 0.35, 1), top 0.5s cubic-bezier(0.65, 0, 0.35, 1), transform 0.15s ease;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));
          pointer-events: none;
        }
        .fake-cursor.click {
          transform: translate(-2px, -2px) scale(0.85);
        }
        .demo-run-card {
          animation: fadeIn 0.35s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .demo-task-title {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-weight: 700;
          font-size: 14px;
          color: #141210;
          margin-bottom: 14px;
        }
        .demo-steps {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 11px;
        }
        .demo-steps li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 12px;
          color: #a39c8a;
          transition: color 0.3s ease;
        }
        .demo-steps li.active,
        .demo-steps li.done,
        .demo-steps li.fail,
        .demo-steps li.retry {
          color: #3a362d;
        }
        .step-marker {
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #ccc4b0;
        }
        .spinner {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #ddd7c9;
          border-top-color: #d2704a;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .icon-svg { width: 15px; height: 15px; }
        .check-path {
          stroke: #d2704a;
          stroke-dasharray: 20;
          stroke-dashoffset: 20;
          animation: draw 0.3s ease forwards;
        }
        .fail-ring { stroke: #b23b2e; stroke-width: 1.4; }
        .fail-mark { stroke: #b23b2e; }
        .retry-mark { stroke: #6b6455; }
        .retry-spin { animation: spin 1s linear infinite; }
        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }
        .checkpoint-card {
          position: relative;
          margin-top: 16px;
          padding: 14px;
          border-radius: 12px;
          background: #f7f5ee;
          border: 1px solid #ddd7c9;
          animation: fadeIn 0.35s ease;
        }
        .checkpoint-head {
          display: flex;
          justify-content: space-between;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10px;
          letter-spacing: 0.06em;
          color: #a39c8a;
          margin-bottom: 8px;
        }
        .checkpoint-title {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-weight: 700;
          font-size: 13px;
          color: #141210;
          margin-bottom: 6px;
        }
        .checkpoint-body {
          font-size: 12px;
          line-height: 1.5;
          color: #6b6455;
        }
        .checkpoint-actions {
          margin-top: 12px;
          display: flex;
          justify-content: flex-end;
        }
        .approve-btn {
          padding: 7px 16px;
          border-radius: 999px;
          border: none;
          background: #d2704a;
          color: #f4f1ea;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 12px;
          font-weight: 600;
        }
        .demo-result {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid #ddd7c9;
          display: flex;
          align-items: center;
          gap: 9px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 12.5px;
          font-weight: 600;
          color: #141210;
          animation: fadeIn 0.4s ease;
        }
        .result-check { width: 19px; height: 19px; flex-shrink: 0; }
        .result-circle {
          stroke: #d2704a;
          stroke-width: 3;
          stroke-dasharray: 55;
          stroke-dashoffset: 55;
          animation: circleDraw 0.5s ease forwards;
        }
        .result-tick {
          stroke: #d2704a;
          stroke-dasharray: 20;
          stroke-dashoffset: 20;
          animation: tickDraw 0.3s ease forwards 0.4s;
        }
        @keyframes circleDraw { to { stroke-dashoffset: 0; } }
        @keyframes tickDraw { to { stroke-dashoffset: 0; } }
      `}</style>
    </div>
  );
}
