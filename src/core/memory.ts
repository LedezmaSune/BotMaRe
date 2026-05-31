import * as dbManager from './dbManager';

// SQLite completely decoupled. 
// Export as null/any for absolute backwards compatibility in case any minor module queries the raw DB structure.
export const db: any = null; 

// ==========================================
// BACKWARDS COMPATIBILITY EXPORTS
// ==========================================

export const getSettings = dbManager.getSettings;
export const updateSettings = dbManager.updateSettings;
export const addMessage = dbManager.addMessage;
export const getHistory = dbManager.getHistory;
export const clearHistory = dbManager.clearHistory;
export const logAudit = dbManager.logAudit;
export const listAudits = dbManager.listAudits;
export const createReminder = dbManager.createReminder;
export const listReminders = dbManager.listReminders;
export const deleteReminder = dbManager.deleteReminder;
export const updateReminderStatus = dbManager.updateReminderStatus;
export const deleteRemindersBulk = dbManager.deleteRemindersBulk;
export const listTemplates = dbManager.listTemplates;
export const createTemplate = dbManager.createTemplate;
export const deleteTemplate = dbManager.deleteTemplate;
export const updateTemplate = dbManager.updateTemplate;
export const pauseChat = dbManager.pauseChat;
export const unpauseChat = dbManager.unpauseChat;
export const isChatPaused = dbManager.isChatPaused;
export const listAutoresponders = dbManager.listAutoresponders;
export const createAutoresponder = dbManager.createAutoresponder;
export const updateAutoresponder = dbManager.updateAutoresponder;
export const toggleAutoresponder = dbManager.toggleAutoresponder;
export const deleteAutoresponder = dbManager.deleteAutoresponder;
export const listPausedChats = dbManager.listPausedChats;
export const getUserState = dbManager.getUserState;
export const setUserState = dbManager.setUserState;

// ==========================================
// SCHEDULER & CONTROLLER ASYNC HELPERS
// ==========================================

export const listAllPendingReminders = dbManager.listAllPendingReminders;
export const listPendingMediaPaths = dbManager.listPendingMediaPaths;
export const getReminderById = dbManager.getReminderById;
export const updateReminder = dbManager.updateReminder;
export const listPendingOrFailedReminders = dbManager.listPendingOrFailedReminders;
export const checkReminderExistsByMediaPath = dbManager.checkReminderExistsByMediaPath;
