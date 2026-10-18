import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Router } from '../../src/core/router';
import { accessControl } from '../../src/core/accessControl';
import { invalidateConfigCache, setConfig } from '../../src/core/config';

vi.mock('../../src/telegram/notification.service', () => ({
    NotificationService: {
        notifyNewMessage: vi.fn(),
        notifyError: vi.fn(),
        notifyAdmin: vi.fn()
    }
}));

vi.mock('../../src/core/crm.service', () => ({
    crmService: {
        autoTrackContact: vi.fn(),
        getContact: vi.fn()
    }
}));

vi.mock('../../src/core/db', () => ({
    getSettings: vi.fn().mockResolvedValue({ bot_name: 'BotMaRe' }),
    isChatPaused: vi.fn().mockResolvedValue(false)
}));

describe('Router.handleWhatsAppMessage Unit Tests', () => {
    let mockMessageController: any;
    let mockSocket: any;
    let router: Router;
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.ENABLE_GROUPS;
        delete process.env.WHATSAPP_OWNER_NUMBER;
        invalidateConfigCache();

        mockMessageController = {
            handleIncoming: vi.fn().mockResolvedValue(true)
        };

        mockSocket = {
            sendMessage: vi.fn().mockResolvedValue({ key: { id: 'sent-1' } }),
            updateMediaMessage: vi.fn()
        };

        router = new Router(mockMessageController);
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        invalidateConfigCache();
    });

    describe('1. Deduplicación por msgId', () => {
        it('debe procesar el primer mensaje e ignorar silenciosamente el duplicado', async () => {
            const uniqueId = `dup-test-${Date.now()}-${Math.random()}`;
            const messageData = {
                type: 'notify',
                messages: [
                    {
                        key: {
                            id: uniqueId,
                            remoteJid: '5219991234567@s.whatsapp.net',
                            fromMe: false
                        },
                        message: {
                            conversation: 'Hola bot'
                        },
                        pushName: 'Usuario Test'
                    }
                ]
            };

            vi.spyOn(accessControl, 'canReplyTo').mockReturnValue(true);

            // Primer envío
            await router.handleWhatsAppMessage(messageData as any, mockSocket);
            // Segundo envío idéntico
            await router.handleWhatsAppMessage(messageData as any, mockSocket);

            // canReplyTo solo se evalúa en el primer mensaje porque el segundo se detiene en la deduplicación
            expect(accessControl.canReplyTo).toHaveBeenCalledTimes(1);
        });
    });

    describe('2. Exclusión de Broadcast, Stories y Newsletter', () => {
        it('debe ignorar mensajes de status@broadcast, broadcast y newsletter', async () => {
            vi.spyOn(accessControl, 'canReplyTo');

            const jidsToIgnore = [
                'status@broadcast',
                '12036304567890@broadcast',
                '12036309999999@newsletter'
            ];

            for (const jid of jidsToIgnore) {
                const messageData = {
                    type: 'notify',
                    messages: [
                        {
                            key: {
                                id: `ignore-${Math.random()}`,
                                remoteJid: jid,
                                fromMe: false
                            },
                            message: { conversation: 'Mensaje de canal o estado' }
                        }
                    ]
                };

                await router.handleWhatsAppMessage(messageData as any, mockSocket);
            }

            expect(accessControl.canReplyTo).not.toHaveBeenCalled();
            expect(mockSocket.sendMessage).not.toHaveBeenCalled();
        });
    });

    describe('3. Grupos deshabilitados', () => {
        it('debe ignorar mensajes en grupos si ENABLE_GROUPS no está activo', async () => {
            process.env.ENABLE_GROUPS = 'false';
            invalidateConfigCache();

            vi.spyOn(accessControl, 'canReplyTo').mockReturnValue(true);

            const messageData = {
                type: 'notify',
                messages: [
                    {
                        key: {
                            id: `group-test-${Date.now()}`,
                            remoteJid: '1203630123456789@g.us',
                            participant: '5219991112222@s.whatsapp.net',
                            fromMe: false
                        },
                        message: {
                            conversation: 'Hola grupo'
                        }
                    }
                ]
            };

            await router.handleWhatsAppMessage(messageData as any, mockSocket);

            // Se ignora y no se envía respuesta
            expect(mockSocket.sendMessage).not.toHaveBeenCalled();
            expect(mockMessageController.handleIncoming).not.toHaveBeenCalled();
        });
    });

    describe('4. Whitelist / Blacklist (accessControl)', () => {
        it('debe ignorar mensajes cuando canReplyTo retorne false', async () => {
            vi.spyOn(accessControl, 'canReplyTo').mockReturnValue(false);

            const messageData = {
                type: 'notify',
                messages: [
                    {
                        key: {
                            id: `blocked-${Date.now()}`,
                            remoteJid: '5219999999999@s.whatsapp.net',
                            fromMe: false
                        },
                        message: {
                            conversation: 'Mensaje de usuario bloqueado'
                        }
                    }
                ]
            };

            await router.handleWhatsAppMessage(messageData as any, mockSocket);

            expect(accessControl.canReplyTo).toHaveBeenCalledWith('5219999999999', false);
            expect(mockSocket.sendMessage).not.toHaveBeenCalled();
            expect(mockMessageController.handleIncoming).not.toHaveBeenCalled();
        });
    });

    describe('5. Comandos de Administrador (!lista)', () => {
        it('NO debe permitir ejecutar comandos de admin a usuarios normales', async () => {
            process.env.WHATSAPP_OWNER_NUMBER = '5219991112233';
            invalidateConfigCache();

            const startMenuSpy = vi.spyOn(accessControl, 'startMenu');
            vi.spyOn(accessControl, 'canReplyTo').mockReturnValue(true);

            // Usuario diferente al admin
            const messageData = {
                type: 'notify',
                messages: [
                    {
                        key: {
                            id: `non-admin-${Date.now()}`,
                            remoteJid: '5218880000000@s.whatsapp.net',
                            fromMe: false
                        },
                        message: {
                            conversation: '!lista'
                        }
                    }
                ]
            };

            await router.handleWhatsAppMessage(messageData as any, mockSocket);

            expect(startMenuSpy).not.toHaveBeenCalled();
        });

        it('SÍ debe ejecutar el comando si el remitente es el WHATSAPP_OWNER_NUMBER', async () => {
            process.env.WHATSAPP_OWNER_NUMBER = '5219991112233';
            invalidateConfigCache();

            vi.spyOn(accessControl, 'startMenu').mockReturnValue('📋 Menú de Administración');
            vi.spyOn(accessControl, 'handleMenuWizard').mockReturnValue(null);

            const adminJid = '5219991112233@s.whatsapp.net';
            const messageData = {
                type: 'notify',
                messages: [
                    {
                        key: {
                            id: `admin-${Date.now()}`,
                            remoteJid: adminJid,
                            participant: adminJid,
                            fromMe: false
                        },
                        message: {
                            conversation: '!lista'
                        }
                    }
                ]
            };

            await router.handleWhatsAppMessage(messageData as any, mockSocket);

            expect(accessControl.startMenu).toHaveBeenCalledWith('5219991112233', false);
            expect(mockSocket.sendMessage).toHaveBeenCalledWith(
                adminJid,
                { text: '📋 Menú de Administración' },
                expect.any(Object)
            );
        });
    });
});
