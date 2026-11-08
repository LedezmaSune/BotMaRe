import { Router } from 'express';
import { SettingsController } from '../modules/settings/settings.controller';

export function createSettingsRouter(controller: SettingsController) {
    const router = Router();
    
    router.get('/', controller.getSettings);
    router.get('/test-llm', controller.testLLM);
    router.post('/', controller.updateSettings);
    router.delete('/clean-uploads', controller.cleanUploads);
    
    router.post('/parse-env', controller.parseEnvFile);
    router.post('/learn-url', controller.learnFromUrl);

    // Endpoints del Gestor de Secretos y 1Password
    router.get('/secrets-status', controller.getSecretsStatus);
    router.post('/secrets-migrate', controller.migrateSecrets);
    router.post('/secrets-switch', controller.switchSecretsProvider);
    
    return router;
}
