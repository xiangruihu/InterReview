interface ShareData {
  duration: string;
  rounds: number;
  score: number;
  passRate: number;
  qaList: Array<{ question: string; category?: string; score?: number }>;
  suggestions: Array<{ title: string; priority?: string }>;
}

const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  const scale = window.devicePixelRatio || 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.scale(scale, scale);
  return { canvas, ctx };
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number => {
  const words = text?.split(/\s+/) ?? [];
  let line = '';
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
};

const formatDurationLabel = (value: string | number | undefined): string => {
  if (value == null) return '—';
  if (typeof value === 'number') {
    const hours = Math.floor(value / 3600);
    const minutes = Math.round((value % 3600) / 60);
    if (hours > 0 || minutes > 0) {
      const hourLabel = hours > 0 ? `${hours}h` : '';
      const minuteLabel = minutes > 0 ? `${minutes}min` : '';
      return `${hourLabel}${hourLabel && minuteLabel ? ' ' : ''}${minuteLabel}` || `${hours}h`;
    }
    return `${value}min`;
  }

  const text = String(value);
  const hourMatch = text.match(/(\d+)\s*小时?/);
  const minuteMatch = text.match(/(\d+)\s*分/);
  const secondMatch = text.match(/(\d+)\s*秒/);

  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  let minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;

  if (!minuteMatch && secondMatch) {
    minutes = Math.ceil(parseInt(secondMatch[1], 10) / 60);
  }

  if (hours || minutes) {
    const hourLabel = hours ? `${hours}h` : '';
    const minuteLabel = minutes ? `${minutes}min` : '';
    return `${hourLabel}${hourLabel && minuteLabel ? ' ' : ''}${minuteLabel}`.trim();
  }

  return text;
};

export async function generateShareImage(data: ShareData): Promise<string> {
  const width = 1080;
  const qaList = data.qaList || [];
  const suggestionList = data.suggestions || [];
  const qaCount = qaList.length;
  const suggestionCount = suggestionList.length;
  const estimatedHeight = (() => {
    const qaBlocks = Math.max(qaCount, 1);
    const suggestionBlocks = Math.max(suggestionCount, 1);
    let currentY = 360; // baseline after顶部信息
    currentY += 36; // QA 标题
    currentY += qaBlocks * 144; // 每个 QA 区块包含顶部间距
    currentY += 20; // QA 区块与建议区块之间的缓冲
    currentY += 36; // 建议标题
    currentY += suggestionBlocks * 90; // 每条建议的高度
    currentY += 140; // 底部标语与额外留白
    return currentY;
  })();
  const height = Math.max(estimatedHeight, 980);

  const { canvas, ctx } = createCanvas(width, height);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#eef2ff');
  gradient.addColorStop(1, '#e0e7ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const headingFont = '600 42px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const textFont = '400 26px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const smallFont = '400 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  ctx.fillStyle = '#0f172a';
  ctx.font = headingFont;
  ctx.fillText('面试复盘笔记', 64, 96);

  ctx.font = smallFont;
  ctx.fillStyle = '#475569';
  ctx.fillText('InterReview · AI 面试复盘助手', 64, 140);

  const statTitles = ['面试时长', '问答轮次', '综合评分', '通过概率'];
  const statValues = [
    formatDurationLabel(data.duration),
    `${qaCount}`,
    `${data.score || 0}`,
    `${data.passRate || 0}%`,
  ];
  const statColors = ['#2563eb', '#2563eb', '#2563eb', '#16a34a'];

  const cardWidth = (width - 64 * 2 - 24 * 3) / 4;
  const cardHeight = 120;
  statTitles.forEach((title, index) => {
    const x = 64 + index * (cardWidth + 24);
    const y = 180;
    drawRoundedRect(ctx, x, y, cardWidth, cardHeight, 18, 'rgba(255,255,255,0.95)');

    ctx.font = '500 52px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = statColors[index];
    ctx.fillText(statValues[index], x + 24, y + 70);

    ctx.font = smallFont;
    ctx.fillStyle = '#475569';
    ctx.fillText(title, x + 24, y + 100);
  });

  let currentY = 360;
  const sectionWidth = width - 64 * 2;

  ctx.font = '600 30px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(`🔥 精选问答（共 ${qaCount} 个）`, 64, currentY);
  currentY += 36;

  ctx.font = textFont;
  ctx.fillStyle = '#0f172a';

  qaList.forEach((qa, idx) => {
    const blockY = currentY + 24;
    drawRoundedRect(ctx, 64, blockY, sectionWidth, 102, 18, 'rgba(255,255,255,0.95)');

    ctx.save();
    ctx.font = '600 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#1d4ed8';
    ctx.fillText(`#${idx + 1}`, 84, blockY + 36);

    ctx.font = textFont;
    ctx.fillStyle = '#0f172a';
    const questionY = wrapText(ctx, qa.question || '（未提供问题）', 150, blockY + 36, sectionWidth - 160, 30);

    ctx.font = smallFont;
    ctx.fillStyle = '#475569';
    const meta = [
      qa.category ? `分类: ${qa.category}` : null,
      typeof qa.score === 'number' ? `得分: ${qa.score}` : null,
    ]
      .filter(Boolean)
      .join(' | ');
    ctx.fillText(meta || ' ', 150, questionY + 4);

    ctx.restore();

    currentY = blockY + 120;
  });

  currentY += 20;
  ctx.font = '600 30px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('💡 核心改进建议', 64, currentY);
  currentY += 36;

  suggestionList.forEach((suggestion) => {
    drawRoundedRect(ctx, 64, currentY, sectionWidth, 70, 18, 'rgba(255,255,255,0.95)');
    ctx.font = textFont;
    ctx.fillStyle = '#0f172a';
    ctx.fillText(suggestion.title || '未命名建议', 84, currentY + 42);
    ctx.font = smallFont;
    ctx.fillStyle = '#475569';
    ctx.fillText(`优先级：${suggestion.priority || '中'}`, width - 64 - 200, currentY + 42);
    currentY += 90;
  });

  ctx.font = smallFont;
  ctx.fillStyle = '#475569';
  ctx.fillText('InterReview · 分享你的面试成长', 64, currentY + 20);

  return canvas.toDataURL('image/png');
}
