'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaExclamationTriangle, FaCheckCircle, FaClock, FaTimesCircle, FaTimes } from 'react-icons/fa';

interface CarPriceStatus {
    is_active: boolean;
    last_run: string | null;
    next_run: string | null;
    has_error: boolean;
    error_message: string | null;
    recent_errors: Array<{
        id: number;
        error: string;
        created_at: string;
    }>;
}

interface CarPriceStatusIconProps {
    onErrorClick?: () => void;
}

export default function CarPriceStatusIcon({ onErrorClick }: CarPriceStatusIconProps) {
    const [status, setStatus] = useState<CarPriceStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [showTooltip, setShowTooltip] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/v1/admin/car-prices/status');
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
            }
        } catch (error) {
            console.error('Error fetching car price status:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !status) {
        return null;
    }

    if (!status.is_active) {
        return null; // Don't show if inactive
    }

    const formatTime = (dateString: string | null) => {
        if (!dateString) return 'نامشخص';
        const date = new Date(dateString);
        return date.toLocaleString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit'
        });
    };

    const getTimeUntilNext = (nextRun: string | null) => {
        if (!nextRun) return null;
        const now = new Date();
        const next = new Date(nextRun);
        const diff = next.getTime() - now.getTime();

        if (diff <= 0) return 'همین الان';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours} ساعت و ${minutes} دقیقه دیگر`;
        }
        return `${minutes} دقیقه دیگر`;
    };

    const timeUntilNext = getTimeUntilNext(status.next_run);

    return (
        <div className="relative">
            <Link
                href="/admin/tools/car-prices/logs"
                className="relative flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors z-10"
                title="وضعیت قیمت خودرو"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                {/* Modern Car Icon SVG with Animation */}
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`${status.has_error ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'} transition-all duration-300 ${status.has_error ? 'animate-pulse' : 'hover:scale-110'}`}
                >
                    <defs>
                        {/* Glow effect for active state */}
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        {/* Animation for wheels */}
                        <style>{`
                            @keyframes wheelRotate {
                                from { transform: rotate(0deg); }
                                to { transform: rotate(360deg); }
                            }
                            @keyframes carMove {
                                0%, 100% { transform: translateX(0); }
                                50% { transform: translateX(1px); }
                            }
                            @keyframes glowPulse {
                                0%, 100% { opacity: 0.8; filter: brightness(1); }
                                50% { opacity: 1; filter: brightness(1.2); }
                            }
                            .car-body {
                                animation: ${status.has_error ? 'none' : 'carMove 3s ease-in-out infinite'};
                            }
                            .wheel {
                                animation: ${status.has_error ? 'none' : 'wheelRotate 2s linear infinite'};
                                transform-origin: center;
                            }
                            .car-glow {
                                animation: ${status.has_error ? 'none' : 'glowPulse 2s ease-in-out infinite'};
                            }
                        `}</style>
                    </defs>

                    {/* Car Body - Modern Design */}
                    <g className="car-body">
                        {/* Main body */}
                        <path
                            d="M4 12C4 10.3431 5.34315 9 7 9H17C18.6569 9 20 10.3431 20 12V16C20 16.5523 19.5523 17 19 17H18C17.4477 17 17 16.5523 17 16V15H7V16C7 16.5523 6.55228 17 6 17H5C4.44772 17 4 16.5523 4 16V12Z"
                            fill="currentColor"
                            className={`car-glow ${status.has_error ? 'opacity-80' : 'opacity-95'}`}
                            filter={status.has_error ? 'none' : 'url(#glow)'}
                        />

                        {/* Windshield */}
                        <path
                            d="M8 10H10V13H8V10Z"
                            fill="white"
                            className="opacity-70"
                        />
                        <path
                            d="M14 10H16V13H14V10Z"
                            fill="white"
                            className="opacity-70"
                        />

                        {/* Car grill */}
                        <rect
                            x="18"
                            y="11"
                            width="2"
                            height="2"
                            rx="0.5"
                            fill="currentColor"
                            className="opacity-50"
                        />
                        <rect
                            x="4"
                            y="11"
                            width="2"
                            height="2"
                            rx="0.5"
                            fill="currentColor"
                            className="opacity-50"
                        />
                    </g>

                    {/* Wheels with rotation animation */}
                    <g className="wheel">
                        <circle
                            cx="7.5"
                            cy="16.5"
                            r="2"
                            fill="currentColor"
                            className="opacity-70"
                        />
                        <circle
                            cx="7.5"
                            cy="16.5"
                            r="1"
                            fill="white"
                            className="opacity-40"
                        />
                    </g>
                    <g className="wheel">
                        <circle
                            cx="16.5"
                            cy="16.5"
                            r="2"
                            fill="currentColor"
                            className="opacity-70"
                        />
                        <circle
                            cx="16.5"
                            cy="16.5"
                            r="1"
                            fill="white"
                            className="opacity-40"
                        />
                    </g>

                    {/* Speed lines (optional decorative element) */}
                    {!status.has_error && (
                        <g className="opacity-30">
                            <line
                                x1="2"
                                y1="12"
                                x2="4"
                                y2="12"
                                stroke="currentColor"
                                strokeWidth="1"
                                strokeLinecap="round"
                            />
                            <line
                                x1="20"
                                y1="12"
                                x2="22"
                                y2="12"
                                stroke="currentColor"
                                strokeWidth="1"
                                strokeLinecap="round"
                            />
                        </g>
                    )}
                </svg>

                {/* Error Badge */}
                {status.has_error && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">
                        !
                    </span>
                )}
            </Link>

            {/* Tooltip */}
            {showTooltip && (
                <>
                    {/* Desktop: Show on left side */}
                    <div className="hidden md:block absolute right-full top-1/2 -translate-y-1/2 translate-y-2 mr-2 w-80 max-w-[90vw] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-[9999] text-right">
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                                {status.has_error ? (
                                    <FaExclamationTriangle className="text-red-500 shrink-0" />
                                ) : (
                                    <FaCheckCircle className="text-green-500 shrink-0" />
                                )}
                                <span className="whitespace-nowrap">وضعیت قیمت خودرو</span>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                                    <FaClock className="text-gray-400 shrink-0 mt-0.5" size={12} />
                                    <span className="text-xs leading-relaxed">
                                        آخرین آپدیت: {formatTime(status.last_run)}
                                    </span>
                                </div>

                                {timeUntilNext && (
                                    <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                                        <FaClock className="text-blue-400 shrink-0 mt-0.5" size={12} />
                                        <span className="text-xs leading-relaxed">
                                            ارسال بعدی: {timeUntilNext}
                                        </span>
                                    </div>
                                )}

                                {status.has_error && (
                                    <div className="flex items-start gap-2 text-red-600 dark:text-red-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                        <FaExclamationTriangle className="shrink-0 mt-0.5" size={12} />
                                        <span className="text-xs leading-relaxed">
                                            خطا در آخرین اجرا
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mobile: Show below */}
                    <div className="md:hidden absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-[9999] text-right">
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                                {status.has_error ? (
                                    <FaExclamationTriangle className="text-red-500" />
                                ) : (
                                    <FaCheckCircle className="text-green-500" />
                                )}
                                <span>وضعیت قیمت خودرو</span>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <FaClock className="text-gray-400 shrink-0" size={12} />
                                    <span className="text-xs break-words">
                                        آخرین آپدیت: {formatTime(status.last_run)}
                                    </span>
                                </div>

                                {timeUntilNext && (
                                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                        <FaClock className="text-blue-400 shrink-0" size={12} />
                                        <span className="text-xs break-words">
                                            ارسال بعدی: {timeUntilNext}
                                        </span>
                                    </div>
                                )}

                                {status.has_error && (
                                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                        <FaExclamationTriangle className="shrink-0" size={12} />
                                        <span className="text-xs break-words">
                                            خطا در آخرین اجرا
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

