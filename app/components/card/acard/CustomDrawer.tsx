'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactDOM from 'react-dom';

interface CustomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

const drawerVariants = {
  hidden: {
    x: "100%",
    opacity: 0,
    transition: {
      type: "tween",
      duration: 0.3,
      ease: [0.4, 0, 0.6, 1]
    }
  },
  visible: {
    x: "0%",
    opacity: 1,
    transition: {
      type: "tween",
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  },
} as const;


export const CustomDrawer: React.FC<CustomDrawerProps> = ({ isOpen, onClose, children, className }) => {
  const [width, setWidth] = useState(440);
  const isResizing = useRef(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 440 && newWidth <= 740) {
      setWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = '';
  }, [handleMouseMove]);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);


  const [isClient, setIsClient] = React.useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="acard-drawer-wrapper">
          <div className="acard-drawer-backdrop" />
          {/* --- ✨ 核心修改在这里 ✨ --- */}
          <motion.div
            className={`acard-drawer-base ${className || ''}`}
            style={{ width: `${width}px` }}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={drawerVariants}
            // 使用 onClick 捕获所有底层的点击事件，并阻止它们冒泡
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="drawer-resize-handle"
              onMouseDown={handleMouseDown}
            />
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};