import { useState } from 'react';

export default function Calendar({
    selectedDate = null,
    onSelectDate = null,
    events = [], // Array of { date: 'YYYY-MM-DD', title: 'Pertandingan Final', type: 'primary' | 'gold' }
    className = '',
}) {
    const [currentDate, setCurrentDate] = useState(() => (selectedDate ? new Date(selectedDate) : new Date()));

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    // First day of current month & total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const todayStr = new Date().toISOString().split('T')[0];

    // Helper to format YYYY-MM-DD
    const formatDate = (y, m, d) => {
        const mm = String(m + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
    };

    // Build calendar matrix
    const calendarDays = [];

    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
        const dayNum = daysInPrevMonth - i;
        calendarDays.push({
            day: dayNum,
            dateStr: formatDate(year, month - 1, dayNum),
            isCurrentMonth: false,
        });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        calendarDays.push({
            day: d,
            dateStr: formatDate(year, month, d),
            isCurrentMonth: true,
        });
    }

    // Next month padding to fill complete grid (up to 35 or 42)
    const remaining = 42 - calendarDays.length;
    for (let d = 1; d <= remaining; d++) {
        calendarDays.push({
            day: d,
            dateStr: formatDate(year, month + 1, d),
            isCurrentMonth: false,
        });
    }

    return (
        <div className={`p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs ${className}`}>
            {/* Header / Month Navigation */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {monthNames[month]} {year}
                    </h4>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={handleToday}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                    >
                        Hari ini
                    </button>
                    <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Weekday Names */}
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2">
                {dayNames.map((d, idx) => (
                    <div key={idx} className="py-1">
                        {d}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cDay, idx) => {
                    const isToday = cDay.dateStr === todayStr;
                    const isSelected = selectedDate && cDay.dateStr === selectedDate;
                    const dayEvents = events.filter((e) => e.date === cDay.dateStr);

                    return (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => onSelectDate && onSelectDate(cDay.dateStr)}
                            className={`min-h-[44px] p-1.5 rounded-xl flex flex-col items-center justify-between transition-all ${
                                isSelected
                                    ? 'bg-[#c0392b] text-white shadow-xs font-bold'
                                    : isToday
                                    ? 'border border-[#c0392b] text-[#c0392b] dark:text-[#f0c060] font-bold'
                                    : cDay.isCurrentMonth
                                    ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                                    : 'text-slate-300 dark:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                        >
                            <span className="text-xs">{cDay.day}</span>

                            {/* Event Indicators */}
                            {dayEvents.length > 0 && (
                                <div className="flex items-center gap-0.5 mt-0.5">
                                    {dayEvents.slice(0, 3).map((_, eIdx) => (
                                        <span
                                            key={eIdx}
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                isSelected ? 'bg-white' : 'bg-[#c0392b] dark:bg-[#f0c060]'
                                            }`}
                                        />
                                    ))}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
