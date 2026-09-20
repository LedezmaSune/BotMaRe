'use client';

import OllamaSetupUI from '@/components/OllamaSetupUI';
import { ModuleGuard } from '@/components/ModuleGuard';

export default function OllamaPage() {
    return (
        <ModuleGuard moduleId="ollama" moduleName="IA Local (Ollama)">
            <OllamaSetupUI />
        </ModuleGuard>
    );
}
