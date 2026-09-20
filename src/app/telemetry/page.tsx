'use client';

import { TelemetryUI } from '@/components/TelemetryUI';
import { ModuleGuard } from '@/components/ModuleGuard';

export default function TelemetryPage() {
    return (
        <ModuleGuard moduleId="telemetry" moduleName="Telemetría">
            <TelemetryUI />
        </ModuleGuard>
    );
}
