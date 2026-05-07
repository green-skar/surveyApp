import { Navigate } from "react-router";

export default function PremiumRedirectPage() {
  return <Navigate to="/tiers" replace />;
}
