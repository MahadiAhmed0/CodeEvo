'use client'

const DOWNLOAD_RE = /^(Downloading|Downloaded) from central:\s+\S+\/([\w.-]+\.\w+)/;
const PROGRESS_RE = /^Progress\s*\(\d+\):\s*([\d.]+)\/([\d.]+)\s*(\w+)/;

export function LogLine({ line }: { line: string }) {
  const downloadMatch = line.match(DOWNLOAD_RE);
  if (downloadMatch) {
    const action = downloadMatch[1];
    const artifact = downloadMatch[2];
    if (action === 'Downloading') {
      return (
        <div className="flex items-start gap-2 text-gray-500">
          <span className="text-blue-400/50 text-[10px]">↓</span>
          <span className="truncate max-w-[80%]">{artifact}</span>
        </div>
      );
    }
    const sizeMatch = line.match(/\(([\d.]+)\s*(\w+)/);
    const size = sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2]}` : '';
    return (
      <div className="flex items-start gap-2 text-emerald-400/70 text-[11px]">
        <span className="text-emerald-400">✓</span>
        <span className="truncate max-w-[60%]">{artifact}</span>
        {size && <span className="text-gray-600">{size}</span>}
      </div>
    );
  }

  const progressMatch = line.match(PROGRESS_RE);
  if (progressMatch) {
    const current = parseFloat(progressMatch[1]);
    const total = parseFloat(progressMatch[2]);
    const pct = Math.min(Math.round((current / total) * 100), 100);
    const barW = 20;
    const filled = Math.round((pct / 100) * barW);
    const bar = '█'.repeat(filled) + '░'.repeat(barW - filled);
    return (
      <div className="flex items-start gap-2 text-[11px] text-gray-500">
        <span className="font-mono text-[10px] text-blue-400/40">[{bar}]</span>
        <span>{pct}%</span>
      </div>
    );
  }

  const isError = /ERROR|Exception|failed/i.test(line);
  const isWarn = /WARN/i.test(line);
  const isSystem = /\[SYSTEM\]|SUCCESS/i.test(line);

  return (
    <div className={`flex items-start gap-2 ${
      isError ? 'text-red-400' : isWarn ? 'text-orange-400' : isSystem ? 'text-emerald-400' : 'text-gray-400'
    }`}>
      <span>{line}</span>
    </div>
  );
}
