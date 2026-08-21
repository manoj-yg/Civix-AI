import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

// Layouts
import { AdminLayout } from '../components/layout/AdminLayout';
import { FieldLayout } from '../components/layout/FieldLayout';

// Auth Pages
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';

// Field Pages
import { FieldHome } from '../pages/field/FieldHome';
import { LiveCameraScanner } from '../pages/field/LiveCameraScanner';
import { NewInspection } from '../pages/field/NewInspection';
import { Processing } from '../pages/field/Processing';
import { Result } from '../pages/field/Result';
import { InspectionDetails } from '../pages/field/InspectionDetails';
import { InspectionHistory } from '../pages/field/InspectionHistory';
import { FieldProfile } from '../pages/field/FieldProfile';
import { FieldSettings } from '../pages/field/FieldSettings';

// Admin Pages
import { Dashboard } from '../pages/admin/Dashboard';
import { LiveMap } from '../pages/admin/LiveMap';
import { Inspections } from '../pages/admin/Inspections';
import { Assets } from '../pages/admin/Assets';
import { Defects } from '../pages/admin/Defects';
import { Maintenance } from '../pages/admin/Maintenance';
import { Analytics } from '../pages/admin/Analytics';
import { PredictiveIntelligence } from '../pages/admin/PredictiveIntelligence';
import { Recommendations } from '../pages/admin/Recommendations';
import { Reports } from '../pages/admin/Reports';
import { BlockchainAudit } from '../pages/admin/BlockchainAudit';
import { FederatedLearning } from '../pages/admin/FederatedLearning';
import { ModelMonitoring } from '../pages/admin/ModelMonitoring';
import { Settings } from '../pages/admin/Settings';
import { BBMPDashboard } from '../pages/admin/BBMPDashboard';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Field Inspection Mobile App Experience */}
      <Route
        path="/field"
        element={
          <ProtectedRoute>
            <FieldLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<FieldHome />} />
        <Route path="map" element={<LiveMap />} />
        <Route path="scan" element={<LiveCameraScanner />} />
        <Route path="new" element={<NewInspection />} />
        <Route path="processing" element={<Processing />} />
        <Route path="result" element={<Result />} />
        <Route path="inspections/:id" element={<InspectionDetails />} />
        <Route path="history" element={<InspectionHistory />} />
        <Route path="profile" element={<FieldProfile />} />
        <Route path="settings" element={<FieldSettings />} />

      </Route>

      {/* Admin / Engineer Dashboard Experience */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'ENGINEER']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="bbmp-operations" element={<BBMPDashboard />} />
        <Route path="map" element={<LiveMap />} />
        <Route path="inspections" element={<Inspections />} />
        <Route path="inspections/:id" element={<InspectionDetails />} />
        <Route path="assets" element={<Assets />} />
        <Route path="defects" element={<Defects />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="predictive" element={<PredictiveIntelligence />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="reports" element={<Reports />} />
        <Route path="blockchain" element={<BlockchainAudit />} />
        <Route path="federated" element={<FederatedLearning />} />
        <Route path="models" element={<ModelMonitoring />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Default Catch-all Redirect */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};
