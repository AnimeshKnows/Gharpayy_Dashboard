'use client';

import { useEffect } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const QuickAddLead = () => {
  const openLeadIntakeInNewTab = () => {
    window.open('/leads/intake', '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    const handler = () => openLeadIntakeInNewTab();
    window.addEventListener('open-quick-add', handler);
    return () => window.removeEventListener('open-quick-add', handler);
  }, []);

  return (
    <motion.button
      type="button"
      aria-label="Add lead"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
      onClick={openLeadIntakeInNewTab}
    >
      <Plus size={24} strokeWidth={2.5} />
    </motion.button>
  );
};

export default QuickAddLead;
