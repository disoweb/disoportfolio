
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  structuredData?: object;
}

export default function SEOHead({
  title,
  description,
  keywords,
  canonicalUrl,
  ogImage,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  noIndex = false,
  noFollow = false,
  structuredData
}: SEOHeadProps) {
  // Fetch global SEO settings
  const { data: seoSettings } = useQuery({
    queryKey: ['/api/seo/settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/seo/settings');
      return await response.json();
    },
  });

  useEffect(() => {
    if (!seoSettings) return;

    // Update document title
    const finalTitle = title || seoSettings.defaultMetaTitle || 'DiSO Webs';
    document.title = finalTitle;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, property?: string) => {
      if (!content) return;
      
      const selector = property ? `meta[property="${property}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        if (property) {
          meta.setAttribute('property', property);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };

    // Basic meta tags
    updateMetaTag('description', description || seoSettings.defaultMetaDescription || '');
    updateMetaTag('keywords', keywords || seoSettings.defaultKeywords || '');

    // Canonical URL
    if (canonicalUrl || seoSettings.siteUrl) {
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = canonicalUrl || `${seoSettings.siteUrl}${window.location.pathname}`;
    }

    // Open Graph tags
    if (seoSettings.openGraphEnabled) {
      updateMetaTag('', finalTitle, 'og:title');
      updateMetaTag('', description || seoSettings.defaultMetaDescription || '', 'og:description');
      updateMetaTag('', ogType, 'og:type');
      updateMetaTag('', canonicalUrl || `${seoSettings.siteUrl}${window.location.pathname}`, 'og:url');
      updateMetaTag('', seoSettings.siteName || 'DiSO Webs', 'og:site_name');
      
      if (ogImage) {
        updateMetaTag('', ogImage, 'og:image');
      }
    }

    // Twitter Card tags
    updateMetaTag('twitter:card', twitterCard);
    updateMetaTag('twitter:title', finalTitle);
    updateMetaTag('twitter:description', description || seoSettings.defaultMetaDescription || '');
    if (ogImage) {
      updateMetaTag('twitter:image', ogImage);
    }

    // Robots meta tag
    if (noIndex || noFollow) {
      const robotsContent = [noIndex && 'noindex', noFollow && 'nofollow'].filter(Boolean).join(', ');
      updateMetaTag('robots', robotsContent);
    }

    // Structured data
    if (structuredData && seoSettings.structuredDataEnabled) {
      let script = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }

    // Google Analytics
    if (seoSettings.googleAnalyticsId) {
      if (!document.querySelector(`script[src*="${seoSettings.googleAnalyticsId}"]`)) {
        const gaScript = document.createElement('script');
        gaScript.async = true;
        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${seoSettings.googleAnalyticsId}`;
        document.head.appendChild(gaScript);

        const gaConfig = document.createElement('script');
        gaConfig.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${seoSettings.googleAnalyticsId}');
        `;
        document.head.appendChild(gaConfig);
      }
    }

    // Google Tag Manager
    if (seoSettings.googleTagManagerId) {
      if (!document.querySelector(`script[src*="${seoSettings.googleTagManagerId}"]`)) {
        const gtmScript = document.createElement('script');
        gtmScript.innerHTML = `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${seoSettings.googleTagManagerId}');
        `;
        document.head.appendChild(gtmScript);
      }
    }

  }, [seoSettings, title, description, keywords, canonicalUrl, ogImage, ogType, twitterCard, noIndex, noFollow, structuredData]);

  return null; // This component doesn't render anything
}
