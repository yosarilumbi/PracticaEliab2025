import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../src/database/authcontext";

const ProtectedRoute = ({ element }) => {
  const { user } = useAuth();

  return user ? element : <Navigate to="/" replace />;
};

export default ProtectedRoute;
