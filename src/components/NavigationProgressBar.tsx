'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import nprogress from 'nprogress';
import 'nprogress/nprogress.css';

// Configuración de NProgress
nprogress.configure({ 
    showSpinner: false,
    trickleSpeed: 200,
    minimum: 0.08
});

export function NavigationProgressBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        nprogress.done();
        return () => {
            nprogress.start();
        };
    }, [pathname, searchParams]);

    return null;
}
