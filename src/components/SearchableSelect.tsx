'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Search } from 'lucide-react';

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export default function SearchableSelect({ label, value, onChange, options, placeholder }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter(option => option.toLowerCase().includes(lower));
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearch('');
  };

  const currentDisplay = value === 'All' ? label : value;

  return (
    <div ref={containerRef} style={{ position: 'relative', minWidth: 'unset', flex: 1, width: '100%' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#fff',
          border: '1.5px solid #000',
          borderRadius: 8,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxShadow: isOpen ? '3px 3px 0 #000' : 'none',
          transition: 'all 0.1s',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: value === 'All' ? '#666' : '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentDisplay}
        </span>
        <ChevronDown size={14} style={{ color: '#000', marginLeft: 6, flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1000,
              marginTop: 6,
              background: '#fff',
              border: '2px solid #000',
              borderRadius: 10,
              boxShadow: '6px 6px 0 #000',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '8px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={14} style={{ color: '#666' }} />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={placeholder || 'Type to search...'}
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, padding: '4px 0' }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && filteredOptions.length > 0) handleSelect(filteredOptions[0]);
                }}
              />
            </div>
            <div style={{ maxHeight: 250, overflowY: 'auto', padding: '4px' }}>
              <div
                onClick={() => handleSelect('All')}
                style={{
                  padding: '8px 12px',
                  fontSize: 13,
                  cursor: 'pointer',
                  borderRadius: 6,
                  background: value === 'All' ? '#F3F4F6' : 'transparent',
                  fontWeight: value === 'All' ? 800 : 500,
                }}
              >
                All {label}
              </div>
              {filteredOptions.map(option => (
                <div
                  key={option}
                  onClick={() => handleSelect(option)}
                  style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    cursor: 'pointer',
                    borderRadius: 6,
                    background: value === option ? '#FEF3C7' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: value === option ? 800 : 500,
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = value === option ? '#FEF3C7' : '#F9FAFB')}
                  onMouseLeave={e => (e.currentTarget.style.background = value === option ? '#FEF3C7' : 'transparent')}
                >
                  {option}
                  {value === option && <Check size={14} style={{ color: '#D97706' }} />}
                </div>
              ))}
              {filteredOptions.length === 0 && <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: 12, color: '#999' }}>No matches found</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
