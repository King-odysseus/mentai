import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "../../services/profileApi";
import { queryKeys } from "../../services/queryKeys";
import { Spinner } from "../shared";

interface RequireProfileProps {
  children: React.ReactNode;
}

/**
 * Route guard — redirects to /onboarding if no profile exists.
 * Shows a centered spinner while checking.
 */
export default function RequireProfile({ children }: RequireProfileProps) {
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: queryKeys.profile.current,
    queryFn: profileApi.get,
    retry: 1,
    staleTime: 60_000,
  });

  if (isLoading) {
    return <Spinner size="lg" label="Loading your profile..." />;
  }

  // If the API errors (no profile exists) or profile isn't complete, redirect
  if (isError || !profile || !profile.onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
