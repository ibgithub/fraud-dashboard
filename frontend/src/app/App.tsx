import { createBrowserRouter, RouterProvider, Navigate } from 'react-router';
import { useEffect } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { Login } from './pages/Login';
import { I18nProvider } from './i18n/I18nProvider';
import { Home } from './pages/Home';
import { FraudOverview } from './pages/fraud/FraudOverview';
import { FraudLive } from './pages/fraud/FraudLive';
import { FraudExecutive } from './pages/fraud/FraudExecutive';
import { FraudAlertQueue } from './pages/fraud/FraudAlertQueue';
import { FraudDailyReview } from './pages/fraud/FraudDailyReview';
import { FraudReviewAnalyst } from './pages/fraud/FraudReviewAnalyst';
import { CorporateInsight } from './pages/CorporateInsight';
import { ChurnOverview } from './pages/ChurnOverview';
import { ChurnRanking } from './pages/ChurnRanking';
import { CpiMatrix } from './pages/CpiMatrix';
import { ProfitabilityOverview } from './pages/ProfitabilityOverview';
import { ProfitabilityList } from './pages/ProfitabilityList';
import { ProfitabilityModelPerformance } from './pages/ProfitabilityModelPerformance';
import { ChurnModelPerformance } from './pages/ChurnModelPerformance';
import { SegmentationOverview } from './pages/SegmentationOverview';
import { SegmentationCharacteristics } from './pages/SegmentationCharacteristics';
import { SegmentationProductUsage } from './pages/SegmentationProductUsage';
import { SegmentationModelPerformance } from './pages/SegmentationModelPerformance';
import { RecommenderRecommendations } from './pages/RecommenderRecommendations';
import { RecommenderModelPerformance } from './pages/RecommenderModelPerformance';
import { CpiMatrixHotTarget } from './pages/CpiMatrixHotTarget';
import { PromoEngineProcess } from './pages/PromoEngineProcess';
import { AumOverview } from './pages/AumOverview';
import { AumRanking } from './pages/AumRanking';
import { CampaignActionPlanTemplate } from './pages/CampaignActionPlanTemplate';
import { CampaignRegistry } from './pages/CampaignRegistry';
import { CampaignAssignment } from './pages/CampaignAssignment';
import { CampaignEffectiveness } from './pages/CampaignEffectiveness';
import { RecommendationHistory } from './pages/RecommendationHistory';
import { Customer360Profile } from './pages/Customer360Profile';
import { AlertsCenter } from './pages/AlertsCenter';
import { SetupRecommendationSettings } from './pages/SetupRecommendationSettings';
import { SetupObservationSettings } from './pages/SetupObservationSettings';
import { SetupNotificationRules } from './pages/SetupNotificationRules';
import { SetupPersonaLabels } from './pages/SetupPersonaLabels';
import { SystemHelpGlossary } from './pages/SystemHelpGlossary';
import { SetupThresholdChurn } from './pages/SetupThresholdChurn';
import { RoleManagement } from './pages/RoleManagement';
import { UserManagement } from './pages/UserManagement';
import { ChangePassword } from './pages/ChangePassword';
import { MenuManagement } from './pages/MenuManagement';
import { EditProfile } from './pages/EditProfile';
import { SystemParameter } from './pages/SystemParameter';
import { AuditLog } from './pages/AuditLog';
import { Toaster } from './components/ui/sonner';

// Simple auth guard
function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

const router = createBrowserRouter([
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <DashboardLayout />
      </RequireAuth>
    ),
    children: [
      // Redirect root to the fraud Home page
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <Home /> },

      // ---- Fraud Detection (FraudGuard) — mockup pages with hardcoded data
      { path: 'fraud/overview', element: <FraudOverview /> },
      { path: 'fraud/live', element: <FraudLive /> },
      { path: 'fraud/executive', element: <FraudExecutive /> },
      { path: 'fraud/alerts', element: <FraudAlertQueue /> },
      { path: 'fraud/daily-review', element: <FraudDailyReview /> },
      { path: 'fraud/review', element: <FraudReviewAnalyst /> },

      // ---- Legacy CPI pages (anvaia-bag). No longer in any menu since auth V35;
      // ---- kept routable until the fraud pages replace them.
      // 1. Corporate Insight (no sub-menu, direct page)
      { path: 'corporate-insight', element: <CorporateInsight /> },
      { path: 'corporate-insight/overview', element: <CorporateInsight /> },

      // 2. Churn Analysis
      { path: 'churn/overview', element: <ChurnOverview /> },
      { path: 'churn/ranking', element: <ChurnRanking /> },
      { path: 'churn/model-performance', element: <ChurnModelPerformance /> },

      // 2b. AUM Analysis
      { path: 'aum/overview', element: <AumOverview /> },
      { path: 'aum/ranking', element: <AumRanking /> },

      // 3. Customer Profitability
      { path: 'profitability/overview', element: <ProfitabilityOverview /> },
      { path: 'profitability/list', element: <ProfitabilityList /> },
      { path: 'profitability/model-performance', element: <ProfitabilityModelPerformance /> },

      // 4. Customer Segmentation
      { path: 'segmentation/overview', element: <SegmentationOverview /> },
      { path: 'segmentation/characteristics', element: <SegmentationCharacteristics /> },
      { path: 'segmentation/product-usage', element: <SegmentationProductUsage /> },
      { path: 'segmentation/model-performance', element: <SegmentationModelPerformance /> },

      // 5. CPI Matrix
      { path: 'cpi-matrix/overview', element: <CpiMatrix /> },
      { path: 'cpi-matrix/hot-target', element: <CpiMatrixHotTarget /> },
      { path: 'cpi-matrix/promo-engine', element: <PromoEngineProcess /> },

      // 6. Recommender System
      { path: 'recommender/recommendations', element: <RecommenderRecommendations /> },
      { path: 'recommender/model-performance', element: <RecommenderModelPerformance /> },

      // 7. Campaign & Strategy Tracking
      { path: 'campaign/action-plan-template', element: <CampaignActionPlanTemplate /> },
      { path: 'campaign/recommendation-history', element: <RecommendationHistory /> },
      { path: 'campaign/assignment', element: <CampaignAssignment /> },
      { path: 'campaign/effectiveness', element: <CampaignEffectiveness /> },
      { path: 'campaign/registry', element: <CampaignRegistry /> },

      // 8. Customer 360
      { path: 'customer-360/profile', element: <Customer360Profile /> },

      // 9. Alert / Notification Center
      { path: 'alerts/center', element: <AlertsCenter /> },

      // 10. Setup
      { path: 'setup/threshold-churn', element: <SetupThresholdChurn /> },
      { path: 'setup/recommendation-settings', element: <SetupRecommendationSettings /> },
      { path: 'setup/user-role-management', element: <UserManagement /> },
      { path: 'setup/role-management', element: <RoleManagement /> },
      { path: 'setup/menu-management', element: <MenuManagement /> },
      { path: 'setup/setting-parameters', element: <SystemParameter /> },
      { path: 'admin/audit-log', element: <AuditLog /> },
      { path: 'setup/observation-settings', element: <SetupObservationSettings /> },
      { path: 'setup/notification-rules', element: <SetupNotificationRules /> },
      { path: 'setup/persona-labels', element: <SetupPersonaLabels /> },

      // 11. System
      { path: 'system/profile', element: <EditProfile /> },
      { path: 'system/change-password', element: <ChangePassword /> },
      { path: 'system/help-glossary', element: <SystemHelpGlossary /> },

      // Legacy routes (keep role/menu management accessible)
      { path: 'settings/role-management', element: <RoleManagement /> },
      { path: 'settings/menu-management', element: <MenuManagement /> },
      { path: 'settings/change-password', element: <ChangePassword /> },
      { path: 'settings/system-parameters', element: <SystemParameter /> },

      // Catch-all → redirect to Home
      { path: '*', element: <Navigate to="/home" replace /> },
    ],
  },
]);

export default function App() {
  return (
    <I18nProvider>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </I18nProvider>
  );
}

