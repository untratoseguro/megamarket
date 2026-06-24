"""
Pagos: PayPal (USD) y Wompi (COP con conversión desde USD).

Flujo PayPal:
  1. POST /payments/paypal/create-order → crea PayPal order + registro payments en DB
  2. Frontend redirige al usuario a approval_url de PayPal
  3. Usuario aprueba → PayPal envía webhook CHECKOUT.ORDER.APPROVED
  4. Webhook handler captura el pago (POST /capture a PayPal)
  5. PayPal envía webhook PAYMENT.CAPTURE.COMPLETED
  6. Webhook handler actualiza payment→'completed' y order→'confirmed'

Flujo Wompi:
  1. POST /payments/wompi/create-transaction → crea payment link + registro en DB
  2. Frontend redirige al usuario a la URL del payment link
  3. Usuario paga → Wompi envía webhook payment_link.paid
  4. Webhook handler verifica firma, actualiza payment→'completed' y order→'confirmed'

Idempotencia: UNIQUE (provider, event_id) en payment_events.
  Si ya existe → 200 sin reprocesar.

Seguridad: ningún webhook modifica estado sin verificación de firma.
"""
import base64
import hashlib
import hmac
import json
import logging
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.rate_limit import get_user_or_ip_key, limiter
from app.core.settings import settings
from app.core.supabase import get_supabase
from app.deps.auth import require_auth
from app.schemas.payment import PaymentCreateIn, PayPalOrderOut, WompiTransactionOut

logger = logging.getLogger(__name__)

router = APIRouter(tags=["payments"])


# ─────────────────────────────────────────────────────────────────────────────
# PayPal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _paypal_access_token() -> str:
    """Obtiene un token de acceso PayPal via client_credentials."""
    credentials = base64.b64encode(
        f"{settings.paypal_client_id}:{settings.paypal_client_secret}".encode()
    ).decode()

    with httpx.Client(timeout=15) as client:
        resp = client.post(
            f"{settings.paypal_base_url}/v1/oauth2/token",
            headers={"Authorization": f"Basic {credentials}"},
            data={"grant_type": "client_credentials"},
        )
    if resp.status_code != 200:
        logger.error("PayPal token error: status=%s", resp.status_code)
        raise HTTPException(502, "Error al conectar con PayPal")
    return resp.json()["access_token"]


def _paypal_create_order(
    access_token: str,
    amount_usd: float,
    reference_id: str,
    return_url: str,
    cancel_url: str,
) -> dict:
    """Crea un order en PayPal (intent=CAPTURE). Retorna el dict de respuesta."""
    with httpx.Client(timeout=15) as client:
        resp = client.post(
            f"{settings.paypal_base_url}/v2/checkout/orders",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "PayPal-Request-Id": reference_id,
            },
            json={
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "reference_id": reference_id,
                        "amount": {
                            "currency_code": "USD",
                            "value": f"{amount_usd:.2f}",
                        },
                    }
                ],
                "payment_source": {
                    "paypal": {
                        "experience_context": {
                            "return_url": return_url,
                            "cancel_url": cancel_url,
                            "user_action": "PAY_NOW",
                            "shipping_preference": "NO_SHIPPING",
                        }
                    }
                },
            },
        )
    if resp.status_code not in (200, 201):
        logger.error("PayPal create-order error: status=%s", resp.status_code)
        raise HTTPException(502, "Error al crear orden en PayPal")
    return resp.json()


async def _paypal_verify_webhook(request: Request, raw_body: bytes) -> bool:
    """
    Verifica la firma del webhook llamando a la API de PayPal.
    PayPal requiere reenviarle los headers + body para que los verifique.
    """
    required_headers = [
        "paypal-auth-algo",
        "paypal-cert-url",
        "paypal-transmission-id",
        "paypal-transmission-sig",
        "paypal-transmission-time",
    ]
    missing = [h for h in required_headers if h not in request.headers]
    if missing:
        logger.warning("Webhook PayPal: faltan headers %s", missing)
        return False

    access_token = _paypal_access_token()

    try:
        body_dict = json.loads(raw_body)
    except json.JSONDecodeError:
        return False

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{settings.paypal_base_url}/v1/notifications/verify-webhook-signature",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={
                "auth_algo": request.headers["paypal-auth-algo"],
                "cert_url": request.headers["paypal-cert-url"],
                "transmission_id": request.headers["paypal-transmission-id"],
                "transmission_sig": request.headers["paypal-transmission-sig"],
                "transmission_time": request.headers["paypal-transmission-time"],
                "webhook_id": settings.paypal_webhook_id,
                "webhook_event": body_dict,
            },
        )

    if resp.status_code != 200:
        logger.warning("PayPal webhook verify failed: status=%s", resp.status_code)
        return False

    status = resp.json().get("verification_status", "")
    return status == "SUCCESS"


async def _paypal_capture(paypal_order_id: str) -> Optional[dict]:
    """Captura un orden PayPal ya aprobado por el usuario."""
    access_token = _paypal_access_token()
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            f"{settings.paypal_base_url}/v2/checkout/orders/{paypal_order_id}/capture",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={},
        )
    if resp.status_code in (200, 201):
        return resp.json()
    logger.error("PayPal capture error: order=%s status=%s", paypal_order_id, resp.status_code)
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Wompi helpers
# ─────────────────────────────────────────────────────────────────────────────

def _wompi_create_payment_link(
    amount_usd: float,
    redirect_url: str,
    description: str,
    reference: str,
) -> dict:
    """
    Crea un payment link de un solo uso en Wompi.
    Convierte USD → COP usando WOMPI_COP_PER_USD.
    """
    amount_cents = int(round(amount_usd * settings.wompi_cop_per_usd * 100))

    with httpx.Client(timeout=15) as client:
        resp = client.post(
            f"{settings.wompi_base_url}/payment_links",
            headers={
                "Authorization": f"Bearer {settings.wompi_private_key}",
                "Content-Type": "application/json",
            },
            json={
                "name": f"MegaMarket — {reference[:50]}",
                "description": description[:255],
                "single_use": True,
                "collect_shipping": False,
                "amount_in_cents": amount_cents,
                "currency": "COP",
                "redirect_url": redirect_url,
            },
        )
    if resp.status_code not in (200, 201):
        logger.error("Wompi create-link error: status=%s", resp.status_code)
        raise HTTPException(502, "Error al crear link de pago en Wompi")
    return resp.json().get("data", {})


def _wompi_verify_signature(payload: dict) -> bool:
    """
    Verifica la firma SHA256 de un webhook de Wompi.
    Referencia: https://docs.wompi.co/docs/colombia/eventos-de-pago/
    Algoritmo: SHA256( concat(valores de properties) + timestamp + event_secret )
    """
    if not settings.wompi_event_secret:
        logger.warning("WOMPI_EVENT_SECRET no configurado — rechazando webhook")
        return False

    signature = payload.get("signature", {})
    properties: list[str] = signature.get("properties", [])
    checksum: str = signature.get("checksum", "")
    timestamp = payload.get("timestamp", "")

    if not properties or not checksum:
        return False

    # Resolver rutas de propiedades (ej: "data.transaction.id")
    values = []
    for prop in properties:
        val: object = payload
        for key in prop.split("."):
            if isinstance(val, dict):
                val = val.get(key, "")
            else:
                val = ""
                break
        values.append(str(val))

    concat = "".join(values) + str(timestamp) + settings.wompi_event_secret
    expected = hashlib.sha256(concat.encode("utf-8")).hexdigest()
    return hmac.compare_digest(expected, checksum)


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────────────────────────────────────

def _verify_order_for_payment(order_id: str, user_id: str) -> dict:
    """Verifica que la orden existe, pertenece al usuario y está en pending."""
    sb = get_supabase()
    rows = sb.table("orders").select("id, user_id, status, total").eq("id", order_id).eq("user_id", user_id).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Orden no encontrada")
    order = rows[0]
    if order["status"] != "pending":
        raise HTTPException(400, f"La orden ya está en estado '{order['status']}'")
    return order


def _save_payment(order_id: str, provider: str, provider_payment_id: str, amount: float, currency: str) -> str:
    """Inserta un registro en payments y retorna su id."""
    sb = get_supabase()
    result = sb.table("payments").insert({
        "order_id": order_id,
        "provider": provider,
        "provider_payment_id": provider_payment_id,
        "status": "pending",
        "amount": amount,
        "currency": currency,
    }).execute()
    return result.data[0]["id"]


def _get_payment_by_provider_id(provider: str, provider_payment_id: str) -> Optional[dict]:
    sb = get_supabase()
    rows = sb.table("payments").select("id, order_id, status").eq("provider", provider).eq("provider_payment_id", provider_payment_id).limit(1).execute().data
    return rows[0] if rows else None


def _save_event_idempotent(payment_id: str, provider: str, event_id: str, event_type: str, payload: dict) -> bool:
    """
    Inserta en payment_events. Si ya existe (provider, event_id) retorna False.
    Retorna True si el evento es nuevo y debe procesarse.
    """
    sb = get_supabase()
    try:
        sb.table("payment_events").insert({
            "payment_id": payment_id,
            "provider": provider,
            "event_id": event_id,
            "event_type": event_type,
            "payload_json": payload,
        }).execute()
        return True
    except Exception as exc:
        # PostgREST lanza una excepción cuando viola la constraint UNIQUE
        if "23505" in str(exc) or "unique" in str(exc).lower():
            logger.info("Evento %s/%s ya procesado — ignorando", provider, event_id)
            return False
        raise


def _update_payment_and_order(payment_id: str, order_id: str, pay_status: str, order_status: str) -> None:
    sb = get_supabase()
    sb.table("payments").update({"status": pay_status}).eq("id", payment_id).execute()
    sb.table("orders").update({"status": order_status}).eq("id", order_id).execute()


# ─────────────────────────────────────────────────────────────────────────────
# PayPal endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/paypal/create-order", response_model=PayPalOrderOut, status_code=201)
@limiter.limit("5/minute", key_func=get_user_or_ip_key)
def create_paypal_order(request: Request, body: PaymentCreateIn, profile: dict = Depends(require_auth)):
    order = _verify_order_for_payment(str(body.order_id), profile["id"])
    order_id = order["id"]
    total_usd = float(order["total"])

    return_url = f"{settings.frontend_url}/pedido/{order_id}?provider=paypal"
    cancel_url = f"{settings.frontend_url}/pedido/{order_id}"

    access_token = _paypal_access_token()
    paypal_resp = _paypal_create_order(
        access_token=access_token,
        amount_usd=total_usd,
        reference_id=order_id,
        return_url=return_url,
        cancel_url=cancel_url,
    )

    paypal_order_id = paypal_resp["id"]

    # Buscar el enlace de aprobación
    approval_url = next(
        (link["href"] for link in paypal_resp.get("links", []) if link["rel"] == "payer-action"),
        None,
    )
    if not approval_url:
        raise HTTPException(502, "PayPal no devolvió URL de aprobación")

    payment_id = _save_payment(order_id, "paypal", paypal_order_id, total_usd, "USD")

    return PayPalOrderOut(
        payment_id=payment_id,
        paypal_order_id=paypal_order_id,
        approval_url=approval_url,
    )


@router.post("/paypal/webhook", status_code=200)
async def paypal_webhook(request: Request):
    raw_body = await request.body()

    if not await _paypal_verify_webhook(request, raw_body):
        logger.warning("PayPal webhook rechazado: firma inválida")
        raise HTTPException(401, "Firma de webhook inválida")

    try:
        event = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(400, "Payload inválido")

    event_id: str = event.get("id", "")
    event_type: str = event.get("event_type", "")
    resource: dict = event.get("resource", {})

    logger.info("PayPal webhook: %s (id=%s)", event_type, event_id)

    if event_type == "CHECKOUT.ORDER.APPROVED":
        # El usuario aprobó. Capturamos el pago automáticamente.
        paypal_order_id = resource.get("id", "")
        payment = _get_payment_by_provider_id("paypal", paypal_order_id)
        if not payment:
            logger.warning("CHECKOUT.ORDER.APPROVED: pago no encontrado para %s", paypal_order_id)
            return {"ok": True}

        is_new = _save_event_idempotent(payment["id"], "paypal", event_id, event_type, event)
        if not is_new:
            return {"ok": True}

        # Capturar
        capture_result = await _paypal_capture(paypal_order_id)
        if not capture_result:
            _update_payment_and_order(payment["id"], payment["order_id"], "failed", "pending")

    elif event_type == "PAYMENT.CAPTURE.COMPLETED":
        # Pago capturado exitosamente → confirmar orden
        supplementary = resource.get("supplementary_data", {})
        paypal_order_id = supplementary.get("related_ids", {}).get("order_id", "")
        if not paypal_order_id:
            # Fallback: buscar por seller_receivable_breakdown
            paypal_order_id = resource.get("id", "")

        payment = _get_payment_by_provider_id("paypal", paypal_order_id)
        if not payment:
            logger.warning("PAYMENT.CAPTURE.COMPLETED: pago no encontrado para %s", paypal_order_id)
            return {"ok": True}

        is_new = _save_event_idempotent(payment["id"], "paypal", event_id, event_type, event)
        if not is_new:
            return {"ok": True}

        _update_payment_and_order(payment["id"], payment["order_id"], "completed", "confirmed")
        logger.info("Orden %s confirmada (PayPal capture %s)", payment["order_id"], event_id)

    elif event_type in ("PAYMENT.CAPTURE.DENIED", "CHECKOUT.ORDER.VOIDED", "CHECKOUT.ORDER.CANCELLED"):
        paypal_order_id = resource.get("id", "")
        payment = _get_payment_by_provider_id("paypal", paypal_order_id)
        if not payment:
            return {"ok": True}

        is_new = _save_event_idempotent(payment["id"], "paypal", event_id, event_type, event)
        if not is_new:
            return {"ok": True}

        # Pago fallido: payment → failed, orden se mantiene 'pending' para que el usuario pueda reintentar
        _update_payment_and_order(payment["id"], payment["order_id"], "failed", "pending")
        logger.info("Pago PayPal fallido para orden %s", payment["order_id"])

    elif event_type == "PAYMENT.CAPTURE.REFUNDED":
        paypal_order_id = resource.get("id", "")
        payment = _get_payment_by_provider_id("paypal", paypal_order_id)
        if not payment:
            return {"ok": True}

        is_new = _save_event_idempotent(payment["id"], "paypal", event_id, event_type, event)
        if not is_new:
            return {"ok": True}

        _update_payment_and_order(payment["id"], payment["order_id"], "refunded", "refunded")

    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# Wompi endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/wompi/create-transaction", response_model=WompiTransactionOut, status_code=201)
@limiter.limit("5/minute", key_func=get_user_or_ip_key)
def create_wompi_transaction(request: Request, body: PaymentCreateIn, profile: dict = Depends(require_auth)):
    order = _verify_order_for_payment(str(body.order_id), profile["id"])
    order_id = order["id"]
    total_usd = float(order["total"])

    redirect_url = f"{settings.frontend_url}/pedido/{order_id}?provider=wompi"

    link_data = _wompi_create_payment_link(
        amount_usd=total_usd,
        redirect_url=redirect_url,
        description=f"Pedido MegaMarket #{order_id[:8].upper()}",
        reference=order_id,
    )

    link_id = link_data.get("id", "")
    link_url = link_data.get("url", "")

    if not link_id or not link_url:
        raise HTTPException(502, "Wompi no devolvió un link de pago válido")

    payment_id = _save_payment(order_id, "wompi", link_id, total_usd, "USD")

    return WompiTransactionOut(
        payment_id=payment_id,
        payment_link_id=link_id,
        redirect_url=link_url,
    )


@router.post("/wompi/webhook", status_code=200)
async def wompi_webhook(request: Request):
    raw_body = await request.body()

    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(400, "Payload inválido")

    if not _wompi_verify_signature(payload):
        logger.warning("Wompi webhook rechazado: firma inválida")
        raise HTTPException(401, "Firma de webhook inválida")

    event_type: str = payload.get("event", "")
    data: dict = payload.get("data", {})
    transaction: dict = data.get("transaction", {})
    payment_link: dict = data.get("payment_link", {})

    logger.info("Wompi webhook: %s", event_type)

    # event_id único para idempotencia = ID de la transacción
    event_id = transaction.get("id", "")
    if not event_id:
        return {"ok": True}

    # Buscar el payment por el ID del payment link
    link_id = payment_link.get("id", transaction.get("payment_link_id", ""))
    payment = _get_payment_by_provider_id("wompi", link_id) if link_id else None

    if not payment:
        logger.warning("Wompi webhook: pago no encontrado para link %s", link_id)
        return {"ok": True}

    is_new = _save_event_idempotent(payment["id"], "wompi", event_id, event_type, payload)
    if not is_new:
        return {"ok": True}

    tx_status = transaction.get("status", "")

    if tx_status == "APPROVED":
        _update_payment_and_order(payment["id"], payment["order_id"], "completed", "confirmed")
        logger.info("Orden %s confirmada (Wompi tx %s)", payment["order_id"], event_id)
    elif tx_status in ("DECLINED", "ERROR", "VOIDED"):
        # Pago fallido: orden se mantiene 'pending' para que el usuario pueda reintentar
        _update_payment_and_order(payment["id"], payment["order_id"], "failed", "pending")
        logger.info("Pago Wompi fallido (status=%s) para orden %s", tx_status, payment["order_id"])

    return {"ok": True}
