import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Container } from "react-bootstrap";
import LoginForm from "../components/LoginForm";
import { appfirebase } from "../database/firebaseconfig";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "../database/authcontext";

import "../App.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false); // Para manejar el estado de carga

  const { user } = useAuth(); // Obtener el usuario desde el AuthContext
  const navigate = useNavigate();

  // Redirigir si el usuario ya está autenticado
  useEffect(() => {
    if (user) {
      navigate("/inicio"); // Redirigir al inicio si ya está autenticado
    }
  }, [user, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true); // Iniciar el estado de carga
    const auth = getAuth(appfirebase);

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        console.log("Usuario autenticado:", userCredential.user);
        // Guardar las credenciales en localStorage
        localStorage.setItem("adminEmail", email);
        localStorage.setItem("adminPassword", password);
        // Redirigir después de iniciar sesión
        navigate("/inicio");
      })
      .catch((error) => {
        setError("Error de autenticación. Verifica tus credenciales.");
        console.error(error);
      })
      .finally(() => {
        setLoading(false); // Finalizar estado de carga
      });
  };

  return (
    <Container className="d-flex vh-100 justify-content-center align-items-center">
      <LoginForm
        email={email}
        password={password}
        error={error}
        setEmail={setEmail}
        setPassword={setPassword}
        handleSubmit={handleSubmit}
        loading={loading} // Pasar el estado de carga al formulario
      />
    </Container>
  );
};

export default Login;
