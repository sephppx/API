import express from 'express';
import { sql } from '../index.js';
import { auth } from '../middlewares/middleware.js';

const router = express.Router();

// Función para obtener o crear el carrito del usuario
async function obtenerCarritoUsuario(userId) {
    // Consulta para verificar si el usuario tiene un carrito activo
    const carritoQuery = 'SELECT id FROM carritos WHERE user_id = $1 ORDER BY fecha DESC LIMIT 1';
    const carritoExistente = await sql(carritoQuery, [userId]);
  
    if (carritoExistente.length > 0) {
      return carritoExistente[0].id;
    } else {
      // Crear un nuevo carrito si no existe uno
      const nuevoCarritoQuery = 'INSERT INTO carritos (user_id) VALUES ($1) RETURNING id';
      const nuevoCarrito = await sql(nuevoCarritoQuery, [userId]);
      return nuevoCarrito[0].id;
    }
  }

// Endpoint para añadir una unidad de un producto al carrito usando la cookie del usuario autenticado
router.post('/shoppingcart/:productId', auth, async (req, res) => {
  const userId = req.user.id;  // Obtenemos el userId desde la cookie autenticada
  const productId = req.params.productId;

  try {
    // Verificar si el producto existe en la base de datos
    const productoExisteQuery = 'SELECT id, stock FROM productos WHERE id = $1';
    const productoExiste = await sql(productoExisteQuery, [productId]);

    if (productoExiste.length === 0) {
      return res.status(404).json({ error: "El producto no existe en la base de datos" });
    }

    const stockDisponible = productoExiste[0].stock;

    // Obtener o crear el carrito del usuario
    const carritoId = await obtenerCarritoUsuario(userId);

    // Verificar si el producto ya está en el carrito
    const productoExistenteQuery = 'SELECT cantidad FROM carrito_productos WHERE carrito_id = $1 AND producto_id = $2';
    const productoExistente = await sql(productoExistenteQuery, [carritoId, productId]);

    if (productoExistente.length > 0) {
      // Si el producto ya está en el carrito, incrementa la cantidad en 1, pero primero verifica el stock
      const cantidadActual = productoExistente[0].cantidad;
      const nuevaCantidad = cantidadActual + 1;

      if (nuevaCantidad > stockDisponible) {
        return res.status(400).json({ error: "No hay suficiente stock disponible para este producto" });
      }

      // Actualizar la cantidad del producto en el carrito
      await sql('UPDATE carrito_productos SET cantidad = $1 WHERE carrito_id = $2 AND producto_id = $3', [nuevaCantidad, carritoId, productId]);
    } else {
      // Si el producto no está en el carrito, verifica si hay al menos 1 en stock antes de añadirlo
      if (stockDisponible < 1) {
        return res.status(400).json({ error: "No hay suficiente stock disponible para este producto" });
      }

      // Agregar el producto al carrito con una cantidad de 1
      await sql('INSERT INTO carrito_productos (carrito_id, producto_id, cantidad) VALUES ($1, $2, 1)', [carritoId, productId]);
    }

    res.status(200).json({
      message: "Producto añadido al carrito exitosamente",
    });
  } catch (error) {
    console.error("Error al añadir el producto al carrito:", error);
    res.status(500).json({ error: "Error al añadir el producto al carrito. Intente nuevamente más tarde." });
  }
});


// Endpoint para reducir en 1 la cantidad de un producto en el carrito del usuario autenticado
router.delete('/shoppingcart/:productId', auth, async (req, res) => {
    const userId = req.user.id; // Obtenemos el userId desde la cookie autenticada
    const productId = req.params.productId;
  
    try {
      // Obtener el carrito del usuario
      const carritoId = await obtenerCarritoUsuario(userId);
  
      // Verificar si el producto está en el carrito
      const productoExistenteQuery = 'SELECT cantidad FROM carrito_productos WHERE carrito_id = $1 AND producto_id = $2';
      const productoExistente = await sql(productoExistenteQuery, [carritoId, productId]);
  
      if (productoExistente.length === 0) {
        // Si el producto no está en el carrito, responde con error
        return res.status(404).json({ error: "El producto no se encuentra en el carrito" });
      }
  
      const cantidadActual = productoExistente[0].cantidad;
  
      if (cantidadActual > 1) {
        // Si la cantidad es mayor a 1, reduce en 1
        const nuevaCantidad = cantidadActual - 1;
        await sql('UPDATE carrito_productos SET cantidad = $1 WHERE carrito_id = $2 AND producto_id = $3', [nuevaCantidad, carritoId, productId]);
        res.status(200).json({
            message: "Producto eliminado exitosamente.",
          });
      } else {
        // Si la cantidad es 1, elimina el producto del carrito
        await sql('DELETE FROM carrito_productos WHERE carrito_id = $1 AND producto_id = $2', [carritoId, productId]);
        res.status(200).json({
            message: "producto eliminado exitosamente",
          });
      }
    } catch (error) {
      console.error("Error al reducir la cantidad del producto en el carrito:", error);
      res.status(500).json({ error: "Error al modificar el producto en el carrito. Intente nuevamente más tarde." });
    }
  });

// Endpoint para obtener todos los productos en el carrito del usuario autenticado
router.get('/shoppingcart', auth, async (req, res) => {
    const userId = req.user.id;
  
    try {
      // Obtener o crear el carrito del usuario autenticado
      const carritoId = await obtenerCarritoUsuario(userId);
  
      // Consulta para obtener los productos en el carrito
      const productosCarritoQuery = `
        SELECT 
          p.id AS product_id,
          p.nombre AS product_name,
          p.precio AS product_price,
          p.imagen_url AS product_image_url,
          cp.cantidad AS quantity
        FROM carrito_productos cp
        JOIN productos p ON cp.producto_id = p.id
        WHERE cp.carrito_id = $1;
      `;
      
      const productosCarrito = await sql(productosCarritoQuery, [carritoId]);
  
      // Verificar si el carrito está vacío
      if (productosCarrito.length === 0) {
        return res.status(200).json({
          message: "El carrito está vacío",
          products: []
        });
      }
  
      // Respuesta con los productos en el carrito
      res.status(200).json({
        message: "Productos en el carrito obtenidos exitosamente",
        products: productosCarrito
      });
    } catch (error) {
      console.error("Error al obtener el carrito:", error);
      res.status(500).json({ error: 'Error al obtener el carrito. Intente nuevamente más tarde.' });
    }
  });

// Endpoint para realizar la compra
router.post('/purchase', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    // Obtener el carrito del usuario
    const carritoId = await obtenerCarritoUsuario(userId);

    // Verificar si el carrito está vacío
    const productosCarritoQuery = `
      SELECT p.id, p.precio, cp.cantidad 
      FROM carrito_productos cp
      JOIN productos p ON cp.producto_id = p.id
      WHERE cp.carrito_id = $1;
    `;
    const productosCarrito = await sql(productosCarritoQuery, [carritoId]);

    if (productosCarrito.length === 0) {
      return res.status(400).json({ error: "El carrito está vacío" });
    }

    // Calcular el monto total y la cantidad total de artículos
    const totalAmount = productosCarrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
    const totalItems = productosCarrito.reduce((sum, item) => sum + item.cantidad, 0);

    // Verificar si el usuario tiene saldo suficiente en el wallet
    const walletQuery = `SELECT monto FROM wallet WHERE user_id = $1;`;
    const walletResult = await sql(walletQuery, [userId]);
    const walletMonto = walletResult[0]?.monto || 0;

    if (walletMonto < totalAmount) {
      return res.status(400).json({ error: "Monto insuficiente en el wallet" });
    }

    // Actualizar el monto del wallet
    const updateWalletQuery = `UPDATE wallet SET monto = monto - $1 WHERE user_id = $2;`;
    await sql(updateWalletQuery, [totalAmount, userId]);

    // Registrar la compra en la tabla recibos, incluyendo la cantidad total de productos en la columna `cantidad`
    const nuevaCompraQuery = `
      INSERT INTO recibos (usuario_id, monto, cantidad) 
      VALUES ($1, $2, $3) 
      RETURNING id, fecha, monto, cantidad;
    `;
    const nuevaCompra = await sql(nuevaCompraQuery, [userId, totalAmount, totalItems]);
    const { id: compraId, fecha, monto, cantidad } = nuevaCompra[0];

    // Vaciar el carrito del usuario
    const vaciarCarritoQuery = 'DELETE FROM carrito_productos WHERE carrito_id = $1';
    await sql(vaciarCarritoQuery, [carritoId]);

    // Respuesta de éxito
    res.status(200).json({
      message: "Compra realizada exitosamente",
      compra: {
        compraId,
        fecha,
        monto,
        cantidad // total de items comprados
      }
    });
  } catch (error) {
    console.error("Error al realizar la compra:", error);
    res.status(500).json({ error: "Error al procesar la compra. Intente nuevamente más tarde." });
  }
});

export default router;
