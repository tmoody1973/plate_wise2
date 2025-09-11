'use client';

import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

type ExpandableRowCardProps = {
  isOpen: boolean;
  onToggle: () => void;
  header: React.ReactNode; // always visible row header
  children: React.ReactNode; // expanded content
  className?: string;
};

/**
 * Accessible, lightweight expandable row card inspired by Aceternity's Expandable Card.
 * - Uses framer-motion for smooth height/opacity animation
 * - Keyboard accessible (Enter/Space toggles)
 */
export function ExpandableRowCard({ isOpen, onToggle, header, children, className }: ExpandableRowCardProps) {
  return (
    <div className={`border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition ${className || ''}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={isOpen}
        className="w-full text-left p-3 focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-lg"
      >
        {header}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="px-3 pb-3"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
