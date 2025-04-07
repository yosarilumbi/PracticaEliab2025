import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../database/authcontext";

// Componente de ruta protegida
const ProtectedRoute = ({ element }) => {
  const { isLoggedIn } = useAuth();

  // Si el usuario no está autenticado, redirige a la página de inicio
  return isLoggedIn ? element : <Navigate to="/" replace />;
};

export default ProtectedRoute;
