import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const usePageTitle = () => {
  const location = useLocation();

  useEffect(() => {
    const titles: Record<string, string> = {
      '/':      'Zealthy — Patient Portal',
      '/admin': 'Zealthy — Mini EMR',
    };
    document.title = titles[location.pathname] ?? 'Zealthy';
  }, [location.pathname]);
};
