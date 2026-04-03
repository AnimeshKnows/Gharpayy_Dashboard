export interface RoomEntry {
  label: string;
  price: number;
}

const TYPE_MAP: Record<string, string> = {
  t: 'Triple Sharing',
  triple: 'Triple Sharing',
  d: 'Dual Sharing',
  dual: 'Dual Sharing',
  double: 'Double Sharing',
  s: 'Private Room',
  single: 'Private Room',
  p: 'Private Room',
  private: 'Private Room',
  quad: 'Quad Sharing',
};

function parseFromText(text: string): RoomEntry[] {
  const entries: RoomEntry[] = [];
  const regex = /(single|dual|double|triple|private|quad)/gi;
  const matches: Array<{ type: string; index: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    matches.push({ type: match[1].toLowerCase(), index: match.index });
  }

  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;
    let chunk = text.substring(current.index, nextIndex).toLowerCase().split(/\n\s*\n/)[0];

    const stopMarkers = ['act fast:', 'prebook', 'welcome to', 'exclusive', 'note:', 'policy:'];
    for (const marker of stopMarkers) {
      const markerIdx = chunk.indexOf(marker);
      if (markerIdx > 10) {
        chunk = chunk.substring(0, markerIdx);
      }
    }

    let price: number | null = null;
    const nowMatch = chunk.match(/(now|just|only|current|priced at).*?(\d+(?:[.,]\d+)?)\s*(k|l|lakh|cr)?/i);

    if (nowMatch) {
      let val = parseFloat(nowMatch[2].replace(',', ''));
      const suffix = nowMatch[3]?.toLowerCase();
      if (suffix === 'k') val *= 1000;
      else if (suffix === 'l' || suffix === 'lakh') val *= 100000;
      else if (suffix === 'cr') val *= 10000000;
      else if (val < 100) val *= 1000;
      if (val >= 4000 && val <= 100000) price = val;
    }

    if (!price) {
      const priceRegex = /(\d+(?:[.,]\d+)?)\s*(k|l|lakh|cr)?/gi;
      const allPrices: Array<RegExpExecArray> = [];
      let priceMatch: RegExpExecArray | null;
      while ((priceMatch = priceRegex.exec(chunk)) !== null) {
        allPrices.push(priceMatch);
      }
      for (let j = allPrices.length - 1; j >= 0; j -= 1) {
        const pMatch = allPrices[j];
        let val = parseFloat(pMatch[1].replace(',', ''));
        const suffix = pMatch[2]?.toLowerCase();
        if (suffix === 'k') val *= 1000;
        else if (suffix === 'l' || suffix === 'lakh') val *= 100000;
        else if (suffix === 'cr') val *= 10000000;
        else if (val < 100) val *= 1000;
        if (val >= 4000 && val <= 100000) {
          price = val;
          break;
        }
      }
    }

    if (price) {
      const label = TYPE_MAP[current.type] || `${current.type.charAt(0).toUpperCase() + current.type.slice(1)} Sharing`;
      if (!entries.find((entry) => entry.label === label)) {
        entries.push({ label, price });
      }
    }
  }

  if (entries.length > 0) return entries;

  const shortPattern = /\b([TDSP])\s*(\d{1,3}(?:\.\d+)?)\b/gi;
  while ((match = shortPattern.exec(text)) !== null) {
    const label = TYPE_MAP[match[1].toLowerCase()];
    if (label) {
      let val = parseFloat(match[2]);
      if (val < 100) val *= 1000;
      if (!entries.find((entry) => entry.label === label)) {
        entries.push({ label, price: val });
      }
    }
  }

  return entries;
}

export function parseRoomEntries(
  priceText?: string | null,
  lowsText?: string | null,
  priceMin?: number | null,
  priceMax?: number | null
): RoomEntry[] {
  let entries = parseFromText(priceText || '');
  if (entries.length === 0 && lowsText) {
    entries = parseFromText(lowsText);
  }
  if (entries.length === 0 && priceMin) {
    if (priceMax && priceMax !== priceMin) {
      entries.push({ label: 'Starting from', price: priceMin });
    } else {
      entries.push({ label: 'Room', price: priceMin });
    }
  }

  const order: Record<string, number> = {
    'Quad Sharing': 0,
    'Triple Sharing': 1,
    'Dual Sharing': 2,
    'Double Sharing': 2,
    'Private Room': 4,
    'Starting from': 5,
    Room: 5,
  };

  entries.sort((a, b) => (order[a.label] ?? 5) - (order[b.label] ?? 5));
  return entries;
}
