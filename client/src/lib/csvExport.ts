import type { AuctionState } from '../hooks/useAuction';

// Client-side export deliberately, not a server endpoint: the admin
// console already holds the full, live-synced auction state, so building
// the CSV in the browser avoids adding another authenticated server route
// for something derivable from data the client already has. Fewer moving
// parts on the server is the whole point of the reliability wedge.

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildResultsCsv(state: AuctionState): string {
  const rows: string[][] = [['Team', 'Team Code', 'Player', 'Role', 'Base Price (L)', 'Sold Price (L)', 'Status']];

  state.teams.forEach((team) => {
    team.players.forEach((p) => {
      rows.push([team.name, team.code, p.name, p.role, String(p.basePrice), String(p.soldPrice ?? ''), 'Sold']);
    });
  });

  const unsold = state.players.filter((p) => p.status === 'unsold');
  unsold.forEach((p) => {
    rows.push(['-', '-', p.name, p.role, String(p.basePrice), '', 'Unsold']);
  });

  const stillAvailable = state.players.filter((p) => p.status === 'available');
  stillAvailable.forEach((p) => {
    rows.push(['-', '-', p.name, p.role, String(p.basePrice), '', 'Not yet auctioned']);
  });

  return rows.map((r) => r.map(csvEscape).join(',')).join('\n');
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/csv') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
