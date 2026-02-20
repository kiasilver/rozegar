import React from "react"
const date1: React.FC = () => (
    <div className="p-2">
        <time
            dateTime="2022-10-10"
            className="flex items-center justify-between gap-4 text-xs font-bold text-gray-900 uppercase"
        >
            <span>24 فروردین</span>
            <span className="w-px h-px flex-1 bg-gray-900/10"></span>
            <span>1403</span>
        </time>
    </div>
);
export default date1;