import { useState, useEffect } from 'react';
import { getTimelineSnapshots, getAllSnapshots, Snapshot } from '../services/api';
import './TimelineMonitor.css';

interface TimelineMonitorProps {
  sessionId?: string;
}

export default function TimelineMonitor({ sessionId }: TimelineMonitorProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTimeline();
    const interval = setInterval(loadTimeline, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const loadTimeline = async () => {
    try {
      const data = sessionId ? await getTimelineSnapshots(sessionId) : await getAllSnapshots();
      setSnapshots(data);
      setError(null);
    } catch (err: any) {
      // Silently handle connection errors during backend restart
      if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
        console.log('Backend temporarily unavailable, retrying...');
      } else {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getTimePosition = (timestamp: string): number => {
    if (snapshots.length === 0) return 0;
    if (snapshots.length === 1) return 50;

    const times = snapshots.map(s => new Date(s.created_at).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const range = maxTime - minTime;

    if (range === 0) return 50;

    const currentTime = new Date(timestamp).getTime();
    return ((currentTime - minTime) / range) * 100;
  };

  if (loading && snapshots.length === 0) {
    return <div className="timeline-monitor loading">Loading...</div>;
  }

  if (error && snapshots.length === 0) {
    return <div className="timeline-monitor error">Error: {error}</div>;
  }

  const selected = selectedIndex !== null ? snapshots[selectedIndex] : null;

  const getScreenshotFilename = (path: string): string => {
    return path.split('/').pop() || path;
  };

  return (
    <div className="timeline-monitor">
      <div className="timeline-graph">
        <div className="timeline-track">
          <div className="timeline-line"></div>
          <div className="timeline-events">
            {snapshots.map((snapshot, index) => {
              const xPercent = getTimePosition(snapshot.created_at);
              const isEven = index % 2 === 0;
              return (
                <button
                  key={index}
                  className={`timeline-point ${selectedIndex === index ? 'active' : ''}`}
                  style={{ left: `${xPercent}%`, top: isEven ? '10px' : '60px' }}
                  onClick={() => setSelectedIndex(index)}
                  title={snapshot.caption}
                >
                  <span className="point-dot"></span>
                  <span className="point-time">{formatTime(snapshot.created_at)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selected ? (
        <div className="timeline-detail">
          <div className="detail-screenshot">
            <img src={`/api/monitor/screenshot/${getScreenshotFilename(selected.screenshot_path)}`} alt="Screenshot" />
          </div>
          <div className="detail-info">
            <h3>{selected.caption}</h3>
            {selected.full_description && (
              <div className="detail-description">
                <strong>Description:</strong>
                <p>{selected.full_description}</p>
              </div>
            )}
            {selected.facts && selected.facts.length > 0 && (
              <div className="detail-facts">
                <strong>Facts:</strong>
                <ul>
                  {selected.facts.map((fact, i) => (
                    <li key={i}>{fact}</li>
                  ))}
                </ul>
              </div>
            )}
            {selected.changes && selected.changes.length > 0 && (
              <div className="detail-changes">
                <strong>Changes:</strong>
                <ul>
                  {selected.changes.map((change, i) => (
                    <li key={i}>{change}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="detail-timestamp">{new Date(selected.created_at).toLocaleString()}</div>
          </div>
        </div>
      ) : (
        <div className="timeline-empty">
          <p>Select a point on the timeline to view details</p>
        </div>
      )}
    </div>
  );
}
