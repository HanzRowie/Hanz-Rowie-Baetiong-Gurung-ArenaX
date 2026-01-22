import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = "Select time",
  required = false,
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(value ? parseInt(value.split(':')[0]) : 9);
  const [minutes, setMinutes] = useState(value ? parseInt(value.split(':')[1]) : 0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      setHours(h);
      setMinutes(m);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (h: number, m: number) => {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleTimeChange = (newHours: number, newMinutes: number) => {
    const formattedTime = formatTime(newHours, newMinutes);
    onChange(formattedTime);
  };

  const adjustHours = (increment: boolean) => {
    const newHours = increment 
      ? (hours + 1) % 24 
      : (hours - 1 + 24) % 24;
    setHours(newHours);
    handleTimeChange(newHours, minutes);
  };

  const adjustMinutes = (increment: boolean) => {
    const newMinutes = increment 
      ? (minutes + 15) % 60 
      : (minutes - 15 + 60) % 60;
    setMinutes(newMinutes);
    handleTimeChange(hours, newMinutes);
  };

  const selectPresetTime = (h: number, m: number) => {
    setHours(h);
    setMinutes(m);
    handleTimeChange(h, m);
    setIsOpen(false);
  };

  const presetTimes = [
    { label: '9:00 AM', hours: 9, minutes: 0 },
    { label: '10:00 AM', hours: 10, minutes: 0 },
    { label: '11:00 AM', hours: 11, minutes: 0 },
    { label: '12:00 PM', hours: 12, minutes: 0 },
    { label: '1:00 PM', hours: 13, minutes: 0 },
    { label: '2:00 PM', hours: 14, minutes: 0 },
    { label: '3:00 PM', hours: 15, minutes: 0 },
    { label: '4:00 PM', hours: 16, minutes: 0 },
    { label: '5:00 PM', hours: 17, minutes: 0 },
    { label: '6:00 PM', hours: 18, minutes: 0 },
  ];

  const displayValue = value ? formatTime(hours, minutes) : '';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all cursor-pointer flex items-center justify-between ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-gray-400" />
          <span className={displayValue ? 'text-gray-900' : 'text-gray-500'}>
            {displayValue || placeholder}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {/* Custom Time Selector */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-center space-x-4">
              {/* Hours */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => adjustHours(true)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <div className="px-3 py-1 bg-gray-100 rounded text-lg font-mono min-w-[3rem] text-center">
                  {hours.toString().padStart(2, '0')}
                </div>
                <button
                  type="button"
                  onClick={() => adjustHours(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              <div className="text-xl font-bold">:</div>

              {/* Minutes */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => adjustMinutes(true)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <div className="px-3 py-1 bg-gray-100 rounded text-lg font-mono min-w-[3rem] text-center">
                  {minutes.toString().padStart(2, '0')}
                </div>
                <button
                  type="button"
                  onClick={() => adjustMinutes(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Preset Times */}
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 px-2 py-1">Quick Select</div>
            <div className="grid grid-cols-2 gap-1">
              {presetTimes.map((preset) => (
                <button
                  key={`${preset.hours}-${preset.minutes}`}
                  type="button"
                  onClick={() => selectPresetTime(preset.hours, preset.minutes)}
                  className={`px-3 py-2 text-sm rounded hover:bg-purple-50 hover:text-purple-700 transition-colors ${
                    hours === preset.hours && minutes === preset.minutes
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker;