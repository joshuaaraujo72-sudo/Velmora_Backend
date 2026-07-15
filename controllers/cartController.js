import { buildCheckoutSummary, registerOrder } from "../services/cartService.js";

export const getCheckoutSummary = async (req, res) => {
  try {
    const result = await buildCheckoutSummary(req.body.items);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(200).json(result.summary);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudo calcular el checkout" });
  }
};

export const createOrder = async (req, res) => {
  try {
    const result = await registerOrder({
      items: req.body.items,
      buyerId: req.user.id,
    });

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(201).json(result.order);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudo registrar el pedido" });
  }
};
