
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface SEOData {
  title?: string;
  metaDescription?: string;
  keywords?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  openGraphData?: any;
  twitterCardData?: any;
  structuredData?: any;
}

interface SEOSettings {
  siteName: string;
  siteUrl: string;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  defaultKeywords: string;
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  facebookPixelId?: string;
  openGraphEnabled: boolean;
  twitterCardsEnabled: boolean;
  structuredDataEnabled: boolean;
}

export default function DynamicSEOHead() {
  const [location] = useLocation();
  
  // Get current path
  const currentPath = location === '/' ? '/' : location;

  // Fetch SEO settings
  const { data: seoSettings } = useQuery({
    queryKey: ['/api/seo/settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/seo/settings');
      if (!response.ok) throw new Error('Failed to fetch SEO settings');
      return await response.json() as SEOSettings;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch page-specific SEO data
  const { data: pageData } = useQuery({
    queryKey: ['/api/seo/pages', currentPath],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/seo/pages${currentPath}`);
      if (!response.ok) {
        if (response.status === 404) return null; // Page not found is okay
        throw new Error('Failed to fetch page SEO data');
      }
      return await response.json() as SEOData;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!seoSettings) return;

    // Determine SEO values (page-specific overrides global defaults)
    const title = pageData?.title || seoSettings.defaultMetaTitle;
    const description = pageData?.metaDescription || seoSettings.defaultMetaDescription;
    const keywords = pageData?.keywords || seoSettings.defaultKeywords;
    const canonicalUrl = pageData?.canonicalUrl || `${seoSettings.siteUrl}${currentPath}`;

    // Update document title
    document.title = title;

    // Clear existing meta tags
    const existingMetas = document.querySelectorAll('meta[data-dynamic-seo]');
    existingMetas.forEach(meta => meta.remove());

    // Clear existing structured data
    const existingStructuredData = document.querySelectorAll('script[data-dynamic-seo]');
    existingStructuredData.forEach(script => script.remove());

    // Create meta tags
    const metaTags = [
      { name: 'description', content: description },
      { name: 'keywords', content: keywords },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonicalUrl },
      { property: 'og:site_name', content: seoSettings.siteName },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ];

    // Add robots meta if needed
    if (pageData?.noIndex || pageData?.noFollow) {
      const robotsContent = [
        pageData.noIndex ? 'noindex' : 'index',
        pageData.noFollow ? 'nofollow' : 'follow'
      ].join(', ');
      metaTags.push({ name: 'robots', content: robotsContent });
    }

    // Add canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    // Create and append meta tags
    metaTags.forEach(({ name, property, content }) => {
      if (!content) return;
      
      const meta = document.createElement('meta');
      meta.setAttribute('data-dynamic-seo', 'true');
      
      if (name) meta.name = name;
      if (property) meta.setAttribute('property', property);
      meta.content = content;
      
      document.head.appendChild(meta);
    });

    // Add custom Open Graph data if enabled and available
    if (seoSettings.openGraphEnabled && pageData?.openGraphData) {
      Object.entries(pageData.openGraphData).forEach(([key, value]) => {
        const meta = document.createElement('meta');
        meta.setAttribute('data-dynamic-seo', 'true');
        meta.setAttribute('property', `og:${key}`);
        meta.content = String(value);
        document.head.appendChild(meta);
      });
    }

    // Add custom Twitter Card data if enabled and available
    if (seoSettings.twitterCardsEnabled && pageData?.twitterCardData) {
      Object.entries(pageData.twitterCardData).forEach(([key, value]) => {
        const meta = document.createElement('meta');
        meta.setAttribute('data-dynamic-seo', 'true');
        meta.name = `twitter:${key}`;
        meta.content = String(value);
        document.head.appendChild(meta);
      });
    }

    // Add structured data if enabled and available
    if (seoSettings.structuredDataEnabled && pageData?.structuredData) {
      const script = document.createElement('script');
      script.setAttribute('data-dynamic-seo', 'true');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(pageData.structuredData);
      document.head.appendChild(script);
    }

    // Add Google Analytics if configured
    if (seoSettings.googleAnalyticsId) {
      // Remove existing GA scripts
      const existingGA = document.querySelectorAll('script[data-ga-script]');
      existingGA.forEach(script => script.remove());

      // Add new GA scripts
      const gaScript = document.createElement('script');
      gaScript.setAttribute('data-ga-script', 'true');
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${seoSettings.googleAnalyticsId}`;
      document.head.appendChild(gaScript);

      const gaConfigScript = document.createElement('script');
      gaConfigScript.setAttribute('data-ga-script', 'true');
      gaConfigScript.textContent = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${seoSettings.googleAnalyticsId}');
      `;
      document.head.appendChild(gaConfigScript);
    }

    // Add Google Tag Manager if configured
    if (seoSettings.googleTagManagerId) {
      // Remove existing GTM scripts
      const existingGTM = document.querySelectorAll('script[data-gtm-script]');
      existingGTM.forEach(script => script.remove());

      // Add new GTM script
      const gtmScript = document.createElement('script');
      gtmScript.setAttribute('data-gtm-script', 'true');
      gtmScript.textContent = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${seoSettings.googleTagManagerId}');
      `;
      document.head.appendChild(gtmScript);
    }

    // Track page view for analytics
    if (typeof gtag !== 'undefined') {
      gtag('config', seoSettings.googleAnalyticsId, {
        page_path: currentPath,
        page_title: title,
      });
    }

  }, [seoSettings, pageData, currentPath]);

  return null; // This component doesn't render anything
}
