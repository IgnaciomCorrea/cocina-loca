import { Toasts } from './components/common';
import { Home } from './screens/Home';
import { HostCooking } from './screens/host/HostCooking';
import { HostJudging } from './screens/host/HostJudging';
import { HostSetup } from './screens/host/HostSetup';
import { PlayerCooking } from './screens/player/PlayerCooking';
import { Final, Results } from './screens/Results';
import { PlayerJudgingWait, PlayerWaiting } from './screens/Waiting';
import { useGame } from './store';

function Screen() {
  const view = useGame((s) => s.view);
  const session = useGame((s) => s.session);
  if (!session || !view) {
    return session ? <Loading /> : <Home />;
  }
  const host = view.me.isHost;
  // La key fuerza un estado local nuevo en cada ronda
  const key = `${view.phase}-${view.roundNumber}`;
  switch (view.phase) {
    case 'setup':
      return host ? <HostSetup key={key} /> : <PlayerWaiting key={key} />;
    case 'cooking':
      return host ? <HostCooking key={key} /> : <PlayerCooking key={key} />;
    case 'judging':
      return host ? <HostJudging key={key} /> : <PlayerJudgingWait key={key} />;
    case 'results':
      return <Results key={key} />;
    case 'final':
      return <Final key={key} />;
  }
}

function Loading() {
  return (
    <div className="tiles flex min-h-dvh items-center justify-center text-lg font-semibold text-white">Entrando a la sala…</div>
  );
}

export function App() {
  return (
    <>
      <Screen />
      <Toasts />
    </>
  );
}
