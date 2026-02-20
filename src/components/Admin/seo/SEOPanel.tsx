"use client";

import { useState, useEffect } from "react";
import ComponentCard from "@/components/Admin/common/ComponentCard";
import { analyzeSEO, type SEOAnalysis } from "@/lib/content/seo/seo-algorithm";

interface SEOPanelProps {
  title: string;
  description: string;
  content: string;
  keywords: string[];
  onAnalysisChange?: (analysis: SEOAnalysis) => void;
}

export default function SEOPanel({
  title,
  description,
  content,
  keywords,
  onAnalysisChange,
}: SEOPanelProps) {
  const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (title || content) {
      setLoading(true);
      // Debounce analysis
      const timer = setTimeout(() => {
        const result = analyzeSEO(title, content, description, keywords);
        setAnalysis(result);
        onAnalysisChange?.(result);
        setLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [title, description, content, keywords, onAnalysisChange]);

  if (!analysis) {
    return (
      <ComponentCard title="تحلیل SEO">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          برای تحلیل SEO، عنوان و محتوا را وارد کنید.
        </p>
      </ComponentCard>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 70) return "text-blue-600 dark:text-blue-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-green-100 dark:bg-green-900/30";
    if (score >= 70) return "bg-blue-100 dark:bg-blue-900/30";
    if (score >= 50) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  return (
    <ComponentCard title="تحلیل SEO">
      {loading ? (
        <div className="text-center py-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">در حال تحلیل...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Score */}
          <div className="text-center">
            <div
              className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreBg(
                analysis.score
              )} ${getScoreColor(analysis.score)}`}
            >
              <div className="text-center">
                <div className="text-3xl font-bold">{analysis.score}</div>
                <div className="text-xs mt-1">نمره</div>
              </div>
            </div>
          </div>

          {/* Title Analysis */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">عنوان</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {analysis.title.length} کاراکتر
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div
                className={`h-2 rounded-full ${
                  analysis.title.status === "good"
                    ? "bg-green-500"
                    : "bg-yellow-500"
                }`}
                style={{
                  width: `${Math.min(100, (analysis.title.length / 60) * 100)}%`,
                }}
              />
            </div>
            {analysis.title.status !== "good" && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                {analysis.title.status === "too_short" 
                  ? `کوتاه است. حداقل ${analysis.title.recommended} کاراکتر توصیه می‌شود.`
                  : `طولانی است. حداکثر 60 کاراکتر توصیه می‌شود.`}
              </p>
            )}
          </div>

          {/* Meta Description Analysis */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Meta Description
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {analysis.metaDescription.length} کاراکتر
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div
                className={`h-2 rounded-full ${
                  analysis.metaDescription.status === "good"
                    ? "bg-green-500"
                    : "bg-yellow-500"
                }`}
                style={{
                  width: `${Math.min(100, (analysis.metaDescription.length / 160) * 100)}%`,
                }}
              />
            </div>
            {analysis.metaDescription.status !== "good" && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                {analysis.metaDescription.status === "too_short" 
                  ? `کوتاه است. حداقل ${analysis.metaDescription.recommended} کاراکتر توصیه می‌شود.`
                  : `طولانی است. حداکثر 160 کاراکتر توصیه می‌شود.`}
              </p>
            )}
          </div>

          {/* Content Length Analysis */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">طول محتوا</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {analysis.contentLength.wordCount} کلمه
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div
                className={`h-2 rounded-full ${
                  analysis.contentLength.status === "good"
                    ? "bg-green-500"
                    : analysis.contentLength.status === "too_short"
                    ? "bg-red-500"
                    : "bg-yellow-500"
                }`}
                style={{
                  width: `${Math.min(100, (analysis.contentLength.wordCount / 1000) * 100)}%`,
                }}
              />
            </div>
            {analysis.contentLength.status !== "good" && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                {analysis.contentLength.status === "too_short" 
                  ? `کوتاه است. حداقل ${analysis.contentLength.recommended} کلمه توصیه می‌شود.`
                  : `طولانی است. بهتر است به 3000 کلمه کاهش یابد.`}
              </p>
            )}
          </div>

          {/* Keyword Density */}
          {Object.keys(analysis.keywordDensity).length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Keyword Density
              </div>
              <div className="space-y-1">
                {Object.entries(analysis.keywordDensity).slice(0, 5).map(([keyword, density]) => (
                  <div key={keyword} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">{keyword}</span>
                    <span className={`font-medium ${
                      density >= 1 && density <= 3
                        ? "text-green-600 dark:text-green-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}>
                      {density.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LSI Keywords */}
          {analysis.lsiKeywords.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                کلمات مرتبط (LSI)
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.lsiKeywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Structure Analysis */}
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ساختار محتوا
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div
                className={`p-2 rounded text-xs text-center ${
                  analysis.structure.hasH1
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}
              >
                {analysis.structure.hasH1 ? `✓ H1 (${analysis.structure.h1Count})` : "✗ H1"}
              </div>
              <div
                className={`p-2 rounded text-xs text-center ${
                  analysis.structure.h2Count > 0
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}
              >
                {analysis.structure.h2Count > 0 ? `✓ H2 (${analysis.structure.h2Count})` : "✗ H2"}
              </div>
              <div
                className={`p-2 rounded text-xs text-center ${
                  analysis.structure.hasImages
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}
              >
                {analysis.structure.hasImages ? `✓ تصاویر (${analysis.structure.imageCount})` : "✗ تصاویر"}
              </div>
              <div
                className={`p-2 rounded text-xs text-center ${
                  analysis.structure.hasLists
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}
              >
                {analysis.structure.hasLists ? `✓ لیست‌ها (${analysis.structure.listCount})` : "✗ لیست‌ها"}
              </div>
              <div
                className={`p-2 rounded text-xs text-center ${
                  analysis.structure.hasInternalLinks
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}
              >
                {analysis.structure.hasInternalLinks ? `✓ لینک داخلی (${analysis.structure.internalLinkCount})` : "✗ لینک داخلی"}
              </div>
            </div>
          </div>

          {/* Suggestions */}
          {analysis.suggestions.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                پیشنهادات بهبود
              </div>
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {analysis.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                    <span>•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </ComponentCard>
  );
}

