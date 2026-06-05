import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "../../services/profileApi";
import { queryKeys } from "../../services/queryKeys";
import { ApiError } from "../../services/api";
import { Spinner, Card, EmptyState, Button } from "../shared";

interface RequireProfileProps {
  children: React.ReactNode;
}

/**
 * Route guard — redirects to /onboarding if no profile exists.
 * Shows a centered spinner while checking.
 * Distinguishes between 404 (no profile — redirect to onboarding)
 * and other errors (server down — show error with retry).
 */
export default function RequireProfile({ children }: RequireProfileProps) {
  const { data: profile, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.profile.current,
    queryFn: profileApi.get,
    retry: 1,
    staleTime: 60_000,
  });

  if (isLoading) {
    return <Spinner size="lg" label="Loading your profile..." />;
  }

  // If no profile or onboarding is not complete, redirect to onboarding
  if (isError) {
    // 404 means no profile exists — safe to redirect to onboarding
    if (error instanceof ApiError && error.status === 404) {
      return <Navigate to="/onboarding" replace />;
    }
    // Server error or network error — show error state so user can retry
    return (
      <div className="full-center">
        <Card>
          <EmptyState
            message={
              error instanceof ApiError
                ? `Server error: ${error.message}`
                : "Cannot reach the server. Please check your connection."
            }
            action={
              <Button
                variant="neo-primary"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  if (!profile || !profile.onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
