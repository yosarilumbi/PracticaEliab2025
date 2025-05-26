import React from "react";
import { Table, Button, Image } from "react-bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import Paginacion from "../ordenamiento/Paginacion";

const TablaProductos = ({
  productos,
  openEditModal,
  openDeleteModal,
  handleCopy,
  totalItems,
  itemsPerPage,
  currentPage,
  setCurrentPage
}) => {
  return (
    <>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Imagen</th>
            <th>Nombre</th>
            <th>Precio</th>
            <th>Categoría</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((producto) => (
            <tr key={producto.id}>
              <td>
                {producto.imagen && (
                  <Image src={producto.imagen} width="50" height="50" />
                )}
              </td>
              <td>{producto.nombre}</td>
              <td>C${producto.precio}</td>
              <td>{producto.categoria}</td>
              <td>
                <Button
                  variant="outline-warning"
                  size="sm"
                  className="me-2"
                  onClick={() => openEditModal(producto)}
                >
                  <i className="bi bi-pencil"></i>
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  className="me-2"
                  onClick={() => openDeleteModal(producto)}
                >
                  <i className="bi bi-trash"></i>
                </Button>
                <Button
                  variant="outline-info"
                  size="sm"
                  onClick={() => handleCopy(producto)}
                >
                  <i className="bi bi-clipboard"></i>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Paginacion
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
    </>
  );
};

export default TablaProductos;
