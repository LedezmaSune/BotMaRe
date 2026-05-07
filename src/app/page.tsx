'use client';

import { useGlobalBotData } from '@/app/BotDataProvider';
import { MassMessaging } from '@/components/MassMessaging';

export default function MassPage() {
    const { handleSendMass, handleAIGeneration, templates, groups } = useGlobalBotData();
 
     return (
         <MassMessaging 
             onSend={handleSendMass} 
             onReview={handleAIGeneration} 
             templates={templates} 
             groups={groups}
         />
     );
}
