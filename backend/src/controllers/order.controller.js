import {
  cancelCustomerOrder,
  createOrder,
  getCustomerOrder,
  getCustomerOrderActivity,
  getOrderTimeline,
  listCustomerOrders,
} from '../services/order.service.js';

export async function postOrder(req, res) {
  const order = await createOrder(req.customer._id, req.body);
  res.status(201).json({ data: { order } });
}

export async function getOrders(req, res) {
  const orders = await listCustomerOrders(req.customer._id);
  res.json({ data: { orders } });
}

export async function getOrder(req, res) {
  const order = await getCustomerOrder(req.customer._id, req.params.id);
  res.json({ data: { order } });
}

export async function getOrderEvents(req, res) {
  const timeline = await getOrderTimeline(req.customer._id, req.params.id, {
    limit: req.query.limit,
  });
  res.json({ data: timeline });
}

export async function getActivity(req, res) {
  const activity = await getCustomerOrderActivity(req.customer._id, {
    limit: req.query.limit,
  });
  res.json({ data: { activity } });
}

export async function cancelOrder(req, res) {
  const order = await cancelCustomerOrder(req.customer._id, req.params.id);
  res.json({ data: { order } });
}
