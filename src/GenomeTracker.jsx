import React, { useState, useRef, useEffect } from "react";
import ribbitLogo from '/logo_rounded.png'

// Genome Tracker
// Single-file React component. Default export a component that renders a small UI
// to upload/ paste a BED file and visualize regions as a genome track per contig.

// Usage: drop this file into a Vite/CRA project and render <GenomeTracker />

export default function GenomeTracker() {
  const [bedText, setBedText] = useState(DEFAULT_BED);
  const [tracks, setTracks] = useState({}); // {chrom: [{start,end,name,score,strand}]}
  const [chroms, setChroms] = useState([]);
  const [selectedChrom, setSelectedChrom] = useState(null);
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(1000);
  const svgRef = useRef(null);
  const [message, setMessage] = useState("");
  const [zoomFactor, setZoomFactor] = useState(1);

  useEffect(() => {
    const parsed = parseBED(bedText);
    setTracks(parsed);
    const keys = Object.keys(parsed).sort((a,b)=>naturalSortChrom(a,b,parsed));
    setChroms(keys);
    if (keys.length) {
      setSelectedChrom(keys[0]);
      const chromLen = parsed[keys[0]] ? parsed[keys[0]][parsed[keys[0]].length-1].end : 1000;
      setViewStart(0);
      setViewEnd(Math.max(chromLen, 1000));
    }
  }, []);

  useEffect(()=>{
    if (!selectedChrom) return;
    const chromLen = tracks[selectedChrom] ? tracks[selectedChrom][tracks[selectedChrom].length-1].end : 1000;
    // clamp
    const maxEnd = Math.max(chromLen, 1);
    setViewStart(s=>Math.max(0, Math.min(s, maxEnd-1)));
    setViewEnd(e=>Math.max(viewStart+1, Math.min(e, maxEnd)));
  },[selectedChrom, tracks]);

  function naturalSortChrom(a,b,tracks){
    // try numeric when both start with chr + number
    const an = a.replace(/^chr/i,'');
    const bn = b.replace(/^chr/i,'');
    const ai = parseInt(an,10);
    const bi = parseInt(bn,10);
    if (!isNaN(ai) && !isNaN(bi)) return ai-bi;
    return a.localeCompare(b);
  }

  function parseBED(text){
    const lines = text.split(/\r?\n/);
    const out = {};
    let index = 0;
    for (let raw of lines){
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const f = line.split(/\t| +/).filter(s=>s!=="");
      if (f.length < 3) continue;
      const chrom = f[0];
      const start = parseInt(f[1],10);
      const end = parseInt(f[2],10);
      const motif = f[3];
      const purity = f[4];
      const motif_length = f[5];
      const length = f[6];
      const units = f[7];
      const name = `${motif_length}  (${purity})`;
      const info = f[8];

      if (!out[chrom]) out[chrom]=[];
      out[chrom].push({start,end,motif,purity,motif_length,length,units,name,index});

      if (info != 'I') {
        const [M, numM, regions, motifs] = info.split(':').map(s=>s.trim());
        const motifsList = motifs ? motifs.split(',') : [];
        const regionsList = regions ? 
                              regions.split(',').map((r, i)=>{
                                const [start, end, motif_length, purity] = r.split('-').map(x=>parseFloat(x,10));
                                const motif = motifsList[i];
                                const length = end - start;
                                const units = Math.floor(length / motif_length);
                                const name = `${motif_length}  (${purity})`;
                                return {start, end, motif, purity, motif_length, length, units, name, index}; 
                              }) : [];
        for (let r of regionsList) {
          if (r.purity < 0.7) { console.log('skipping low purity sub-region', r); continue; }
          out[chrom].push(r);
        }
      }
      index++;
    }
    // sort each track by start
    // Object.keys(out).forEach(k=> out[k].sort((a,b)=>a.start-b.start));
    return out;
  }

  function onBedChange(e){
    setBedText(e.target.value);
  }

  function loadAndParse(){
    try{
      const parsed = parseBED(bedText);
      setTracks(parsed);
      const keys = Object.keys(parsed).sort((a,b)=>naturalSortChrom(a,b,parsed));
      setChroms(keys);
      setSelectedChrom(keys[0]);
      setMessage(`Parsed ${linesCount(bedText)} lines; ${keys.length} contigs`);
    }catch(err){
      setMessage(`Parse error: ${err}`);
    }
  }

  function linesCount(text){
    return text.split(/\r?\n/).filter(l=>l.trim()).length;
  }

  function handleFile(e){
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev=>{
      setBedText(ev.target.result);
    };
    reader.readAsText(f);
  }

  function fitToChrom(){
    if (!selectedChrom) return;
    const len = tracks[selectedChrom] ? tracks[selectedChrom][tracks[selectedChrom].length-1].end : 1000;
    setViewStart(0);
    setViewEnd(len);
    setZoomFactor(1);
  }

  function zoomIn(){
    const center = (viewStart+viewEnd)/2;
    const span = Math.max(10, (viewEnd-viewStart)/4);
    setViewStart(Math.max(0, Math.floor(center-span)));
    setViewEnd(Math.floor(center+span));
    setZoomFactor(z=>z*2);
  }
  function zoomOut(){
    const center = (viewStart+viewEnd)/2;
    const span = Math.max(10, (viewEnd-viewStart)*2);
    const chromLen = tracks[selectedChrom] ? tracks[selectedChrom][tracks[selectedChrom].length-1].end : 1000;
    setViewStart(Math.max(0, Math.floor(center-span)));
    setViewEnd(Math.min(chromLen, Math.floor(center+span)));
    setZoomFactor(z=>Math.max(1,z/2));
  }

  function pan(delta){
    const span = viewEnd-viewStart;
    const shift = Math.floor(span*delta);
    const chromLen = tracks[selectedChrom] ? tracks[selectedChrom][tracks[selectedChrom].length-1].end : 1000;
    let s = viewStart+shift;
    let e = viewEnd+shift;
    if (s<0){ e -= s; s=0; }
    if (e>chromLen){ s -= (e-chromLen); e = chromLen; if (s<0) s=0; }
    setViewStart(s); setViewEnd(e);
  }

  function downloadBed(){
    const content = bedText;
    const blob = new Blob([content], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'regions.bed'; a.click();
    URL.revokeObjectURL(url);
  }

  // Render display for selected chromosome
  function renderSVG(){
    const width = 1200; // px
    const height = 400;
    const padding = 60;
    const innerW = width - padding*2;
    const innerH = height - 40;
    const chromRegions = tracks[selectedChrom]||[];
    const chromLen = Math.max(tracks[selectedChrom] ? tracks[selectedChrom][tracks[selectedChrom].length-1].end : 1000, 1);
    const s = viewStart; const e = viewEnd;
    const span = Math.max(1, e - s);
    // map genomic -> x
    const g2x = g => padding + ((g - s)/span) * innerW;

    return (
      <svg ref={svgRef} width={width} height={height} className="border rounded">
        {/* Axis */}
        <line x1={padding} y1={30} x2={width-padding} y2={30} stroke="#111" strokeWidth={1} />
        {/* ticks */}
        {Array.from({length:6}).map((_,i)=>{
          const frac = i/5; const pos = padding + frac*innerW;
          const val = Math.floor(s + frac*span);
          return (
            <g key={i}>
              <line x1={pos} x2={pos} y1={26} y2={34} stroke="#333" />
              <text x={pos} y={20} fontSize={11} textAnchor="middle">{val}</text>
            </g>
          );
        })}

        {/* Regions as rectangles, stacked if overlapping */}
        {(() => {
          // simple stacking: greedily assign lanes
          const lanes = [];
          return chromRegions.filter(r=>r.end > s && r.start < e).map((r,idx)=>{
            const x1 = g2x(Math.max(r.start, s));
            const x2 = g2x(Math.min(r.end, e));
            const w = Math.max(1, x2 - x1);
            // find lane
            let lane = 0;
            while(true){
              if (!lanes[lane]) { lanes[lane]=[]; break; }
              const clash = lanes[lane].some(prev => !(prev.endX <= x1 || prev.startX >= x2));
              if (!clash) break;
              lane++;
            }
            lanes[lane].push({startX:x1,endX:x2});
            const y = 40 + lane*26;
            const color = scoreToColor(r.purity, r.index);
            return (
              <g key={idx}>
                <rect x={x1} y={y} width={w} height={20} rx={2} ry={2} fill={color} stroke="#222" />
                <title>{`Region: ${selectedChrom}:${r.start}-${r.end}\nMotif: ${r.motif}\nMotif Length: ${r.motif_length}\nPurity: ${r.purity}\nUnits: ${r.units}\nLength: ${r.length}`}</title>
                {w>20 && (
                  <text x={x1+4} y={y+14} fontSize={12} fill="#fff">{r.name!="."?r.name:`${r.start}-${r.end}`}</text>
                )}
              </g>
            );
          })
        })()}

      </svg>
    );
  }

  function scoreToColor(score, idx){
    const palette = ['#4f46e5','#06b6d4','#ef4444','#10b981','#f59e0b'];
    let color = palette[idx % palette.length];
    const r = Math.floor(255*score);
    return `${color}${r.toString(16).padStart(2,'0')}`;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="grid grid-cols-2 gap-1">
        <div>
          <img src={ribbitLogo} className="logo react" alt="Ribbit logo" style={{width: '100px', height: '100px'}} />
          <span style={{fontSize: '34px', fontWeight: 'bold', marginLeft: '4px', verticalAlign: 'middle', paddingBottom: '85px'}}>
            Ribbit - TR visualisation
          </span>
        </div>
      </div>

      <div className="grid grid-cols-8 gap-4">
        <div className="col-span-1">
          <div className="flex gap-2 mt-2" style={{marginTop: '10px', marginBottom: '10px'}}>
            <label className="block font-medium" style={{paddingRight: '5px', fontSize: '14px'}}>Upload ribbit file</label>
            <input type="file" onChange={handleFile} className="my-2" style={{padding: '5px'}} />
            <button onClick={loadAndParse} className="px-3 py-1 bg-sky-600 text-white rounded" style={{paddingLeft: '20px', paddingRight: '20px', paddingBottom: '4px', paddingTop: '4px', margin: '5px'}}>Upload</button>
          </div>
          <div className="mt-2 text-sm text-gray-600">{message}</div>

          <div className="mt-4" style={{marginTop: '10px', marginBottom: '10px'}}>
            <div style={{marginTop: '20px', marginBottom: '20px'}}>
              <label className="block" style={{paddingRight: '10px'}}>Contig</label>
              <select className="w-full p-1 border rounded" value={selectedChrom||''} onChange={e=>setSelectedChrom(e.target.value)}>
                {chroms.map(c=> <option key={c} value={c}>{c} ({(tracks[c]||[]).length} regions)</option>)}
              </select>
              <label className="block text-sm" style={{paddingRight: '10px', paddingLeft: '10px'}}>View range</label>
              <input type="number" value={viewStart} onChange={e=>setViewStart(Number(e.target.value))} className="w-16 p-1 border rounded" />
              <span style={{marginLeft: '5px', marginRight: '5px'}}>—</span>
              <input type="number" value={viewEnd} onChange={e=>setViewEnd(Number(e.target.value))} className="w-16 p-1 border rounded" />
            </div>

            <div className="mt-3">
              <label className="font-medium mb-2" style={{paddingRight: '10px'}}>Controls</label>
              <button onClick={()=>pan(-0.2)} className="px-2 py-1 mr-1 border rounded" style={{marginLeft: '10px'}}>◀</button>
              <button onClick={()=>pan(0.2)} className="px-2 py-1 mr-1 border rounded" style={{marginLeft: '10px'}}>▶</button>
              <button onClick={zoomIn} className="px-2 py-1 mr-1 border rounded" style={{marginLeft: '10px'}}>+</button>
              <button onClick={zoomOut} className="px-2 py-1 mr-1 border rounded" style={{marginLeft: '10px'}}>-</button>
              <button onClick={fitToChrom} className="px-2 py-1 mr-1 border rounded" style={{marginLeft: '10px'}}>Fit</button>

            </div>
          </div>

        </div>

        <div className="col-span-2" style={{marginTop: '20px', marginBottom: '20px'}}>
          <div className="mb-2 flex justify-between items-center">
            <div>
              <span style={{paddingRight: '5px', paddingLeft: '5px'}}>{selectedChrom||'No contig selected'}</span>
              <span style={{paddingRight: '5px', paddingLeft: '5px'}} className="text-sm text-gray-500">  {viewStart} — {viewEnd}</span>
              <span style={{paddingRight: '5px', paddingLeft: '5px'}} className="text-sm text-gray-500">Regions: {(tracks[selectedChrom]||[]).length}</span>
            </div>
          </div>

          <div className="bg-white p-2 rounded shadow">
            {selectedChrom ? renderSVG() : <div className="p-6 text-gray-500">Select a contig to view</div>}
          </div>

          <div className="mt-4 text-sm text-gray-600">
            
          </div>
        </div>
      </div>

    </div>
  );
}


// Sample BED
const DEFAULT_BED = `#chrom	start	stop	motif	purity	motif_length	repeat_length	repeat_units	info
chr1	0	290	AACCCT	0.98	6	290	48	M:7:0-249-6-1.00,97-119-11-1.00,140-156-7-1.00,172-184-5-1.00,224-240-7-1.00,241-263-7-1.00,255-290-6-1.00:AACCCT,AACCCTAACCC,CCCTAAC,AACCT,CCCTAAC,AACCCTA,AACCCT
chr1	285	333	AACCCC	0.98	6	48	8	M:1:285-326-6-1.00:AACCCC
chr1	321	468	AACCCT	0.97	6	147	24	M:7:323-339-7-1.00,330-392-6-1.00,341-364-11-1.00,383-406-7-1.00,394-468-6-0.97,397-468-6-1.00,433-449-7-1.00:CCCTAAC,AACCCT,ACCCTAACCCT,CCCTAAC,AACCCT,AACCCT,CCCTAAC
chr1	481	499	CCGG	0.83	4	18	4	M:1:485-498-4-1.00:CCCG
chr1	626	814	GGCGCGCCGCGCCGGCGCAGGCGCAGAGA	0.95	29	188	6	M:13:630-642-5-1.00,641-654-6-1.00,659-671-5-1.00,670-683-6-1.00,688-700-5-1.00,699-712-6-1.00,717-729-5-1.00,728-741-6-1.00,746-758-5-1.00,757-770-6-1.00,775-787-5-1.00,781-804-6-0.87,786-799-6-1.00:CCGCG,AGGCGC,CCGCG,AGGCGC,CCGCG,AGGCGC,CCGCG,AGGCGC,CCGCG,AGGCGC,CCGCG,AGGCGC,AGGCGC
chr1	814	1001	AGAGGCGCACCGCGCCGGCGCAGGCGCAGAGACACATGCTAGCGCGTCCAGGGGTGGAGGCGTGGCGCAGGCGCAG	0.97	76	187	2	M:7:829-842-6-1.00,847-863-5-0.94,847-859-5-1.00,858-871-6-1.00,905-918-6-1.00,934-947-6-1.00,981-994-6-1.00:AGGCGC,CCGCG,CCGCG,AGGCGC,AGGCGC,AGGCGC,AGGCGC
chr1	1225	1446	GGGCACTGCAGGGCCCTCTTGCTTACTGTATAGTGGTGGCACGCCGCCTGCTGGCAGCTAG	0.86	61	221	3	I
chr1	1533	1552	AAAT	0.85	4	19	4	I
`;

