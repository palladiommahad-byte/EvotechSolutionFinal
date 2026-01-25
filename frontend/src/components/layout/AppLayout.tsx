import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { TopHeader } from './TopHeader';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
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
