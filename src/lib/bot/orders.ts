/** Re-export tenant-aware orders API (legacy path). */
export {
  validateOrder,
  storeOrder,
  listOrders,
  updateOrderTracking,
  findOrdersByPhone,
  findLatestOrderForSender,
  tryParseOrderFromText,
  wantsOrderTracking,
  formatTrackingReply,
  type OrderPayload,
} from "@/lib/db/orders";
export type { Order as StoredOrder } from "@/lib/db/types";
