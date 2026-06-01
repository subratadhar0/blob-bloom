import { useState, useMemo } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Copy, 
  Download, 
  Check, 
  Sparkles, 
  Compass, 
  Layers, 
  Eye, 
  EyeOff, 
  Dices,
  RefreshCw
} from "lucide-react";

// --- SEEDABLE RANDOM NUMBER GENERATOR (Mulberry32) ---
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- MODE A: RANDOM ORGANIC BLOB GENERATION ---
interface BlobPoint {
  x: number;
  y: number;
  angle: number;
  radius: number;
}

function generateBlobPoints(
  cx: number,
  cy: number,
  complexity: number,
  randomnessPercent: number,
  seed: number,
  shapeSize: number
): BlobPoint[] {
  const baseRadius = shapeSize / 2;
  const N = Math.max(3, Math.min(12, Math.floor(complexity)));
  const rand = mulberry32(seed);

  const points: BlobPoint[] = [];
  for (let i = 0; i < N; i++) {
    const angle = (i / N) * 2 * Math.PI;
    const rng = rand();
    
    // Create an asymmetric noise pattern that allows deep valleys (inwards) and moderate peaks (outwards)
    // to give organic "depth" and fluid structure to high-randomness settings.
    const randDev = (rng - 0.58) * 1.6; // deeper inward swings
    
    // Add harmonic ripples to guarantee varied, spectacular spatial shapes across the points
    const harmonicFreq = 2 + (Math.floor(seed + i) % 3);
    const wave = Math.sin(angle * harmonicFreq) * 0.3;
    
    const scaleFactor = randomnessPercent / 100;
    const totalOffset = (randDev + wave * 0.5) * scaleFactor;
    
    // Safe-clamp base factor to keep curves from intersecting but allow highly dynamic cavities
    const rFactor = 1 + totalOffset;
    const r = Math.max(baseRadius * 0.1, baseRadius * rFactor);
    
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push({ x, y, angle, radius: r });
  }
  return points;
}

function getBlobPath(points: BlobPoint[], smoothness: number): string {
  const N = points.length;
  if (N < 3) return "";

  const commands: string[] = [];
  const startPt = points[0];
  commands.push(`M ${startPt.x.toFixed(2)} ${startPt.y.toFixed(2)}`);

  for (let i = 0; i < N; i++) {
    const p0 = points[(i - 1 + N) % N];
    const p1 = points[i];
    const p2 = points[(i + 1) % N];
    const p3 = points[(i + 2) % N];

    // Catmull-Rom spline control point translation
    // smoothness (0.0 to 1.0) scales the distance of control points
    // When smoothness = 0, control points overlap vertices, creating exact straight lines.
    const c1x = p1.x + (smoothness / 6) * (p2.x - p0.x);
    const c1y = p1.y + (smoothness / 6) * (p2.y - p0.y);
    const c2x = p2.x - (smoothness / 6) * (p3.x - p1.x);
    const c2y = p2.y - (smoothness / 6) * (p3.y - p1.y);

    commands.push(
      `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    );
  }

  commands.push("Z");
  return commands.join(" ");
}

// --- MODE B: PARAMETRIC FLOWER SHAPE GENERATION ---
interface FlowerPointInfo {
  tips: { x: number; y: number; angle: number }[];
  valleys: { x: number; y: number; angle: number }[];
  path: string;
}

function getFlowerData(
  cx: number,
  cy: number,
  petalCount: number,
  petalLengthPercent: number,
  innerRadiusPercent: number,
  roundnessOuterPercent: number,
  roundnessInnerPercent: number,
  twistDeg: number,
  shapeSize: number
): FlowerPointInfo {
  const rTip = (petalLengthPercent / 100) * (shapeSize / 2);
  const rValley = (innerRadiusPercent / 100) * (shapeSize / 2);
  const weightOuter = roundnessOuterPercent / 100;
  const weightInner = roundnessInnerPercent / 100;
  const twistRad = (twistDeg * Math.PI) / 180;

  const N = Math.max(3, Math.min(24, Math.floor(petalCount)));
  const tips: { x: number; y: number; angle: number }[] = [];
  const valleys: { x: number; y: number; angle: number }[] = [];
  const commands: string[] = [];

  // Compute points and valleys
  for (let i = 0; i < N; i++) {
    const baseAngle = (i * 2 * Math.PI) / N;
    const angleL = baseAngle - Math.PI / N;
    const angleTip = baseAngle + twistRad;

    const Tx = cx + rTip * Math.cos(angleTip);
    const Ty = cy + rTip * Math.sin(angleTip);
    tips.push({ x: Tx, y: Ty, angle: angleTip });

    const VLx = cx + rValley * Math.cos(angleL);
    const VLy = cy + rValley * Math.sin(angleL);
    valleys.push({ x: VLx, y: VLy, angle: angleL });
  }

  // Draw smooth continuous radial flower coordinates
  // Start at the left valley of the first petal
  const firstAngleL = -Math.PI / N;
  const startX = cx + rValley * Math.cos(firstAngleL);
  const startY = cy + rValley * Math.sin(firstAngleL);
  commands.push(`M ${startX.toFixed(2)} ${startY.toFixed(2)}`);

  for (let i = 0; i < N; i++) {
    const baseAngle = (i * 2 * Math.PI) / N;
    const angleL = baseAngle - Math.PI / N;
    const angleR = baseAngle + Math.PI / N;
    const angleTip = baseAngle + twistRad;

    // Base point coordinate vectors
    const Tx = cx + rTip * Math.cos(angleTip);
    const Ty = cy + rTip * Math.sin(angleTip);

    const VLx = cx + rValley * Math.cos(angleL);
    const VLy = cy + rValley * Math.sin(angleL);

    const VRx = cx + rValley * Math.cos(angleR);
    const VRy = cy + rValley * Math.sin(angleR);

    // Dynamic scale of control handles based on Euclidean segment span
    const distL = Math.sqrt((Tx - VLx) ** 2 + (Ty - VLy) ** 2);
    const scaleL = 0.35 * distL;

    // Direction vector 1 (leaving VL toward T)
    const uValLx = -Math.sin(angleL);
    const uValLy = Math.cos(angleL);
    const c1x = VLx + (Tx - VLx) * 0.35 * (1 - weightInner) + uValLx * scaleL * weightInner;
    const c1y = VLy + (Ty - VLy) * 0.35 * (1 - weightInner) + uValLy * scaleL * weightInner;

    // Direction vector 2 (entering T from the left)
    const uT_left_x = -Math.sin(angleTip);
    const uT_left_y = Math.cos(angleTip);
    const c2x = Tx + (VLx - Tx) * 0.35 * (1 - weightOuter) + uT_left_x * scaleL * weightOuter;
    const c2y = Ty + (VLy - Ty) * 0.35 * (1 - weightOuter) + uT_left_y * scaleL * weightOuter;

    // Right half of the petal (T to VR)
    const distR = Math.sqrt((Tx - VRx) ** 2 + (Ty - VRy) ** 2);
    const scaleR = 0.35 * distR;

    // Direction vector 3 (leaving T rightward toward VR)
    const uT_right_x = Math.sin(angleTip);
    const uT_right_y = -Math.cos(angleTip);
    const c3x = Tx + (VRx - Tx) * 0.35 * (1 - weightOuter) + uT_right_x * scaleR * weightOuter;
    const c3y = Ty + (VRy - Ty) * 0.35 * (1 - weightOuter) + uT_right_y * scaleR * weightOuter;

    // Direction vector 4 (entering VR from T)
    const uValRx = Math.sin(angleR);
    const uValRy = -Math.cos(angleR);
    const c4x = VRx + (Tx - VRx) * 0.35 * (1 - weightInner) + uValRx * scaleR * weightInner;
    const c4y = VRy + (Ty - VRy) * 0.35 * (1 - weightInner) + uValRy * scaleR * weightInner;

    commands.push(
      `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${Tx.toFixed(2)} ${Ty.toFixed(2)}`
    );
    commands.push(
      `C ${c3x.toFixed(2)} ${c3y.toFixed(2)}, ${c4x.toFixed(2)} ${c4y.toFixed(2)}, ${VRx.toFixed(2)} ${VRy.toFixed(2)}`
    );
  }

  commands.push("Z");

  return {
    tips,
    valleys,
    path: commands.join(" ")
  };
}

export default function App() {
  // --- STATE SYSTEM ---
  const [activeMode, setActiveMode] = useState<"A" | "B">("A");

  // Mode A Inputs
  const [complexity, setComplexity] = useState<number>(6);
  const [randomness, setRandomness] = useState<number>(45);
  const [smoothness, setSmoothness] = useState<number>(0.85);
  const [seed, setSeed] = useState<number>(1337);

  // Mode B Inputs
  const [petalCount, setPetalCount] = useState<number>(8);
  const [petalLength, setPetalLength] = useState<number>(85);
  const [innerRadius, setInnerRadius] = useState<number>(35);
  const [petalRoundness, setPetalRoundness] = useState<number>(60);
  const [innerRoundness, setInnerRoundness] = useState<number>(50);
  const [twist, setTwist] = useState<number>(0);

  // Shared Global parameters
  const [fillColor, setFillColor] = useState<string>("#818cf8");
  const [strokeEnabled, setStrokeEnabled] = useState<boolean>(true);
  const [strokeColor, setStrokeColor] = useState<string>("#1e1b4b");
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [shapeSize, setShapeSize] = useState<number>(380);
  const [canvasBg, setCanvasBg] = useState<"transparent" | "white" | "dark">("white");
  
  // Custom interactive guides toggle
  const [showMathHelpers, setShowMathHelpers] = useState<boolean>(false);

  // Temporary copy confirmation feedback state
  const [copied, setCopied] = useState<boolean>(false);

  // Center coordinate of vector canvas (600x600 fixed grid)
  const cx = 300;
  const cy = 300;

  // --- DERIVED MEMO SHAPES ---
  const activeBlobInfo = useMemo(() => {
    const points = generateBlobPoints(cx, cy, complexity, randomness, seed, shapeSize);
    const path = getBlobPath(points, smoothness);
    return { points, path };
  }, [complexity, randomness, smoothness, seed, shapeSize]);

  const activeFlowerInfo = useMemo(() => {
    return getFlowerData(
      cx,
      cy,
      petalCount,
      petalLength,
      innerRadius,
      petalRoundness,
      innerRoundness,
      twist,
      shapeSize
    );
  }, [petalCount, petalLength, innerRadius, petalRoundness, innerRoundness, twist, shapeSize]);

  const activePath = activeMode === "A" ? activeBlobInfo.path : activeFlowerInfo.path;

  // --- ACTIONS & EXPORTS ---
  const handleRandomSeed = () => {
    const nextSeed = Math.floor(Math.random() * 100000);
    setSeed(nextSeed);
  };

  const serializeSvg = (withEditorChrome = false) => {
    const bgFill = canvasBg === "transparent" ? "none" : canvasBg === "white" ? "#ffffff" : "#0f172a";
    const strokeAttr = strokeEnabled 
      ? `stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"` 
      : "";
    
    let parts = [];
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">`);
    
    // Background Rect if not transparent and not chrome only
    if (canvasBg !== "transparent" && !withEditorChrome) {
      parts.push(`  <rect width="600" height="600" fill="${bgFill}" />`);
    }

    // Path
    parts.push(`  <path d="${activePath}" fill="${fillColor}" ${strokeAttr} />`);
    parts.push(`</svg>`);

    return parts.join("\n");
  };

  const handleCopySVG = async () => {
    const content = serializeSvg(false);
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Unable to copy to clipboard", err);
    }
  };

  const handleDownloadSVG = () => {
    const content = serializeSvg(false);
    const blob = new Blob([content], { type: "image/svg+xml;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    
    const filename = activeMode === "A" 
      ? `blob-${seed}.svg` 
      : `flower-${petalCount}p.svg`;

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  };

  // Transparency Pattern Style
  const transparencyStyle = {
    backgroundImage: "conic-gradient(#f1f5f9 25%, #ffffff 0 50%, #f1f5f9 0 75%, #ffffff 0)",
    backgroundSize: "20px 20px"
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-800 font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* HEADER BAR */}
      <header className="border-b border-slate-200/60 bg-white px-6 py-4.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm shadow-indigo-600/20">
            🫧
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">Blob & Bloom</h1>
            <p className="text-[11px] text-slate-400 font-medium mt-1 uppercase tracking-wider">Algorithmic SVG Generator</p>
          </div>
        </div>
        
        {/* TOP MODE TOGGLE */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/50">
          <button
            onClick={() => setActiveMode("A")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              activeMode === "A"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Dices size={13} className={activeMode === "A" ? "text-indigo-500" : ""} />
            Random Blob
          </button>
          <button
            onClick={() => setActiveMode("B")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              activeMode === "B"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Compass size={13} className={activeMode === "B" ? "text-indigo-500" : ""} />
            Flower Builder
          </button>
        </div>
      </header>

      {/* CORE WORKSPACE */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-stretch">
        
        {/* LEFT COMPACT PANEL (Controls) */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs flex flex-col justify-between self-start">
          
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-bold text-indigo-600/90 tracking-widest uppercase">
                {activeMode === "A" ? "Blob Parameters" : "Flower Parameters"}
              </span>
              <h2 className="text-sm font-semibold text-slate-800 mt-1">Shape Formulation</h2>
            </div>

            {/* MODE A CONTROLS */}
            {activeMode === "A" && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* COMPLEXITY SLIDER */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[0.8125rem]">
                    <span className="font-semibold text-slate-500">Complexity</span>
                    <span className="font-bold text-slate-800 font-mono">{complexity} pts</span>
                  </div>
                  <input
                    id="slider-complexity"
                    type="range"
                    min="3"
                    max="12"
                    step="1"
                    value={complexity}
                    onChange={(e) => setComplexity(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                  />
                  <p className="text-[10px] text-slate-400">Number of original circle coordinates</p>
                </div>

                {/* RANDOMNESS SLIDER */}
                <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-100/50 shadow-3xs transition-all duration-300 hover:bg-indigo-50/70 hover:border-indigo-200/50 select-none">
                  <div className="flex justify-between items-center text-[0.8125rem]">
                    <span className="font-semibold text-indigo-950">Randomness (Dynamic Depth)</span>
                    <span className="font-extrabold text-indigo-600 font-mono">{randomness}%</span>
                  </div>
                  <input
                    id="slider-randomness"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={randomness}
                    onChange={(e) => setRandomness(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-indigo-200/50 rounded-lg appearance-none"
                  />
                  <p className="text-[10px] text-slate-500 font-medium leading-normal">
                    Fuses asymmetrical random offsets with secondary harmonics to create deeply immersive organic valleys and peaks.
                  </p>
                </div>

                {/* SMOOTHNESS SLIDER */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[0.8125rem]">
                    <span className="font-semibold text-slate-500">Smoothness</span>
                    <span className="font-bold text-slate-800 font-mono">{(smoothness).toFixed(2)}</span>
                  </div>
                  <input
                    id="slider-smoothness"
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.01"
                    value={smoothness}
                    onChange={(e) => setSmoothness(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                  />
                  <p className="text-[10px] text-slate-400">Catmull-Rom spline curve stiffness</p>
                </div>

                {/* SEED INPUT & REROLL ROW */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex justify-between items-center text-[0.8125rem]">
                    <span className="font-semibold text-slate-500">Seed Value</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="input-seed"
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                      className="flex-1 px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                    <button
                      onClick={handleRandomSeed}
                      title="Reroll Seed"
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border border-slate-200/50"
                    >
                      <RefreshCw size={12} />
                      Reroll
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODE B CONTROLS */}
            {activeMode === "B" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* PETAL COUNT SLIDER */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[0.8125rem]">
                    <span className="font-semibold text-slate-500">Petals count</span>
                    <span className="font-bold text-slate-800 font-mono">{petalCount} petals</span>
                  </div>
                  <input
                    id="slider-petal-count"
                    type="range"
                    min="3"
                    max="24"
                    step="1"
                    value={petalCount}
                    onChange={(e) => setPetalCount(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                  />
                </div>

                {/* PETAL LENGTH SLIDER */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[0.8125rem]">
                    <span className="font-semibold text-slate-500">Petal reach</span>
                    <span className="font-bold text-slate-800 font-mono">{petalLength}%</span>
                  </div>
                  <input
                    id="slider-petal-reach"
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={petalLength}
                    onChange={(e) => setPetalLength(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                  />
                </div>

                {/* INNER RADIUS SLIDER */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[0.8125rem]">
                    <span className="font-semibold text-slate-500">Valley depth</span>
                    <span className="font-bold text-slate-800 font-mono">{innerRadius}%</span>
                  </div>
                  <input
                    id="slider-valley-depth"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={innerRadius}
                    onChange={(e) => setInnerRadius(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                  />
                </div>

                {/* PETAL ROUNDNESS SLIDER */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[0.8125rem]">
                    <span className="font-semibold text-slate-500">Petal corners</span>
                    <span className="font-bold text-slate-800 font-mono">{petalRoundness}%</span>
                  </div>
                  <input
                    id="slider-petal-corners"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={petalRoundness}
                    onChange={(e) => setPetalRoundness(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                  />
                </div>

                {/* INNER ROUNDNESS SLIDER */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[0.8125rem]">
                    <span className="font-semibold text-slate-500">Inner corners</span>
                    <span className="font-bold text-slate-800 font-mono">{innerRoundness}%</span>
                  </div>
                  <input
                    id="slider-inner-corners"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={innerRoundness}
                    onChange={(e) => setInnerRoundness(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                  />
                </div>

                {/* TWIST SLIDER */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[0.8125rem]">
                    <span className="font-semibold text-slate-500">Petal twist</span>
                    <span className="font-bold text-slate-800 font-mono">{twist}°</span>
                  </div>
                  <input
                    id="slider-petal-twist"
                    type="range"
                    min="-90"
                    max="90"
                    step="1"
                    value={twist}
                    onChange={(e) => setTwist(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                  />
                </div>
              </div>
            )}

            <hr className="border-slate-100" />

            {/* SHARED PARAMETERS SECTION */}
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-indigo-600/90 tracking-widest uppercase">Canvas & Styling</span>
                <h2 className="text-sm font-semibold text-slate-800 mt-0.5">Vector Theme</h2>
              </div>

              {/* FILL COLOR SELECTOR */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[0.8125rem] font-semibold text-slate-500">Fill Color</span>
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shadow-3xs flex-shrink-0">
                    <input
                      id="input-fill-color"
                      type="color"
                      value={fillColor}
                      onChange={(e) => setFillColor(e.target.value)}
                      className="absolute inset-0 scale-150 cursor-pointer w-full h-full p-0 border-none rounded-none"
                    />
                  </div>
                  <input
                    id="text-fill-color"
                    type="text"
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* STROKE CONFIGURATORS */}
              <div className="space-y-3.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <label htmlFor="checkbox-stroke" className="text-[0.8125rem] font-semibold text-slate-600 flex items-center gap-2 cursor-pointer">
                    <input
                      id="checkbox-stroke"
                      type="checkbox"
                      checked={strokeEnabled}
                      onChange={(e) => setStrokeEnabled(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer accent-indigo-600"
                    />
                    Enable Stroke Outline
                  </label>
                </div>

                {strokeEnabled && (
                  <div className="space-y-3 pt-1 animate-in slide-in-from-top-1 duration-150">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Color</span>
                        <div className="flex items-center gap-2">
                          <input
                            id="input-stroke-color"
                            type="color"
                            value={strokeColor}
                            onChange={(e) => setStrokeColor(e.target.value)}
                            className="w-6 h-6 rounded border border-slate-200 cursor-pointer shadow-3xs p-0 bg-transparent flex-shrink-0"
                          />
                          <input
                            id="text-stroke-color"
                            type="text"
                            value={strokeColor}
                            onChange={(e) => setStrokeColor(e.target.value)}
                            className="w-full min-w-0 px-1 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Width</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            id="slider-stroke-width"
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            value={strokeWidth}
                            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                            className="w-full accent-indigo-600 cursor-pointer h-1.2"
                          />
                          <span className="font-mono text-[10px] font-bold text-slate-600 w-6 text-right">{strokeWidth}px</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SHAPE VIEWPORT SIZE */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[0.8125rem]">
                  <span className="font-semibold text-slate-500">Shape Scale</span>
                  <span className="font-bold text-slate-800 font-mono">{shapeSize}px</span>
                </div>
                <input
                  id="slider-shape-scale"
                  type="range"
                  min="100"
                  max="500"
                  step="5"
                  value={shapeSize}
                  onChange={(e) => setShapeSize(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                />
              </div>

              {/* CANVAS BACKGROUND OPTIONS */}
              <div className="flex flex-col gap-2">
                <span className="text-[0.8125rem] font-semibold text-slate-500">Backdrop Palette</span>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/40">
                  {(["transparent", "white", "dark"] as const).map((bg) => (
                    <button
                      key={bg}
                      onClick={() => setCanvasBg(bg)}
                      className={`py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all duration-150 ${
                        canvasBg === bg
                          ? "bg-white text-slate-800 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* GENERATE ACTION AT THE BOTTOM FOR MODE A */}
          {activeMode === "A" && (
            <div className="mt-6 pt-3">
              <button
                onClick={handleRandomSeed}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-3 px-4 rounded-xl font-semibold text-xs tracking-wide transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                <Sparkles size={14} />
                🎲 GENERATE NEW SHAPE
              </button>
            </div>
          )}
        </div>

        {/* RIGHT WORKSPACE PREVIEW */}
        <div className="flex flex-col justify-between gap-6">
          <div className="flex-1 flex flex-col min-h-[460px] lg:min-h-[520px] bg-white border border-slate-200/70 rounded-2xl shadow-3xs overflow-hidden relative">
            
            {/* CANVAS CONTROLS FLAVORS BAR */}
            <div className="border-b border-slate-100/80 px-4 py-3 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={13} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Live Viewport Integration (600 × 600px)
                </span>
              </div>

              {/* MATH HELPERS CHROME BUTTON */}
              <button
                onClick={() => setShowMathHelpers(!showMathHelpers)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide flex items-center gap-1.5 transition-all outline-none border ${
                  showMathHelpers
                    ? "bg-indigo-50 border-indigo-200/70 text-indigo-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {showMathHelpers ? <Eye size={13} /> : <EyeOff size={13} />}
                Math Helpers: {showMathHelpers ? "On" : "Off"}
              </button>
            </div>

            {/* THE DYNAMIC SVG viewport stage */}
            <div 
              className="flex-1 w-full relative flex items-center justify-center transition-all duration-300 p-6"
              style={canvasBg === "transparent" ? transparencyStyle : canvasBg === "white" ? { backgroundColor: "#ffffff" } : { backgroundColor: "#0f172a" }}
            >
              {/* Optional ambient grids or blueprints on solid white or dark backdrops */}
              {canvasBg !== "transparent" && (
                <div className="absolute inset-0 select-none pointer-events-none opacity-[0.03] dark:opacity-[0.06] bg-[radial-gradient(#1e1b4b_1px,transparent_1px)] [background-size:16px_16px]" />
              )}

              {/* SVG STAGE */}
              <svg 
                viewBox="0 0 600 600" 
                className="w-full h-full max-w-[480px] max-h-[480px] drop-shadow-xl"
              >
                {/* Visual draft concentric blueprint coordinate lines when math helpers are on */}
                <AnimatePresence>
                  {showMathHelpers && (
                    <motion.g 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      stroke={canvasBg === "dark" ? "rgba(255,255,255,0.07)" : "rgba(30,27,75,0.05)"}
                      strokeWidth="1"
                      fill="none"
                    >
                      {/* Nested radar lines */}
                      <circle cx={cx} cy={cy} r={50} strokeDasharray="3,3" />
                      <circle cx={cx} cy={cy} r={100} strokeDasharray="3,3" />
                      <circle cx={cx} cy={cy} r={150} strokeDasharray="3,3" />
                      <circle cx={cx} cy={cy} r={200} strokeDasharray="3,3" />
                      <circle cx={cx} cy={cy} r={250} strokeDasharray="3,3" />
                      <line x1={cx} y1={50} x2={cx} y2={550} strokeDasharray="4,4" />
                      <line x1={50} y1={cy} x2={550} y2={cy} strokeDasharray="4,4" />
                    </motion.g>
                  )}
                </AnimatePresence>

                {/* THE ACTUAL RENDERED SHAPE */}
                <g>
                  <path
                    d={activePath}
                    fill={fillColor}
                    stroke={strokeEnabled ? strokeColor : "none"}
                    strokeWidth={strokeEnabled ? strokeWidth : 0}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-150 ease-out"
                  />
                </g>

                {/* VISUAL MATH HELPER ANCHOR DOTS & CONNECTORS */}
                <AnimatePresence>
                  {showMathHelpers && (
                    <motion.g
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* MODE A HELPERS */}
                      {activeMode === "A" && activeBlobInfo.points.map((pt, idx) => (
                        <g key={`anchor-blob-${idx}`}>
                          <motion.line
                            x1={cx}
                            y1={cy}
                            x2={pt.x}
                            y2={pt.y}
                            stroke="rgba(129, 140, 248, 0.4)"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                          />
                          {/* Anchor Circle */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={4.5}
                            fill="#818cf8"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            className="shadow-sm"
                          />
                          {/* Anchor Label */}
                          <text
                            x={pt.x + (pt.x > cx ? 10 : -20)}
                            y={pt.y + (pt.y > cy ? 14 : -8)}
                            fill={canvasBg === "dark" ? "#94a3b8" : "#475569"}
                            fontSize="9px"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            P{idx+1}
                          </text>
                        </g>
                      ))}

                      {/* MODE B HELPERS */}
                      {activeMode === "B" && (
                        <>
                          {/* Draw Flower tip anchors */}
                          {activeFlowerInfo.tips.map((pt, idx) => (
                            <g key={`anchor-flower-tip-${idx}`}>
                              <line
                                x1={cx}
                                y1={cy}
                                x2={pt.x}
                                y2={pt.y}
                                stroke="rgba(236, 72, 153, 0.3)"
                                strokeWidth="1"
                                strokeDasharray="3,3"
                              />
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={4.5}
                                fill="#ec4899"
                                stroke="#ffffff"
                                strokeWidth="1.5"
                              />
                            </g>
                          ))}
                          {/* Draw Flower valley anchors */}
                          {activeFlowerInfo.valleys.map((pt, idx) => (
                            <g key={`anchor-flower-val-${idx}`}>
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={3.5}
                                fill="#fbbf24"
                                stroke="#ffffff"
                                strokeWidth="1.2"
                              />
                            </g>
                          ))}
                        </>
                      )}
                    </motion.g>
                  )}
                </AnimatePresence>
              </svg>
            </div>
            
            {/* INLINE EXPLANATION STATS LAYER */}
            <div className="bg-slate-50/75 border-t border-slate-100 px-5 py-3 flex text-[11px] text-slate-500 justify-between items-center">
              <span className="font-medium text-slate-400">
                Method: <strong className="text-slate-600 font-semibold">{activeMode === "A" ? "Catmull-Rom Bezier Spline" : "Parametric Radial curves"}</strong>
              </span>
              <span className="font-mono text-slate-400">
                Size: {shapeSize}px × {shapeSize}px
              </span>
            </div>
          </div>

          {/* ACTION FOOTER BUTTONS */}
          <div className="grid grid-cols-2 gap-4 max-w-sm w-full mx-auto">
            {/* COPY BUTTON */}
            <button
              onClick={handleCopySVG}
              className={`py-3 px-5 rounded-xl font-bold text-xs tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-xs border ${
                copied
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-extrabold"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
              }`}
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-600 animate-bounce" />
                  COPIED!
                </>
              ) : (
                <>
                  <Copy size={13} className="text-indigo-500" />
                  COPY SVG
                </>
              )}
            </button>

            {/* DOWNLOAD BUTTON */}
            <button
              onClick={handleDownloadSVG}
              className="py-3 px-5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl font-bold text-xs tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Download size={13} className="text-indigo-400" />
              DOWNLOAD SVG
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
