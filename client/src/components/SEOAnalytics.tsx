
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface SEOAnalyticsProps {
  page: string;
}

export default function SEOAnalytics({ page }: SEOAnalyticsProps) {
  const { data: seoSettings } = useQuery({
    queryKey: ['/api/seo/settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/seo/settings');
      return await response.json();
    },
  });

  useEffect(() => {
    if (!seoSettings) return;

    // Track page view
    const trackPageView = async () => {
      try {
        // Only track in production or when analytics is enabled
        if (process.env.NODE_ENV === 'production' && seoSettings.googleAnalyticsId) {
          // Track with Google Analytics
          if (typeof gtag !== 'undefined') {
            gtag('config', seoSettings.googleAnalyticsId, {
              page_title: document.title,
              page_location: window.location.href,
              page_path: window.location.pathname
            });
          }
        }

        // Track internal analytics
        const today = new Date().toISOString().split('T')[0];
        await apiRequest('POST', '/api/seo/analytics', {
          page: page,
          date: today,
          views: 1,
          referrer: document.referrer || 'direct',
          userAgent: navigator.userAgent
        });
      } catch (error) {
        console.debug('Analytics tracking error:', error);
      }
    };

    // Track page view after a short delay
    const timer = setTimeout(trackPageView, 1000);
    return () => clearTimeout(timer);
  }, [page, seoSettings]);

  useEffect(() => {
    // Track scroll depth for engagement metrics
    let maxScroll = 0;

    const trackScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        
        // Track milestone scroll depths
        if ([25, 50, 75, 90].includes(scrollPercent)) {
          if (typeof gtag !== 'undefined') {
            gtag('event', 'scroll', {
              event_category: 'engagement',
              event_label: `${scrollPercent}%`,
              value: scrollPercent
            });
          }
        }
      }
    };

    window.addEventListener('scroll', trackScroll, { passive: true });
    return () => window.removeEventListener('scroll', trackScroll);
  }, []);

  return null; // This component doesn't render anything
}
