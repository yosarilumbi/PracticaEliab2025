import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  limit,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../database/firebaseconfig";
import { Button, Form, ListGroup, Spinner, Modal, Alert } from "react-bootstrap";

const obtenerRespuestaIA = async (promptUsuario) => {
  const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
  const model = import.meta.env.VITE_GEMINI_MODEL || "gemini-1.5-flash";

  if (!apiKey) {
    return { error: "API Key no está definida. Revisa tu archivo .env" };
  }

  const prompt = `Extrae el nombre y la descripción de categoría en este mensaje: "${promptUsuario}". Si el usuario no provee una descripción, genera una descripción corta basándote en el nombre. Asegúrate que el nombre y descripción contengan mayúsculas. Devuélvelo en JSON como {"nombre": "...", "descripcion": "..."}.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" },
        }),
      }
    );

    if (response.status === 429) {
      return { error: "Has alcanzado el límite de solicitudes. Intenta de nuevo más tarde." };
    }

    if (!response.ok) {
      console.error("Error respuesta IA:", response.status);
      return { error: `Error en la respuesta de la IA: ${response.status}` };
    }

    const data = await response.json();
    const respuestaIA = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!respuestaIA) return { error: "No hubo respuesta de la IA." };
    return { data: respuestaIA };
  } catch (error) {
    console.error("Error al obtener respuesta de la IA:", error);
    return { error: "No se pudo conectar con la IA. Verifica tu conexión o API Key." };
  }
};

const ChatIA = ({ showChatModal, setShowChatModal }) => {
  const [mensaje, setMensaje] = useState("");
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const chatRef = useRef(null);

  const chatCollection = collection(db, "chat");

  useEffect(() => {
    const q = query(chatCollection, orderBy("timestamp", "asc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mensajesObtenidos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMensajes(mensajesObtenidos);
      // Auto-scroll to latest message
      if (chatRef.current) {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }
    });
    return () => unsubscribe();
  }, []);

  const enviarMensaje = async () => {
    if (!mensaje.trim() || mensaje.length > 500) {
      setError("El mensaje debe tener entre 1 y 500 caracteres.");
      return;
    }

    setCargando(true);
    setError(null);

    try {
      // Primero, guardamos el mensaje del usuario
      await addDoc(chatCollection, {
        texto: mensaje,
        emisor: "usuario",
        timestamp: serverTimestamp(),
      });

      setMensaje("");

      // Obtenemos la respuesta de la IA
      const respuestaIA = await obtenerRespuestaIA(mensaje);

      if (respuestaIA.error) {
        // Guardamos el error como mensaje de la IA
        await addDoc(chatCollection, {
          texto: respuestaIA.error,
          emisor: "ia",
          timestamp: serverTimestamp(),
        });
        setError(respuestaIA.error);
        return;
      }

      // Guardamos la respuesta de la IA
      await addDoc(chatCollection, {
        texto: `Ok, vamos a registrar ${respuestaIA.data} en la base de datos.`,
        emisor: "ia",
        timestamp: serverTimestamp(),
      });

      try {
        const datos = JSON.parse(respuestaIA.data);
        if (datos.nombre && datos.descripcion) {
          const categoriaRef = collection(db, "categorias");
          // Guardamos la categoría (separado, no en batch para evitar errores)
          await addDoc(categoriaRef, {
            nombre: datos.nombre,
            descripcion: datos.descripcion,
          });
          await addDoc(chatCollection, {
            texto: `Categoría "${datos.nombre}" registrada con éxito.`,
            emisor: "ia",
            timestamp: serverTimestamp(),
          });
        } else {
          await addDoc(chatCollection, {
            texto: "No se pudo registrar la categoría. El JSON no contiene la información esperada.",
            emisor: "ia",
            timestamp: serverTimestamp(),
          });
        }
      } catch (err) {
        console.error("Error al procesar el JSON:", err);
        await addDoc(chatCollection, {
          texto: "La IA no devolvió un JSON válido.",
          emisor: "ia",
          timestamp: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      await addDoc(chatCollection, {
        texto: "Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo más tarde.",
        emisor: "ia",
        timestamp: serverTimestamp(),
      });
      setError("Error al procesar la solicitud.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal
      show={showChatModal}
      onHide={() => setShowChatModal(false)}
      size="lg"
      aria-labelledby="chat-modal-title"
    >
      <Modal.Header closeButton>
        <Modal.Title id="chat-modal-title">Chat con IA</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <ListGroup
          style={{ maxHeight: "300px", overflow: "auto" }}
          ref={chatRef}
        >
          {mensajes.map((msg) => (
            <ListGroup.Item
              key={msg.id}
              variant={msg.emisor === "ia" ? "light" : "primary"}
            >
              <strong>{msg.emisor === "ia" ? "IA: " : "Tú: "}</strong>
              {msg.texto}
              <small className="text-muted d-block">
                {msg.timestamp?.toDate
                  ? msg.timestamp.toDate().toLocaleTimeString()
                  : new Date(msg.timestamp).toLocaleTimeString()}
              </small>
            </ListGroup.Item>
          ))}
        </ListGroup>
        <Form.Control
          className="mt-3"
          type="text"
          placeholder="Escribe tu mensaje..."
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
          disabled={cargando}
          aria-label="Mensaje de chat"
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowChatModal(false)}>
          Cerrar
        </Button>
        <Button onClick={enviarMensaje} disabled={cargando}>
          {cargando ? <Spinner size="sm" animation="border" /> : "Enviar"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ChatIA;
