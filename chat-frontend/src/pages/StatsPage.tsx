
import TimelineMonitor from '../components/TimelineMonitor';
import '../styles/StatsPage.css';

export default function StatsPage() {
  return (
    <div className="stats-page">
      <header className="stats-header">
        <h1>Timeline Monitor</h1>
        <a href="/" className="back-link">← Back to Chat</a>
      </header>
      <TimelineMonitor />
    </div>
  );
}
