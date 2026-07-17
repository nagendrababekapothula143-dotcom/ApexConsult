import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Check if the scrollable container is a custom element (like main layout)
    // If we have an element with overflow-y-auto we can scroll it directly,
    // otherwise scroll the window
    window.scrollTo(0, 0);
    
    // Some layouts might have custom scroll containers
    const customScrollContainers = document.querySelectorAll('.custom-scrollbar, .overflow-y-auto');
    customScrollContainers.forEach(container => {
      container.scrollTo(0, 0);
    });
  }, [pathname]);

  return null;
}
