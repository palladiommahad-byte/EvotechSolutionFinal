import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { TopHeader } from './TopHeader';

import { StockMonitor } from '@/components/notifications/StockMonitor';
import { BusinessMonitors } from '@/components/notifications/BusinessMonitors';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <StockMonitor />
      <BusinessMonitors />
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader />
        <main className="flex-1 overflow-y-auto bg-section p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
