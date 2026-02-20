"use client";
import React from "react";
import { GroupIcon, BoxIconLine } from "@/icons/Admin";

interface NewsMetricsProps {
    totalViews: number;
    totalArticles: number;
    pendingReviews: number;
}

export const NewsMetrics = ({ totalViews, totalArticles, pendingReviews }: NewsMetricsProps) => {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
            {/* Total Views */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl dark:bg-blue-900/50">
                    <GroupIcon className="text-blue-500 size-6" />
                </div>
                <div className="mt-5">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Views</span>
                    <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                        {totalViews.toLocaleString()}
                    </h4>
                </div>
            </div>

            {/* Total Articles */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-xl dark:bg-green-900/50">
                    <BoxIconLine className="text-green-500 size-6" />
                </div>
                <div className="mt-5">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Published Articles</span>
                    <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                        {totalArticles.toLocaleString()}
                    </h4>
                </div>
            </div>

            {/* Pending Reviews */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-orange-50 rounded-xl dark:bg-orange-900/50">
                    <BoxIconLine className="text-orange-500 size-6" />
                </div>
                <div className="mt-5">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Pending Reviews</span>
                    <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                        {pendingReviews.toLocaleString()}
                    </h4>
                </div>
            </div>
        </div>
    );
};
