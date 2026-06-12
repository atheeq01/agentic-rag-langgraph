import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  minDate?: string;
  maxDate?: string;
  error?: boolean;
}

export function DatePicker({ value, onChange, label, minDate, maxDate, error }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track currently viewed month/year in the calendar popup
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());

  // Reset view date when popup opens based on selected value
  useEffect(() => {
    if (isOpen) {
      setViewDate(value ? new Date(value) : new Date());
    }
  }, [isOpen, value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format date helper
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Calendar generation logic
  const { days, emptyDaysBefore } = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    
    const days = Array.from({ length: totalDays }, (_, i) => {
      const date = new Date(year, month, i + 1);
      return {
        date,
        dateString: formatDate(date),
        dayNum: i + 1,
      };
    });
    
    return { days, emptyDaysBefore: startDayOfWeek };
  }, [viewDate]);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelect = (dateString: string) => {
    onChange(dateString);
    setIsOpen(false);
  };

  const isSelected = (dateString: string) => value === dateString;
  const isToday = (dateString: string) => dateString === formatDate(new Date());
  
  const isDisabled = (dateString: string) => {
    if (minDate && dateString < minDate) return true;
    if (maxDate && dateString > maxDate) return true;
    return false;
  };

  const displayDate = value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select date...';
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <label className="block text-xs font-semibold text-muted-foreground mb-1.5">{label}</label>}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`input w-full flex items-center justify-between text-left transition-all cursor-pointer hover:border-primary/40 ${isOpen ? 'ring-2 ring-primary/20 border-primary/50' : ''} ${error ? 'border-destructive ring-2 ring-destructive/20' : ''}`}
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{displayDate}</span>
        <CalendarIcon className={`w-4 h-4 text-muted-foreground transition-colors ${isOpen ? 'text-primary' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 w-72 mt-2 bg-card border border-border shadow-card-lg rounded-2xl overflow-hidden p-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button 
                type="button" 
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-foreground">{monthName}</span>
              <button 
                type="button" 
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div key={day} className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: emptyDaysBefore }).map((_, i) => (
                <div key={`empty-${i}`} className="w-8 h-8" />
              ))}
              
              {days.map(({ dateString, dayNum }) => {
                const disabled = isDisabled(dateString);
                const selected = isSelected(dateString);
                const today = isToday(dateString);
                
                return (
                  <button
                    key={dateString}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelect(dateString)}
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all relative mx-auto
                      ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-secondary'}
                      ${selected ? 'bg-primary text-white font-bold hover:bg-primary' : 'text-foreground font-medium'}
                    `}
                  >
                    {dayNum}
                    {/* Today indicator dot */}
                    {today && !selected && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
