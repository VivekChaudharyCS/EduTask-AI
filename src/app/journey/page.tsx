// src/app/journey/page.tsx
import ClientJourney from "../../components/ClientJourney";
import ProtectedRoute from "../../components/auth/ProtectedRoute";

export default function JourneyPage() {
  return (
    <ProtectedRoute>
      <ClientJourney />
    </ProtectedRoute>
  );
}
