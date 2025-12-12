import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Car, Bus } from 'lucide-react';
import { TransferTable } from '@/components/transfer/TransferTable';
import { TransferMetrics } from '@/components/transfer/TransferMetrics';
import { ShuttleTable } from '@/components/shuttle/ShuttleTable';
import { ShuttleMetrics } from '@/components/shuttle/ShuttleMetrics';
import { Viagem } from '@/lib/types/viagem';

interface EventoTabsProps {
  viagensTransfer: Viagem[];
  viagensShuttle: Viagem[];
  onUpdate?: () => void;
}

export function EventoTabs({ viagensTransfer, viagensShuttle, onUpdate }: EventoTabsProps) {
  // Default to the tab with more trips, or transfer if equal/both empty
  const defaultTab = viagensShuttle.length > viagensTransfer.length ? 'shuttle' : 'transfer';
  const [activeTab, setActiveTab] = useState<'transfer' | 'shuttle'>(defaultTab);

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'transfer' | 'shuttle')}>
      <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 h-12">
        <TabsTrigger 
          value="transfer" 
          className="gap-2 py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-amber-950"
        >
          <Car className="w-4 h-4" />
          Transfer
          <span className="ml-1 text-xs opacity-75 bg-background/20 px-1.5 py-0.5 rounded">
            {viagensTransfer.length}
          </span>
        </TabsTrigger>
        <TabsTrigger 
          value="shuttle"
          className="gap-2 py-2.5 data-[state=active]:bg-emerald-500 data-[state=active]:text-emerald-950"
        >
          <Bus className="w-4 h-4" />
          Shuttle
          <span className="ml-1 text-xs opacity-75 bg-background/20 px-1.5 py-0.5 rounded">
            {viagensShuttle.length}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="transfer" className="space-y-6">
        <TransferMetrics viagens={viagensTransfer} />
        <TransferTable viagens={viagensTransfer} onUpdate={onUpdate} />
      </TabsContent>

      <TabsContent value="shuttle" className="space-y-6">
        <ShuttleMetrics viagens={viagensShuttle} />
        <ShuttleTable viagens={viagensShuttle} onUpdate={onUpdate} />
      </TabsContent>
    </Tabs>
  );
}
