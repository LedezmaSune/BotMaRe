'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 20, scale: 0.96, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -20, scale: 0.96, filter: 'blur(8px)' }}
                transition={{ 
                    duration: 0.5, 
                    ease: [0.22, 1, 0.36, 1] // Native-like smooth ease-out
                }}
                className="flex-1 flex flex-col"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
