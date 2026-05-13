const fs = require('fs');
const filepath = 'c:/Proyectos/wamasivos/BotMaRe-main/src/components/Reminders.tsx';
const content = fs.readFileSync(filepath, 'utf8');
let lines = content.split('\n');
let new_lines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (line.includes('import { VariableTextarea } from \'./VariableTextarea\';')) {
        new_lines.push(line);
        new_lines.push('import { PendingList } from \'./reminders/PendingList\';');
        new_lines.push('import { HistoryList } from \'./reminders/HistoryList\';');
        new_lines.push('import { GroupModal } from \'./reminders/GroupModal\';');
        new_lines.push('import { BatchWizard } from \'./reminders/BatchWizard\';');
        continue;
    }

    if (line.includes('const PendingList = () => {')) {
        skip = true;
    }
    
    if (skip && line.includes('const fetchGroups = async () => {')) {
        skip = false;
    }

    if (!skip && line.includes('{showBatchWizard && (')) {
        while (i < lines.length && !lines[i].includes('<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">')) {
            i++;
        }
        new_lines.push('            {showBatchWizard && (');
        new_lines.push('                <BatchWizard');
        new_lines.push('                    batchChatId={batchChatId}');
        new_lines.push('                    setBatchChatId={setBatchChatId}');
        new_lines.push('                    batchTime={batchTime}');
        new_lines.push('                    setBatchTime={setBatchTime}');
        new_lines.push('                    batchText={batchText}');
        new_lines.push('                    setBatchText={setBatchText}');
        new_lines.push('                    onOpenGroupModal={() => { setShowGroupModal(true); fetchGroups(); }}');
        new_lines.push('                    onClose={() => setShowBatchWizard(false)}');
        new_lines.push('                    onUpload={handleBatchUploadAndProcess}');
        new_lines.push('                />');
        new_lines.push('            )}');
        new_lines.push('');
        if (i < lines.length) {
            new_lines.push(lines[i]); // Push the grid div
        }
        continue;
    }

    if (!skip && line.includes('{PendingList()}')) {
        new_lines.push('                <PendingList reminders={sortedReminders} viewMode={viewMode} setViewMode={setViewMode} pendingPage={pendingPage} setPendingPage={setPendingPage} onEdit={handleEdit} onSendNow={handleSendNow} onDelete={onDelete} />');
        continue;
    }

    if (!skip && line.includes('{HistoryList()}')) {
        new_lines.push('                <HistoryList reminders={reminders} viewMode={viewMode} setViewMode={setViewMode} historyPage={historyPage} setHistoryPage={setHistoryPage} onDelete={onDelete} />');
        continue;
    }

    if (!skip && line.includes('{showGroupModal && (')) {
        while (i < lines.length && !lines[i].includes('        </div>')) {
            i++;
        }
        new_lines.push('            {showGroupModal && (');
        new_lines.push('                <GroupModal');
        new_lines.push('                    groups={groups}');
        new_lines.push('                    groupLoading={groupLoading}');
        new_lines.push('                    onClose={() => setShowGroupModal(false)}');
        new_lines.push('                    onSelectGroup={handleSelectGroup}');
        new_lines.push('                />');
        new_lines.push('            )}');
        new_lines.push('');
        new_lines.push('        </div>');
        new_lines.push('    );');
        new_lines.push('}');
        break;
    }

    if (!skip) {
        new_lines.push(line);
    }
}

fs.writeFileSync(filepath, new_lines.join('\n'), 'utf8');
console.log('File updated successfully.');
