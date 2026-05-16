'use client';

import { useGlobalBotData } from '@/app/BotDataProvider';
import { MassMessaging } from '@/components/MassMessaging';

export default function MassPage() {
    const { handleSendMass, handleCancelMass, handleAIGeneration, templates, groups, diffusionProgress, diffusionLogs } = useGlobalBotData();
 
     return (
         <MassMessaging 
             onSend={handleSendMass} 
             onCancel={handleCancelMass}
             onReview={handleAIGeneration} 
             templates={templates} 
             groups={groups}
             progress={diffusionProgress}
             logs={diffusionLogs}
         />
     );
}
