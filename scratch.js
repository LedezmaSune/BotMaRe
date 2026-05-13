const fs = require('fs');
const file = 'c:/Proyectos/wamasivos/BotMaRe-main/src/components/Reminders.tsx';
let content = fs.readFileSync(file, 'utf8');

const importStatement = `import { ReminderForm } from './reminders/ReminderForm';\n`;
if (!content.includes('ReminderForm')) {
  content = content.replace(/(import .* from 'lucide-react';\n)/, '$1' + importStatement);
}

const formStart = content.indexOf('<form onSubmit={handleSubmit}');
const formEnd = content.indexOf('</form>', formStart) + '</form>'.length;

if (formStart !== -1 && formEnd !== -1) {
  const formReplacement = `<ReminderForm
                            title={title} setTitle={setTitle}
                            chatId={chatId} setChatId={setChatId}
                            text={text} setText={setText}
                            time={time} setTime={setTime}
                            setMedia={setMedia}
                            editingId={editingId} setEditingId={setEditingId}
                            loading={loading}
                            templates={templates}
                            onSubmit={handleSubmit}
                            onShowGroupModal={() => { setShowGroupModal(true); fetchGroups(); }}
                            onAIPerfect={handleAIPerfect}
                        />`;
  content = content.substring(0, formStart) + formReplacement + content.substring(formEnd);
  fs.writeFileSync(file, content);
  console.log('Reminders.tsx updated successfully.');
} else {
  console.log('Could not find form block');
}
