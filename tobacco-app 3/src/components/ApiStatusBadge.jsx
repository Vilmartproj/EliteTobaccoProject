import { useEffect, useState } from 'react';
import { api } from '../api';
import { S } from '../styles';

export default function ApiStatusBadge() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        await api.getStats();
        if (mounted) setOnline(true);
      } catch {
        if (mounted) setOnline(false);
      }
    };

    check();
    const timer = setInterval(check, 15000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <span style={S.badge(online ? 'green' : 'red')} title={online ? 'Backend API connected' : 'Backend API not reachable'}>
      {online ? 'API Online' : 'API Offline'}
    </span>
  );
}
