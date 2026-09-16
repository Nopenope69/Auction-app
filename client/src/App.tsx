import { useMemo, useEffect } from 'react';
import { Landing } from './pages/Landing';
import { AdminConsole } from './pages/AdminConsole';
import { BidderTerminal } from './pages/BidderTerminal';
import { BroadcastOverlay } from './pages/BroadcastOverlay';
import { SpectatorView } from './pages/SpectatorView';
import { DesignShowcase } from './pages/DesignShowcase';
import { getInitialTheme, applyTheme } from './lib/theme';
import type { Role } from './hooks/useAuction';

// Routing is deliberately just URL query params (?room=&token=&view=&team=)
// rather than a router library - every "page" here is really just a
// different set of permissions against the same room, and the whole point
// is that these URLs are the shareable links an organiser hands out
// (admin link for themselves, one link per team, an open link for
// spectators/broadcast). No login flow needed for anyone but the organiser.

function useQueryParams() {
  return useMemo(() => new URLSearchParams(window.location.search), []);
}

function App() {
  const params = useQueryParams();
  const roomId = params.get('room');
  const token = params.get('token');
  const teamId = params.get('team');
  const view = params.get('view') || (token ? 'admin' : 'spectator');

  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);

  if (view === 'preview' || params.get('preview') === 'true') {
    return <DesignShowcase />;
  }

  if (!roomId) {
    return <Landing />;
  }

  const role: Role = view === 'admin' ? 'admin' : view === 'bidder' ? 'team' : 'spectator';

  const commonProps = { roomId, token, role, teamId };

  return (
    <>
      {view === 'admin' && <AdminConsole {...commonProps} />}
      {view === 'bidder' && <BidderTerminal {...commonProps} />}
      {view === 'broadcast' && <BroadcastOverlay {...commonProps} />}
      {view === 'spectator' && <SpectatorView {...commonProps} />}
    </>
  );
}

export default App;

