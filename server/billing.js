import crypto from "crypto";
import { getAppUrl } from "./auth.js";
import {
  fulfillPurchase,
  generateOrderRef,
  getPurchaseByExternalId,
  markPurchaseAwaitingReview,
  recordPurchasePending,
} from "./credits.js";

const PACKAGE_RATE = 0.02;
const SUBSCRIPTION_RATE = 0.017;

function packagePriceForCredits(credits) {
  return Math.max(10, Math.round(credits * PACKAGE_RATE));
}

function subscriptionPriceForCredits(credits) {
  return Math.round(credits * SUBSCRIPTION_RATE);
}

function priceForPlan(planType, credits) {
  if (planType === "subscription") {
    return subscriptionPriceForCredits(Math.max(1000, credits));
  }
  return packagePriceForCredits(credits);
}

function isLemonSqueezyConfigured() {
  return Boolean(
    process.env.LEMONSQUEEZY_API_KEY &&
      process.env.LEMONSQUEEZY_STORE_ID &&
      process.env.LEMONSQUEEZY_VARIANT_PACKAGE
  );
}

function manualPaymentMethods() {
  const methods = [];

  if (process.env.MANUAL_PAYMENT_BANK_ACCOUNT) {
    const bankDetails = [
      process.env.MANUAL_PAYMENT_BANK_IBAN ? `IBAN: ${process.env.MANUAL_PAYMENT_BANK_IBAN}` : null,
      process.env.MANUAL_PAYMENT_BANK_SWIFT ? `SWIFT: ${process.env.MANUAL_PAYMENT_BANK_SWIFT}` : null,
      process.env.MANUAL_PAYMENT_BANK_HOLDER ? `Account name: ${process.env.MANUAL_PAYMENT_BANK_HOLDER}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    methods.push({
      id: "bank",
      label: process.env.MANUAL_PAYMENT_BANK_NAME || "Bank transfer",
      value: process.env.MANUAL_PAYMENT_BANK_ACCOUNT,
      detail: bankDetails || null,
      instructions:
        process.env.MANUAL_PAYMENT_BANK_NOTE ||
        "Send a bank transfer in USD and include your order reference in the payment description.",
    });
  }

  if (process.env.MANUAL_PAYMENT_WISE) {
    methods.push({
      id: "wise",
      label: "Wise",
      value: process.env.MANUAL_PAYMENT_WISE,
      detail: process.env.MANUAL_PAYMENT_WISE_NOTE || null,
      instructions:
        "Pay via Wise (wise.com) in USD. Use your order reference as the payment reference.",
    });
  }

  return methods;
}

function isManualBillingConfigured() {
  return manualPaymentMethods().length > 0;
}

export function isBillingConfigured() {
  return isLemonSqueezyConfigured() || isManualBillingConfigured();
}

export function getBillingMode() {
  if (!isBillingConfigured()) return "none";
  if (isLemonSqueezyConfigured() && isManualBillingConfigured()) return "hybrid";
  if (isLemonSqueezyConfigured()) return "card";
  return "manual";
}

export function billingConfigHandler(_req, res) {
  res.json({
    mode: getBillingMode(),
    card: isLemonSqueezyConfigured(),
    bank: Boolean(process.env.MANUAL_PAYMENT_BANK_ACCOUNT),
    wise: Boolean(process.env.MANUAL_PAYMENT_WISE),
  });
}

function buildOrderPayload(order) {
  const amountUsd = order.amount_cents / 100;
  return {
    orderId: order.external_id,
    status: order.status,
    credits: order.credits,
    planType: order.plan_type,
    amountUsd,
    cardAvailable: isLemonSqueezyConfigured() && order.status === "pending",
    paymentMethods: manualPaymentMethods(),
    note:
      process.env.MANUAL_PAYMENT_NOTE ||
      "Include your order reference in every payment so we can match your order quickly.",
    supportEmail: process.env.CONTACT_EMAIL || "support@pdfgerage.app",
  };
}

async function createLemonSqueezyCheckout({ user, planType, credits, amountUsd, orderRef }) {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId =
    planType === "subscription"
      ? process.env.LEMONSQUEEZY_VARIANT_SUBSCRIPTION || process.env.LEMONSQUEEZY_VARIANT_PACKAGE
      : process.env.LEMONSQUEEZY_VARIANT_PACKAGE;
  const frontendUrl = getAppUrl();

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        custom_price: amountUsd * 100,
        product_options: {
          name:
            planType === "subscription"
              ? `PDF Gerage Subscription — ${credits.toLocaleString()} credits/mo`
              : `PDF Gerage Package — ${credits.toLocaleString()} credits`,
          description:
            planType === "subscription"
              ? "Monthly conversion credits for PDF Gerage"
              : "One-time conversion credits — never expire",
          redirect_url: `${frontendUrl}/profile?tab=plan&purchase=success`,
        },
        checkout_data: {
          email: user.email,
          name: user.name || undefined,
          custom: {
            user_id: String(user.id),
            plan_type: planType,
            credits: String(credits),
            order_ref: orderRef,
          },
        },
        test_mode: process.env.NODE_ENV !== "production",
      },
      relationships: {
        store: { data: { type: "stores", id: String(storeId) } },
        variant: { data: { type: "variants", id: String(variantId) } },
      },
    },
  };

  const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.errors?.[0]?.detail || payload?.errors?.[0]?.title || "Card checkout failed";
    throw new Error(detail);
  }

  return payload.data?.attributes?.url || null;
}

export async function createCheckoutHandler(req, res) {
  try {
    if (!isBillingConfigured()) {
      return res.status(503).json({
        error: "Payments are not configured yet. Email support@pdfgerage.app to buy credits.",
      });
    }

    const planType = String(req.body?.plan || "package").toLowerCase();
    const credits = Math.max(500, Math.floor(Number(req.body?.credits) || 500));
    if (!["package", "subscription"].includes(planType)) {
      return res.status(400).json({ error: "Invalid plan type" });
    }

    const amountUsd = priceForPlan(planType, credits);
    const orderRef = generateOrderRef();

    recordPurchasePending({
      userId: req.user.id,
      externalId: orderRef,
      planType,
      credits,
      amountCents: amountUsd * 100,
      provider: getBillingMode(),
    });

    const order = getPurchaseByExternalId(orderRef, req.user.id);
    res.json(buildOrderPayload(order));
  } catch (err) {
    console.error("checkout error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Could not start checkout" });
  }
}

export async function createCardCheckoutHandler(req, res) {
  try {
    if (!isLemonSqueezyConfigured()) {
      return res.status(503).json({ error: "Card payments are not configured yet." });
    }

    const order = getPurchaseByExternalId(req.params.orderId, req.user.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    if (order.status === "completed") {
      return res.status(400).json({ error: "This order is already paid." });
    }
    if (order.status !== "pending") {
      return res.status(400).json({ error: "This order is already being processed." });
    }

    const amountUsd = order.amount_cents / 100;
    const url = await createLemonSqueezyCheckout({
      user: req.user,
      planType: order.plan_type,
      credits: order.credits,
      amountUsd,
      orderRef: order.external_id,
    });

    if (!url) {
      return res.status(500).json({ error: "Could not create card checkout" });
    }

    res.json({ url });
  } catch (err) {
    console.error("card checkout error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Could not start card checkout" });
  }
}

export function getOrderHandler(req, res) {
  const order = getPurchaseByExternalId(req.params.orderId, req.user.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  res.json(buildOrderPayload(order));
}

export function submitOrderHandler(req, res) {
  const order = getPurchaseByExternalId(req.params.orderId, req.user.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  if (order.status === "completed") {
    return res.json({ ok: true, status: "completed" });
  }
  if (order.status !== "pending") {
    return res.json({ ok: true, status: order.status });
  }

  markPurchaseAwaitingReview(order.external_id);
  res.json({ ok: true, status: "awaiting_review" });
}

export function adminFulfillHandler(req, res) {
  const secret = process.env.ADMIN_BILLING_SECRET || "";
  if (!secret || req.headers["x-admin-secret"] !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const orderId = String(req.body?.orderId || req.params.orderId || "").trim();
  if (!orderId) {
    return res.status(400).json({ error: "orderId required" });
  }

  const fulfilled = fulfillPurchase(orderId);
  if (!fulfilled) {
    const order = getPurchaseByExternalId(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status === "completed") return res.json({ ok: true, status: "completed" });
    return res.status(400).json({ error: "Could not fulfill order" });
  }

  res.json({ ok: true, status: "completed" });
}

function verifyLemonSqueezySignature(rawBody, signature) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";
  if (!secret || !signature) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

export async function billingWebhookHandler(req, res) {
  const signature = req.headers["x-signature"];
  if (!verifyLemonSqueezySignature(req.body, signature)) {
    return res.status(400).send("Invalid signature");
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).send("Invalid JSON");
  }

  const eventName = req.headers["x-event-name"] || payload?.meta?.event_name;

  try {
    if (eventName === "order_created") {
      const custom = payload?.meta?.custom_data || {};
      const orderRef = custom.order_ref;
      const userId = Number(custom.user_id);
      const credits = Number(custom.credits);
      const planType = custom.plan_type || "package";

      if (orderRef) {
        const fulfilled = fulfillPurchase(orderRef);
        if (!fulfilled && userId && credits > 0) {
          recordPurchasePending({
            userId,
            externalId: orderRef,
            planType,
            credits,
            amountCents: payload?.data?.attributes?.total || 0,
            provider: "lemonsqueezy",
          });
          fulfillPurchase(orderRef);
        }
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error("billing webhook error:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
}
