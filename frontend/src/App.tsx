import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WarehouseProvider } from "@/contexts/WarehouseContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ContactsProvider } from "@/contexts/ContactsContext";
import { ProductsProvider } from "@/contexts/ProductsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { TreasuryProvider } from "@/contexts/TreasuryContext";
import { SalesProvider } from "@/contexts/SalesContext";
import { PurchasesProvider } from "@/contexts/PurchasesContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleBasedRoute } from "@/components/RoleBasedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import { Inventory } from "./pages/Inventory";
import { CRM } from "./pages/CRM";

import { Purchases } from "./pages/Purchases";
import { Sales } from "./pages/Sales";
import { StockTracking } from "./pages/StockTracking";
import { TaxReports } from "./pages/TaxReports";
import { Treasury } from "./pages/Treasury";
// Import Settings directly instead of lazy loading to avoid issues
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
      staleTime: 0, // Data is immediately stale, ensuring fresh data after invalidation
    },
    mutations: {
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <NotificationProvider>
              <CompanyProvider>
                <ContactsProvider>
                  <WarehouseProvider>
                    <ProductsProvider>
                      <TreasuryProvider>
                        <SalesProvider>
                          <PurchasesProvider>
                            <Toaster />
                            <Sonner />
                            <BrowserRouter>
                              <Routes>
                                <Route path="/login" element={<Login />} />
                                <Route
                                  path="/*"
                                  element={
                                    <ProtectedRoute>
                                      <AppLayout>
                                        <Routes>
                                          <Route path="/" element={<RoleBasedRoute><Index /></RoleBasedRoute>} />
                                          <Route path="/inventory" element={<RoleBasedRoute><Inventory /></RoleBasedRoute>} />
                                          <Route path="/crm" element={<RoleBasedRoute><CRM /></RoleBasedRoute>} />

                                          <Route path="/purchases" element={<RoleBasedRoute><Purchases /></RoleBasedRoute>} />
                                          <Route path="/sales" element={<RoleBasedRoute><Sales /></RoleBasedRoute>} />
                                          <Route path="/stock-tracking" element={<RoleBasedRoute><StockTracking /></RoleBasedRoute>} />
                                          <Route path="/tax-reports" element={<RoleBasedRoute><TaxReports /></RoleBasedRoute>} />
                                          <Route path="/treasury" element={<RoleBasedRoute><Treasury /></RoleBasedRoute>} />
                                          <Route path="/settings" element={<RoleBasedRoute><Settings /></RoleBasedRoute>} />
                                          <Route path="*" element={<NotFound />} />
                                        </Routes>
                                      </AppLayout>
                                    </ProtectedRoute>
                                  }
                                />
                              </Routes>
                            </BrowserRouter>
                          </PurchasesProvider>
                        </SalesProvider>
                      </TreasuryProvider>
                    </ProductsProvider>
                  </WarehouseProvider>
                </ContactsProvider>
              </CompanyProvider>
            </NotificationProvider>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
