import { Dashboard } from './components/Dashboard';
import { FIXTURE_FILES, loadOctoberReconciliation } from './fixtures/load';

const { input, result } = loadOctoberReconciliation();

export default function App() {
  return <Dashboard input={input} result={result} files={FIXTURE_FILES} />;
}
