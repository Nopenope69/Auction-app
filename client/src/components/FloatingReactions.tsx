import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
  rotation: number;
  scale: number;
}

interface FloatingReactionsProps {
  reactions: Array<{ id: string; emoji: string; timestamp: number }>;
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ reactions }) => {
  const [activeItems, setActiveItems] = useState<FloatingEmoji[]>([]);

  useEffect(() => {
    if (reactions.length > 0) {
      const newest = reactions[reactions.length - 1];
      const newItem: FloatingEmoji = {
        id: `${newest.id}-${Date.now()}-${Math.random()}`,
        emoji: newest.emoji,
        x: Math.random() * 70 + 15, // percent from left (15% to 85%)
        rotation: Math.random() * 40 - 20,
        scale: Math.random() * 0.4 + 0.9,
      };

      setActiveItems((prev) => [...prev.slice(-20), newItem]);

      // Cleanup item after animation
      setTimeout(() => {
        setActiveItems((prev) => prev.filter((item) => item.id !== newItem.id));
      }, 2500);
    }
  }, [reactions]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {activeItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: '80vh', scale: 0.2, x: `${item.x}vw`, rotate: item.rotation }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: '-20vh',
              scale: item.scale,
              x: `${item.x + (Math.random() * 10 - 5)}vw`,
              rotate: item.rotation + (Math.random() * 30 - 15),
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="absolute text-5xl filter drop-shadow-lg"
          >
            {item.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
