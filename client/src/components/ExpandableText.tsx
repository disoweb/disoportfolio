import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

export default function ExpandableText({ 
  text, 
  maxLength = 80, 
  className = "" 
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text || text.length <= maxLength) {
    return <span className={className}>{text}</span>;
  }

  const truncatedText = text.substring(0, maxLength);
  const displayText = isExpanded ? text : `${truncatedText}...`;

  return (
    <div className={className}>
      <span className="text-xs text-gray-600 leading-relaxed">
        {displayText}
      </span>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="ml-2 inline-flex items-center text-xs text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded transition-colors"
        aria-label={isExpanded ? "Show less" : "Show more"}
      >
        {isExpanded ? (
          <>
            <span className="mr-1">Show less</span>
            <ChevronUp className="h-3 w-3" />
          </>
        ) : (
          <>
            <span className="mr-1">Show more</span>
            <ChevronDown className="h-3 w-3" />
          </>
        )}
      </button>
    </div>
  );
}