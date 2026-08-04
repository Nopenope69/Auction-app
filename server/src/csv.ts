import { Player, PlayerRole } from './types';

// Ported from the original prototype (server/src/index.ts), with row-level
// validation added so a malformed row is reported instead of silently
// corrupting the import - the PRD calls this out explicitly as a v1
// requirement ("import pipeline validates before committing").
export interface CsvParseResult {
  players: Player[];
  errors: { row: number; message: string }[];
}

const VALID_ROLES: PlayerRole[] = ['Batsman', 'Bowler', 'All-Rounder', 'Wicketkeeper'];

function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cols.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cols.push(current.trim());
  return cols.map((c) => c.replace(/^["']|["']$/g, ''));
}

export function parseCsv(csvText: string): CsvParseResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const errors: CsvParseResult['errors'] = [];
  if (lines.length <= 1) {
    return { players: [], errors: [{ row: 0, message: 'CSV has no data rows.' }] };
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const players: Player[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1; // 1-indexed, header is row 1
    const cols = splitCsvLine(lines[i]);
    const getVal = (headerName: string): string => {
      const idx = headers.indexOf(headerName.toLowerCase());
      return idx !== -1 && cols[idx] !== undefined ? cols[idx] : '';
    };

    const name = getVal('name');
    if (!name) {
      errors.push({ row: rowNum, message: 'Missing required field "name" - row skipped.' });
      continue;
    }

    const basePriceRaw = getVal('basePrice');
    const basePrice = basePriceRaw ? parseFloat(basePriceRaw) : NaN;
    if (basePriceRaw && Number.isNaN(basePrice)) {
      errors.push({ row: rowNum, message: `"${name}": basePrice "${basePriceRaw}" is not a number - defaulted to 20.` });
    }

    let role = (getVal('role') || getVal('category') || 'Batsman') as PlayerRole;
    if (!VALID_ROLES.includes(role)) {
      errors.push({ row: rowNum, message: `"${name}": role "${role}" is not one of ${VALID_ROLES.join(', ')} - defaulted to Batsman.` });
      role = 'Batsman';
    }

    players.push({
      id: getVal('id') || `p_${Math.random().toString(36).slice(2, 9)}`,
      name,
      role,
      basePrice: Number.isFinite(basePrice) ? basePrice : 20,
      photoUrl: getVal('photourl') || getVal('imageurl') || undefined,
      previousTeamCode: getVal('previousteam') || undefined,
      status: 'available',
      runs: numOrUndef(getVal('runs')),
      wickets: numOrUndef(getVal('wickets')),
      average: numOrUndef(getVal('average')),
      strikeRate: numOrUndef(getVal('strikerate')),
      economy: numOrUndef(getVal('economy')),
      matches: numOrUndef(getVal('matches')),
      cricheroesUrl: getVal('cricheroesurl') || getVal('cricheroes') || getVal('cricheroeslink') || undefined,
    });
  }

  return { players, errors };
}

function numOrUndef(v: string): number | undefined {
  if (!v) return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}
