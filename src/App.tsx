import React, { useEffect, useMemo, useRef, useState } from "react";
import mermaid from "mermaid";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// Mermaid init — safe ASCII labels, no HTML injection
mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose", flowchart: { htmlLabels: true } });

interface MermaidRendererProps {
  code: string;
  onRender?: (svg: string) => void;
  containerRef?: React.MutableRefObject<HTMLDivElement | null>;
  height?: string | number;
  compact?: boolean;
}

function MermaidRenderer({ code, onRender, containerRef, height = '70vh', compact = false }: MermaidRendererProps) {
  const ref = useRef<HTMLDivElement>(null);
  const containerElement = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    let active = true;
    const id = `mmd_${Math.random().toString(36).slice(2)}`;
    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (!active) return;
        if (ref.current) {
          ref.current.innerHTML = svg;
          
          // Get SVG dimensions
          const svgElement = ref.current.querySelector('svg');
          if (svgElement) {
            const viewBox = svgElement.getAttribute('viewBox');
            if (viewBox) {
              const [, , width, height] = viewBox.split(' ').map(Number);
              setSvgSize({ width, height });
            } else {
              setSvgSize({ 
                width: parseFloat(svgElement.getAttribute('width') || '800'),
                height: parseFloat(svgElement.getAttribute('height') || '600')
              });
            }
            
            // Make SVG responsive
            svgElement.style.width = '100%';
            svgElement.style.height = '100%';
            svgElement.style.maxWidth = 'none';
            svgElement.style.maxHeight = 'none';
          }
          
          // Center the diagram initially
          setPosition({ x: 0, y: 0 });
          setScale(1);
        }
        onRender?.(svg);
      })
      .catch((err) => {
        if (ref.current)
          ref.current.innerHTML = `<div class='flex items-center justify-center h-full'><pre class='text-red-600 whitespace-pre-wrap bg-red-50 p-4 rounded-lg border border-red-200'>Mermaid Error:\n${String(err)}\n\nCode:\n${code.replace(/</g, "&lt;")}</pre></div>`;
      });
    return () => {
      active = false;
    };
  }, [code, onRender]);
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerElement.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const delta = e.deltaY > 0 ? 0.85 : 1.15;
    const newScale = Math.max(0.1, Math.min(5, scale * delta));
    
    // Zoom towards mouse position
    const scaleDiff = newScale - scale;
    const newX = position.x - (mouseX - rect.width / 2) * scaleDiff / scale;
    const newY = position.y - (mouseY - rect.height / 2) * scaleDiff / scale;
    
    setScale(newScale);
    setPosition({ x: newX, y: newY });
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    document.body.style.cursor = 'grabbing';
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.cursor = 'auto';
  };
  
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };
  
  const fitToScreen = () => {
    if (!containerElement.current || !svgSize.width || !svgSize.height) return;
    
    const containerRect = containerElement.current.getBoundingClientRect();
    const padding = 40;
    
    const scaleX = (containerRect.width - padding) / svgSize.width;
    const scaleY = (containerRect.height - padding) / svgSize.height;
    const newScale = Math.min(scaleX, scaleY, 1);
    
    setScale(newScale);
    setPosition({ x: 0, y: 0 });
  };
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setTimeout(fitToScreen, 100);
    }
  };
  
  return (
    <div className={`relative transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-900/95 backdrop-blur-sm' : ''}`}>
      {/* Advanced Controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-md border border-indigo-200">
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setScale(s => Math.min(5, s * 1.25))} 
              className="w-10 h-10 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-md hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 flex items-center justify-center"
              title="Zoom In (Mouse wheel up)"
            >
              +
            </button>
            <button 
              onClick={() => setScale(s => Math.max(0.1, s * 0.8))} 
              className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold shadow-md hover:from-orange-600 hover:to-red-600 transition-all duration-200 flex items-center justify-center"
              title="Zoom Out (Mouse wheel down)"
            >
              −
            </button>
            <button 
              onClick={fitToScreen}
              className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold shadow-md hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 flex items-center justify-center"
              title="Fit to Screen"
            >
              ⛶
            </button>
            <button 
              onClick={resetView}
              className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold shadow-md hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center justify-center"
              title="Reset View (1:1)"
            >
              🏠
            </button>
            <div className="w-full h-px bg-gray-300 my-1"></div>
            <button 
              onClick={toggleFullscreen}
              className="w-10 h-10 rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 text-white text-xs font-bold shadow-md hover:from-gray-800 hover:to-gray-900 transition-all duration-200 flex items-center justify-center"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? '⛶' : '⛶'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Status Panel */}
      {!compact && (
      <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-md border border-indigo-200">
        <div className="text-xs font-medium text-gray-700 space-y-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${scale > 1 ? 'bg-emerald-500' : scale < 1 ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
            <span>{Math.round(scale * 100)}%</span>
          </div>
          <div className="text-gray-500">
            {svgSize.width}×{svgSize.height}
          </div>
        </div>
      </div>)}
      
      {/* Instructions */}
      {!compact && (
      <div className="absolute bottom-3 left-3 z-20 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-md border border-indigo-200">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center gap-2">
            <span>🖱️</span>
            <span>Drag to pan</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🔍</span>
            <span>Wheel to zoom</span>
          </div>
        </div>
      </div>)}
      
      {/* Close fullscreen */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-200"
        >
          ✕ Close Fullscreen
        </button>
      )}
      
      <div 
        ref={containerElement}
        className={`overflow-hidden bg-gradient-to-br from-white via-gray-50 to-indigo-50 border border-indigo-200 transition-all duration-300 ${
          isFullscreen 
            ? 'w-screen h-screen rounded-none' 
            : 'w-full rounded-xl shadow-lg'
        } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ height: isFullscreen ? '100vh' : (typeof height === 'number' ? `${height}px` : height) }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          ref={(node) => { ref.current = node; if (containerRef) containerRef.current = node; }}
          className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center'
          }}
        />
      </div>
    </div>
  );
}

// Helpers
const copy = async (text: string) => {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
};

function downloadSvg(name: string, svg: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name}.svg`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

async function svgToPngDataUrl(svgString: string) {
  // Create a temporary div to render the SVG
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = svgString;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.background = 'white';
  document.body.appendChild(tempDiv);
  
  try {
    const canvas = await html2canvas(tempDiv, {
      backgroundColor: 'white',
      scale: 2,
      useCORS: true,
      allowTaint: true
    });
    
    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height
    };
  } finally {
    document.body.removeChild(tempDiv);
  }
}

async function downloadPdf(name: string, svg: string) {
  if (!svg) {
    alert('Please wait for the diagram to load before exporting.');
    return;
  }
  
  try {
    const { dataUrl, width, height } = await svgToPngDataUrl(svg);
    const pageW = 842; // A4 landscape width in pt
    const pageH = 595; // A4 landscape height in pt
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    
    // Fit image within margins
    const margin = 24;
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    const scale = Math.min(maxW / width, maxH / height);
    const w = width * scale;
    const h = height * scale;
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;
    
    pdf.addImage(dataUrl, "PNG", x, y, w, h);
    pdf.save(`${name}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Error generating PDF. Please try again.');
  }
}

async function downloadAllSvgsZip(diagrams: Diagram[]) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const d of diagrams) {
    const id = `zip_${Math.random().toString(36).slice(2)}`;
    const { svg } = await mermaid.render(id, d.code);
    zip.file(`${d.title.replaceAll(" ", "_")}.svg`, svg);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "alie-network-uml_svgs.zip"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// Gallery exporters (all diagrams)
async function exportAllPdfGallery() {
  const pageW = 842, pageH = 595, margin = 24;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  let first = true;
  for (const d of diagrams) {
    const { svg } = await mermaid.render(`pdf_${Math.random().toString(36).slice(2)}`, d.code);
    const { dataUrl, width, height } = await svgToPngDataUrl(svg);
    const maxW = pageW - margin * 2, maxH = pageH - margin * 2;
    const scale = Math.min(maxW / width, maxH / height);
    const w = width * scale, h = height * scale;
    const x = (pageW - w) / 2, y = (pageH - h) / 2;
    if (!first) pdf.addPage('a4','landscape');
    first = false;
    pdf.addImage(dataUrl, 'PNG', x, y, w, h);
    pdf.text(d.title, margin, pageH - 10);
  }
  pdf.save('one-ai-uml.pdf');
}

async function exportAllSvgsZipGallery() {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const d of diagrams) {
    const { svg } = await mermaid.render(`zip_${Math.random().toString(36).slice(2)}`, d.code);
    zip.file(`${d.title.replaceAll(' ','_')}.svg`, svg);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'one-ai-uml_svgs.zip'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

async function downloadAllPdf(diagrams: Diagram[]) {
  try {
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    let first = true;
    
    for (const d of diagrams) {
      const { svg } = await mermaid.render(`pdf_${Math.random().toString(36).slice(2)}`, d.code);
      const { dataUrl, width, height } = await svgToPngDataUrl(svg);
      const pageW = 842, pageH = 595, margin = 24;
      const maxW = pageW - margin * 2, maxH = pageH - margin * 2;
      const scale = Math.min(maxW / width, maxH / height);
      const w = width * scale, h = height * scale;
      const x = (pageW - w) / 2, y = (pageH - h) / 2;
      
      if (!first) pdf.addPage("a4", "landscape");
      first = false;
      pdf.addImage(dataUrl, "PNG", x, y, w, h);
      pdf.text(d.title, margin, pageH - 8);
    }
    
    pdf.save("alie-network-uml.pdf");
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Error generating PDF. Please try again.');
  }
}

// Global class for warning blocks
const CLASSDEF = "classDef ex fill:#fff3cd,stroke:#f0ad4e,color:#8a6d3b;\n";

interface Diagram {
  id: string;
  group: string;
  title: string;
  code: string;
}

const diagrams: Diagram[] = [
  // 1) TOKEN PURCHASE -------------------------------------------------------
  {
    id: "1A",
    group: "1) Token Purchase",
    title: "1.A Activity (Swimlanes)",
    code: `flowchart LR\n  %% class definitions\n  ${CLASSDEF}  %% Swimlanes\n  subgraph U[User / Investor]\n    U1([Start: Wants to buy ONE])\n    U2[Install Phantom Wallet]\n    U3[Create or Import Wallet - Backup Seed]\n    U4[Fund Wallet with SOL]\n    U5[Open Jupiter DEX]\n    U6[Select Pair SOL to ONE]\n    D1{Price impact &lt; threshold?}\n    U7[Confirm swap in Phantom]\n    Uend([End: ONE appears in wallet])\n  end\n\n  subgraph P[Phantom Wallet]\n    P1[Render tx summary - amounts/fee/slippage]\n    P2[Request signature]\n    P3[Show success - balances updated]\n  end\n\n  subgraph J[Jupiter DEX UI]\n    J1[Show route and quote]\n    J2[Broadcast via wallet]\n  end\n\n  subgraph S[Solana Network]\n    S1[Validate transaction]\n    S2[Settle swap]\n    S3[Mint/transfer ONE]\n    S4[Return tx hash]\n  end\n\n  %% Main flow\n  U1-->U2-->U3-->U4-->U5-->U6-->D1\n  D1-- Yes -->U7-->P1-->P2\n  P2-- Signed -->J1-->J2-->S1-->S2-->S3-->S4-->P3-->Uend\n  D1-- No -->U6\n\n  %% Exceptions\n  E1{{Insufficient SOL}}:::ex\n  E2{{Signature declined}}:::ex\n  E3{{Slippage too high}}:::ex\n  E4{{Network congestion}}:::ex\n  U4-->E1\n  P2-->E2\n  D1-->E3\n  S1-->E4`,
  },
  {
    id: "1B",
    group: "1) Token Purchase",
    title: "1.B Use-Case",
    code: `flowchart LR\n  A1([User / Investor])\n  A2([Price Oracle])\n  subgraph SYS[One AI Trading - Jupiter + Solana]\n    UC1((Install Wallet))\n    UC2((Fund Wallet with SOL))\n    UC3((Quote Swap SOL to ONE))\n    UC4((Check Price Impact))\n    UC5((Confirm Swap))\n    UC6((Sign Tx))\n    UC7((View Tx Status))\n    UC8((Retry on Failure))\n    UC9((View Updated Balance))\n  end\n  A1 --> UC1\n  A1 --> UC2\n  A1 --> UC3\n  UC3 --> UC4\n  A1 --> UC5\n  UC5 --> UC6\n  A1 --> UC7\n  UC7 -.-> UC8\n  A1 --> UC9\n  A2 --> UC3`,
  },
  {
    id: "1C",
    group: "1) Token Purchase",
    title: "1.C Sequence",
    code: `sequenceDiagram\n  autonumber\n  participant U as User\n  participant J as Jupiter DEX UI\n  participant P as Phantom Wallet\n  participant N as Solana Network\n  participant T as ONE Token Program\n  U->>J: Select SOL to ONE and request quote\n  J-->>U: Show route, slippage, fees\n  U->>P: Confirm swap\n  P-->>U: Tx summary - request signature\n  U->>P: Sign\n  P->>N: Submit transaction\n  N->>T: Execute swap/mint/transfer\n  T-->>N: Result is success\n  N-->>P: Tx confirmed (hash)\n  P-->>U: Balances updated (-SOL, +ONE)\n  alt Exception\n    U-->>U: Insufficient SOL / Adjust slippage / Retry later\n  end`,
  },

  // 2) AI AGENT LAUNCH ------------------------------------------------------
  {
    id: "2A",
    group: "2) AI Agent Launch",
    title: "2.A Activity (Swimlanes)",
    code: `flowchart LR\n  ${CLASSDEF}  subgraph D[Developer]\n    D0([Start: Deploy on-chain AI agent])\n    D1[Choose agent template - ElizaOS based]\n    D2[Configure goals, tools, memory, schedule, funding]\n    D3[Click Deploy]\n    Dend([End: Agent running])\n  end\n  subgraph C[One AI Agent Console - UI]\n    C1[Load template params]\n    C2[Validate config - schema]\n    C3[Show agent status: initializing to running]\n  end\n  subgraph W[Phantom Wallet]\n    W1[Show tx summary]\n    W2[Request signature]\n  end\n  subgraph SN[Solana - Agent Registry]\n    S1[Create or update agent account]\n    S2[Persist params]\n    S3[Set authorities]\n    S4[Emit confirmation]\n  end\n  D0-->D1-->D2-->C1-->C2\n  C2-->D3-->W1-->W2\n  W2-- Signed -->S1-->S2-->S3-->S4-->C3-->Dend\n  F1{Sufficient ONE or SOL?}\n  D2-->F1\n  F1-- No -->D2\n  F1-- Yes -->C1\n  EX1{{Invalid params}}:::ex\n  EX2{{Missing permissions}}:::ex\n  EX3{{Signature rejected}}:::ex\n  EX4{{Program error}}:::ex\n  C2-->EX1\n  C2-->EX2\n  W2-->EX3\n  S1-->EX4`,
  },
  {
    id: "2B",
    group: "2) AI Agent Launch",
    title: "2.B Use-Case",
    code: `flowchart LR\n  DEV([Developer])\n  subgraph PLATFORM[One AI Agent Platform]\n    UCa((Select Agent Template))\n    UCb((Configure Task & Tools))\n    UCc((Validate Config))\n    UCd((Fund & Authorize Deployment))\n    UCe((Sign Tx))\n    UCf((Start Agent Runtime))\n    UCg((Pause/Resume/Stop))\n    UCh((View Logs & Metrics))\n    UCi((Set Alerts))\n  end\n  DEV --> UCa\n  DEV --> UCb\n  UCb --> UCc\n  DEV --> UCd\n  UCd --> UCe\n  DEV --> UCf\n  UCf -.-> UCg\n  DEV --> UCh\n  UCh -.-> UCi`,
  },
  {
    id: "2C",
    group: "2) AI Agent Launch",
    title: "2.C Sequence",
    code: `sequenceDiagram\n  autonumber\n  participant Dev as Developer\n  participant UI as Agent Console UI\n  participant Wal as Phantom Wallet\n  participant Net as Solana Network\n  participant Run as Agent Runtime\n  Dev->>UI: Select template and set params\n  UI-->>Dev: Validate and preview\n  Dev->>Wal: Deploy (signature request)\n  Wal-->>Dev: Tx summary - confirm\n  Dev->>Wal: Sign\n  Wal->>Net: Submit deploy tx\n  Net->>Run: Initialize agent account/config\n  Run-->>Net: Ready\n  Net-->>UI: Confirmed - agent address\n  UI-->>Dev: Running - logs and metrics\n  alt Errors\n    UI-->>Dev: Invalid config\n    Wal-->>Dev: Signature rejected\n    Net-->>UI: Program error\n  end`,
  },

  // 3) USER ONBOARDING ------------------------------------------------------
  {
    id: "3A",
    group: "3) User Onboarding",
    title: "3.A Activity (Swimlanes)",
    code: `flowchart LR\n  ${CLASSDEF}  subgraph NU[New User]\n    N0([Start: Interested in One AI])\n    N1[Install Phantom Wallet]\n    N2[Fund wallet with SOL]\n    N3[Create account in One AI App]\n    N4[Connect wallet]\n    N5[First action: Claim free AI land / AI interaction]\n    Nend([End: Onboarded])\n  end\n  subgraph APP[One AI Web App]\n    A1[Guided checklist]\n    A2[Verify wallet connection]\n    A3[Show starter tasks and tips]\n    A4[Issue success badge]\n  end\n  subgraph PW[Phantom Wallet]\n    PW1[Connect request]\n    PW2[Sign proof of ownership]\n  end\n  subgraph COM[Community - Discord / AMA]\n    C1[Join Discord]\n    C2[Welcome and rules]\n    C3[Invite to AMA]\n  end\n  N0-->N1-->N2-->N3-->N4-->N5-->Nend\n  N3-->A1-->A3\n  N4-->A2\n  N5-->A4\n  N4-->PW1-->PW2-->A2\n  N5-->C1-->C2-->C3\n  X1{{Wallet not detected}}:::ex\n  X2{{Connection rejected}}:::ex\n  X3{{Insufficient SOL}}:::ex\n  X4{{Regional restrictions}}:::ex\n  N4-->X1\n  PW1-->X2\n  N2-->X3\n  A1-->X4`,
  },
  {
    id: "3B",
    group: "3) User Onboarding",
    title: "3.B Use-Case",
    code: `flowchart LR\n  U([New User])\n  CM([Community Manager])\n  subgraph SYS2[One AI App + Community]\n    UC1((Create Account))\n    UC2((Connect Wallet))\n    UC3((Verify Ownership))\n    UC4((Complete First Interaction))\n    UC5((Join Community))\n    UC6((Participate in AMA))\n    UC7((View Getting-Started Checklist))\n  end\n  U --> UC1\n  U --> UC2\n  UC2 --> UC3\n  U --> UC4\n  U --> UC5\n  UC5 -.-> UC6\n  U --> UC7\n  CM --> UC6`,
  },
  {
    id: "3C",
    group: "3) User Onboarding",
    title: "3.C Sequence",
    code: `sequenceDiagram\n  autonumber\n  participant User\n  participant Web as One AI Web App\n  participant Wallet as Phantom Wallet\n  participant Disc as Discord Server\n  User->>Web: Sign up\n  Web-->>User: Request wallet connection\n  User->>Wallet: Connect\n  Wallet-->>User: Sign proof of ownership\n  User->>Web: Return signature\n  Web-->>User: Checklist + Try your first action\n  User->>Web: Execute action\n  Web-->>User: Success badge\n  Web->>User: Invite to Discord (deep link)\n  User->>Disc: Join and greet\n  alt Issues\n    Wallet-->>User: Connection declined\n    Web-->>User: Action failed - Retry or Support\n    User-->>User: Insufficient SOL\n  end`,
  },
];

interface SidebarProps {
  items: Diagram[];
  currentId: string;
  onSelect: (diagram: Diagram) => void;
}

function Sidebar({ items, currentId, onSelect }: SidebarProps) {
  const groups = useMemo(() => {
    const m = new Map<string, Diagram[]>();
    items.forEach((d) => { if (!m.has(d.group)) m.set(d.group, []); m.get(d.group)!.push(d); });
    return Array.from(m.entries());
  }, [items]);
  return (
    <aside className="w-full lg:w-80 shrink-0">
      <div className="rounded-xl bg-white border border-gray-200 shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 px-4 py-3">
          <h2 className="text-white font-bold text-sm">UML Diagrams</h2>
          <div className="text-xs text-indigo-100 mt-1">{diagrams.length} diagrams in {groups.length} categories</div>
        </div>
        
        {/* Navigation */}
        <nav className="max-h-[calc(100vh-280px)] overflow-y-auto divide-y divide-gray-100">
          {groups.map(([group, ds], groupIndex) => (
            <details key={group} className="group" open={ds.some(d => d.id === currentId)}>
              <summary className="flex items-center gap-2 px-4 py-3 bg-white cursor-pointer list-none select-none">
                <span className="w-5 h-5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {groupIndex + 1}
                </span>
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  {group}
                </span>
                <span className="ml-auto text-gray-400 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <ul className="px-2 pb-3 space-y-1">
                {ds.map((d) => (
                  <li key={d.id}>
                    <button
                      onClick={() => onSelect(d)}
                      className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                        currentId === d.id
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm"
                          : "hover:bg-indigo-50 text-gray-700 hover:text-indigo-700"
                      }`}
                    >
                      {d.title}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function MobilePicker({ items, currentId, onSelect }: SidebarProps) {
  return (
    <div className="lg:hidden">
      <label className="block text-xs font-semibold text-gray-600 mb-1">Select Diagram</label>
      <select
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        value={currentId}
        onChange={(e) => {
          const d = items.flatMap(i => i).find(diag => diag.id === e.target.value);
          const found = items.find(i => i.id === e.target.value);
          const all: Diagram[] = items.reduce((a, b) => a.concat(b as any), [] as any);
          const picked = all.find(diag => diag.id === e.target.value);
          if (picked) onSelect(picked);
        }}
      >
        {items.map((d) => (
          <option key={d.id} value={d.id}>{d.title}</option>
        ))}
      </select>
    </div>
  );
}

export default function App() {
  const [selected, setSelected] = useState(diagrams[0]);
  const [svg, setSvg] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="min-h-screen w-full bg-[#f6f7f9]">
      {/* Header similar to provided HTML */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[20px] font-bold text-gray-900">One AI Network — UML Exporter</div>
            <div className="text-xs text-gray-500">Auto-renders Mermaid & exports a multi-page A4 PDF.</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportAllPdfGallery} className="rounded-md bg-gray-900 text-white px-3 py-2 text-xs font-medium hover:bg-black">Export All PDF</button>
            <button onClick={exportAllSvgsZipGallery} className="rounded-md bg-white border border-gray-300 px-3 py-2 text-xs font-medium hover:bg-gray-50">Export All SVG (ZIP)</button>
          </div>
        </div>
      </header>

      {/* Gallery grid */}
      <main className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {diagrams.map((d, i) => (
            <div key={d.id} className="card rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
              <div className="mb-3">
                <span className="inline-block text-[12px] px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">{d.group}</span>
                <strong className="ml-2 text-gray-900">{d.title}</strong>
              </div>
              <div data-diagram={i} className="svgbox">
                <MermaidRenderer code={d.code} onRender={() => {}} height={420} compact />
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-6 text-center">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-6 rounded-2xl bg-gradient-to-r from-white/90 to-gray-50/90 backdrop-blur-sm px-10 py-5 shadow-xl border border-gray-200">
            <div className="space-y-1 text-left">
              <div className="text-xs text-gray-500">v1.0.0</div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  One AI Network
                </span>
                <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                  v1.0.0
                </span>
              </div>
              <div className="text-xs text-gray-600">
                UML Documentation & System Architecture Diagrams
              </div>
            </div>
            
            <div className="w-px h-10 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
            
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Developed by</div>
              <div className="text-sm font-semibold text-gray-800">ALIE Network</div>
            </div>
            
            <div className="w-px h-10 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
            
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Technology</div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">React</span>
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">Mermaid.js</span>
                <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-medium">TypeScript</span>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            © {new Date().getFullYear()} One AI Network. All rights reserved. • Documentation prepared for internal use.
          </div>
        </div>
      </footer>
    </div>
  );
}
