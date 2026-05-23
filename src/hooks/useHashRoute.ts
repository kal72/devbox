import { useState, useEffect } from 'react';

export type Route = 'formatter' | 'table' | 'uuid' | 'jwt' | 'sql';

export function useHashRoute(defaultRoute: Route = 'formatter'): Route {
  const getRouteFromHash = (): Route => {
    const hash = window.location.hash;
    if (hash === '#/table' || hash === '#table') {
      return 'table';
    }
    if (hash === '#/uuid' || hash === '#uuid') {
      return 'uuid';
    }
    if (hash === '#/jwt' || hash === '#jwt') {
      return 'jwt';
    }
    if (hash === '#/sql' || hash === '#sql') {
      return 'sql';
    }
    if (hash === '#/formatter' || hash === '#formatter') {
      return 'formatter';
    }
    return defaultRoute;
  };

  const [route, setRoute] = useState<Route>(getRouteFromHash);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getRouteFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // Automatically set hash if it is empty
    if (!window.location.hash) {
      window.location.hash = `#/${defaultRoute}`;
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [defaultRoute]);

  return route;
}
