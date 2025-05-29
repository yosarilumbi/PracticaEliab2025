import React, { useState, useEffect } from "react";
import { Container, Button, Alert } from "react-bootstrap";
import { db } from "../database/firebaseconfig";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import TablaCategorias from "../components/Categorias/TablaCategorias";
import ModalRegistroCategoria from "../components/Categorias/ModalRegistroCategoria";
import ModalEdicionCategoria from "../components/Categorias/ModalEdicionCategoria";
import ModalEliminacionCategoria from "../components/Categorias/ModalEliminacionCategoria";
import CuadroBusqueda from "../components/busquedas/CuadroBusquedas";
import ChatIA from "../components/chat/ChatIA";

const Categorias = () => {
  // States
  const [categorias, setCategorias] = useState([]);
  const [categoriasFiltradas, setCategoriasFiltradas] = useState([]);
  const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: "", descripcion: "" });
  const [categoriaEditada, setCategoriaEditada] = useState(null);
  const [categoriaAEliminar, setCategoriaAEliminar] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const itemsPerPage = 5;

  // Firestore collection reference
  const categoriasCollection = collection(db, "categorias");

  // Network status listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Firestore real-time listener
  useEffect(() => {
    const unsubscribe = onSnapshot(
      categoriasCollection,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
        setCategorias(data);
        setCategoriasFiltradas(data);
        if (isOffline) {
          console.log("Offline: Showing cached data.");
        }
      },
      (error) => {
        console.error("Error fetching categories:", error);
        setError(`Error loading categories: ${error.message}`);
      }
    );
    return () => unsubscribe();
  }, [isOffline]);

  // Paginated categories
  const paginatedCategorias = categoriasFiltradas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Search handler
  const handleSearchChange = (e) => {
    const text = e.target.value.toLowerCase().trim();
    setSearchText(text);
    const filtradas = categorias.filter(
      (cat) =>
        cat.nombre?.toLowerCase().includes(text) ||
        cat.descripcion?.toLowerCase().includes(text)
    );
    setCategoriasFiltradas(filtradas);
    setCurrentPage(1);
  };

  // Add category
  const handleAddCategoria = async () => {
    const { nombre, descripcion } = nuevaCategoria;
    if (!nombre || !descripcion || nombre.length > 50 || descripcion.length > 200) {
      setError("Por favor completa todos los campos. Nombre ≤ 50 caracteres, Descripción ≤ 200 caracteres.");
      return;
    }

    setError(null);
    setShowModal(false);

    // Optimistic UI update with temporary id
    const tempId = `temp_${Date.now()}`;
    const categoriaTemporal = { ...nuevaCategoria, id: tempId };
    setCategorias((prev) => [...prev, categoriaTemporal]);
    setCategoriasFiltradas((prev) => [...prev, categoriaTemporal]);

    try {
      // Agregar a Firestore (sin writeBatch, que no es necesario aquí)
      const docRef = await addDoc(categoriasCollection, nuevaCategoria);

      // Actualizar la lista para reemplazar el tempId por el id real
      setCategorias((prev) =>
        prev.map((cat) => (cat.id === tempId ? { ...nuevaCategoria, id: docRef.id } : cat))
      );
      setCategoriasFiltradas((prev) =>
        prev.map((cat) => (cat.id === tempId ? { ...nuevaCategoria, id: docRef.id } : cat))
      );

      setNuevaCategoria({ nombre: "", descripcion: "" });
    } catch (error) {
      console.error("Error agregando categoría:", error);
      setCategorias((prev) => prev.filter((cat) => cat.id !== tempId));
      setCategoriasFiltradas((prev) => prev.filter((cat) => cat.id !== tempId));
      setError(`No se pudo guardar la categoría: ${error.message}`);
    }
  };

  // Edit category
  const handleEditCategoria = async () => {
    if (
      !categoriaEditada?.nombre ||
      !categoriaEditada?.descripcion ||
      categoriaEditada.nombre.length > 50 ||
      categoriaEditada.descripcion.length > 200
    ) {
      setError("Por favor completa todos los campos. Nombre ≤ 50 caracteres, Descripción ≤ 200 caracteres.");
      return;
    }

    setShowEditModal(false);
    setError(null);
    const categoriaRef = doc(db, "categorias", categoriaEditada.id);
    const updatedCategoria = { ...categoriaEditada };

    setCategorias((prev) =>
      prev.map((cat) => (cat.id === categoriaEditada.id ? updatedCategoria : cat))
    );
    setCategoriasFiltradas((prev) =>
      prev.map((cat) => (cat.id === categoriaEditada.id ? updatedCategoria : cat))
    );

    try {
      await updateDoc(categoriaRef, {
        nombre: categoriaEditada.nombre,
        descripcion: categoriaEditada.descripcion,
      });
    } catch (error) {
      console.error("Error editando categoría:", error);
      setError(`No se pudo actualizar la categoría: ${error.message}`);
      // Revertir cambios en UI si falla
      setCategorias((prev) =>
        prev.map((cat) =>
          cat.id === categoriaEditada.id ? { ...cat, ...categoriaEditada } : cat
        )
      );
      setCategoriasFiltradas((prev) =>
        prev.map((cat) =>
          cat.id === categoriaEditada.id ? { ...cat, ...categoriaEditada } : cat
        )
      );
    }
  };

  // Delete category
  const handleDeleteCategoria = async () => {
    if (!categoriaAEliminar) return;
    setShowDeleteModal(false);
    setError(null);

    const deletedCategoria = { ...categoriaAEliminar };
    setCategorias((prev) => prev.filter((cat) => cat.id !== categoriaAEliminar.id));
    setCategoriasFiltradas((prev) => prev.filter((cat) => cat.id !== categoriaAEliminar.id));

    try {
      const categoriaRef = doc(db, "categorias", categoriaAEliminar.id);
      await deleteDoc(categoriaRef);
    } catch (error) {
      console.error("Error eliminando categoría:", error);
      setCategorias((prev) => [...prev, deletedCategoria]);
      setCategoriasFiltradas((prev) => [...prev, deletedCategoria]);
      setError(`No se pudo eliminar la categoría: ${error.message}`);
    }
  };

  // Abrir modales para editar y eliminar
  const openEditModal = (categoria) => {
    setCategoriaEditada({ ...categoria });
    setShowEditModal(true);
  };

  const openDeleteModal = (categoria) => {
    setCategoriaAEliminar(categoria);
    setShowDeleteModal(true);
  };

  return (
    <Container className="mt-5" aria-label="Gestión de Categorías">
      <h4>Gestión de Categorías</h4>
      {error && <Alert variant="danger">{error}</Alert>}
      {isOffline && <Alert variant="warning">Offline: Los cambios se sincronizarán cuando vuelvas a estar online.</Alert>}

      <Button
        className="mb-3"
        onClick={() => setShowModal(true)}
        aria-label="Agregar nueva categoría"
      >
        Agregar categoría
      </Button>
      <Button
        className="mb-3"
        onClick={() => setShowChatModal(true)}
        style={{ width: "100%" }}
        aria-label="Abrir chat IA"
      >
        Chat IA
      </Button>

      <CuadroBusqueda
        searchText={searchText}
        handleSearchChange={handleSearchChange}
        aria-label="Buscar categorías"
      />

      <TablaCategorias
        categorias={paginatedCategorias}
        openEditModal={openEditModal}
        openDeleteModal={openDeleteModal}
        totalItems={categoriasFiltradas.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />

      <ModalRegistroCategoria
        show={showModal}
        handleClose={() => setShowModal(false)}
        handleInputChange={(e) => {
          const { name, value } = e.target;
          setNuevaCategoria((prev) => ({ ...prev, [name]: value }));
        }}
        handleSave={handleAddCategoria}
        nuevaCategoria={nuevaCategoria}
      />

      <ModalEdicionCategoria
        show={showEditModal}
        handleClose={() => setShowEditModal(false)}
        handleInputChange={(e) => {
          const { name, value } = e.target;
          setCategoriaEditada((prev) => ({ ...prev, [name]: value }));
        }}
        handleUpdate={handleEditCategoria}
        categoriaEditada={categoriaEditada}
      />

      <ModalEliminacionCategoria
        show={showDeleteModal}
        handleClose={() => setShowDeleteModal(false)}
        handleDelete={handleDeleteCategoria}
        categoria={categoriaAEliminar}
      />

      <ChatIA
        showChatModal={showChatModal}
        setShowChatModal={setShowChatModal}
      />
    </Container>
  );
};

export default Categorias;
