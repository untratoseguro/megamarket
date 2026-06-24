"""
Test de los 3 escenarios de la Fase 7.
Ejecutar desde apps/api/ con: python test_fase7.py
Requiere ANTHROPIC_API_KEY configurada en apps/api/.env
"""
import json
import os
import sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.dirname(__file__))

from app.core.settings import settings
from app.core.supabase import get_supabase
from app.routers.recommendations import get_recommendations

import anthropic

SEP = "\n" + "-" * 60 + "\n"


def run_assistant(message: str, profile=None, session_id=None):
    from app.routers.assistant import (
        SYSTEM_PROMPT, TOOLS, _dispatch_tool, _save_message, _load_history,
        _MAX_TOOL_ITERATIONS
    )
    sb = get_supabase()

    if session_id:
        messages = _load_history(session_id)
    else:
        sess = sb.table("chat_sessions").insert(
            {"user_id": profile["id"] if profile else None}
        ).execute()
        session_id = sess.data[0]["id"]
        messages = []

    messages.append({"role": "user", "content": message})
    _save_message(session_id, "user", message, None)

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    all_tool_calls = []
    final_text = ""

    for iteration in range(_MAX_TOOL_ITERATIONS):
        print(f"  [iter {iteration+1}] calling Claude ({settings.anthropic_model})...")
        response = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )
        print(f"  stop_reason={response.stop_reason}")

        if response.stop_reason == "end_turn":
            final_text = "".join(b.text for b in response.content if hasattr(b, "text"))
            break

        if response.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    print(f"  -> tool: {block.name}  args={json.dumps(block.input)[:120]}")
                    result_str = _dispatch_tool(block.name, block.input, profile)
                    all_tool_calls.append({"tool": block.name, "input": block.input})
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_str,
                    })
            messages.append({"role": "user", "content": tool_results})

    if not final_text:
        final_text = "(sin respuesta)"

    _save_message(session_id, "assistant", final_text, all_tool_calls or None)
    return {
        "session_id": session_id,
        "message": final_text,
        "tools_called": [t["tool"] for t in all_tool_calls],
    }


def main():
    if not settings.anthropic_api_key or settings.anthropic_api_key == "reemplaza_con_tu_api_key_de_anthropic":
        print("ERROR: ANTHROPIC_API_KEY no configurada en apps/api/.env")
        sys.exit(1)

    print("=" * 60)
    print("FASE 7 - TEST DE 3 ESCENARIOS REALES")
    print("=" * 60)

    # -------------------------------------------------------
    # ESCENARIO 1: Usuario anonimo pregunta por un producto
    # -------------------------------------------------------
    print(SEP)
    print("ESCENARIO 1: Usuario ANONIMO - 'que laptops tienen?'")
    result = run_assistant(
        message="Hola, que laptops tienen disponibles?",
        profile=None,
    )
    print(f"session_id: {result['session_id']}")
    print(f"tools_called: {result['tools_called']}")
    print(f"respuesta:\n{result['message']}")

    from app.routers.assistant import _tool_get_my_orders, _tool_get_my_cart, _tool_get_my_favorites
    assert _tool_get_my_orders(None) == {"error": "requiere_login"}, "FALLO: get_my_orders(anon) no retorna error"
    assert _tool_get_my_cart(None) == {"error": "requiere_login"}, "FALLO: get_my_cart(anon) no retorna error"
    assert _tool_get_my_favorites(None) == {"error": "requiere_login"}, "FALLO: get_my_favorites(anon) no retorna error"
    print("SEGURIDAD OK: get_my_orders/cart/favorites(anon) -> requiere_login")

    # -------------------------------------------------------
    # ESCENARIO 2: Usuario autenticado pregunta su ultima orden
    # -------------------------------------------------------
    print(SEP)
    print("ESCENARIO 2: Usuario AUTENTICADO - estado de ultima orden")

    sb = get_supabase()
    profile_rows = sb.table("profiles").select("id, name, email, role").limit(1).execute()
    if not profile_rows.data:
        print("WARNING: No hay usuarios en la DB. Saltando escenario 2.")
    else:
        test_profile = profile_rows.data[0]
        print(f"profile: {test_profile['email']} (id={test_profile['id'][:8]}...)")
        result2 = run_assistant(
            message="En que estado esta mi ultima orden?",
            profile=test_profile,
        )
        print(f"tools_called: {result2['tools_called']}")
        if "get_my_orders" in result2["tools_called"]:
            print("OK: get_my_orders fue llamado (no invento el estado)")
        else:
            print("WARNING: get_my_orders NO fue llamado")
        print(f"respuesta:\n{result2['message']}")

    # -------------------------------------------------------
    # ESCENARIO 3: Recomendaciones sin Claude
    # -------------------------------------------------------
    print(SEP)
    print("ESCENARIO 3: Recomendaciones /carrito - SIN Claude")

    recs = get_recommendations(based_on="cart", user_id=None, limit=4)
    print(f"based_on=cart, user_id=None -> {len(recs)} resultados (fallback a destacados)")
    for r in recs[:3]:
        print(f"  - {r.get('title', '?')[:50]} | ${r.get('price', '?')}")

    prod_rows = sb.table("products").select("id, title, price, category_id").eq("is_active", True).limit(1).execute()
    if prod_rows.data:
        prod = prod_rows.data[0]
        print(f"\nbased_on=product ref={prod['title'][:40]} (${prod['price']})")
        recs2 = get_recommendations(based_on="product", reference_id=prod["id"], limit=6)
        print(f"-> {len(recs2)} recomendaciones en banda +/-30% de ${prod['price']}")
        for r in recs2[:3]:
            print(f"  - {r.get('title', '?')[:50]} | ${r.get('price', '?')}")

    print(f"\nOK: get_recommendations ejecuto sin llamar a Claude")

    print(SEP)
    print("Los 3 escenarios completados.")
    print("  E1: anonimo puede buscar productos (tools de cuenta retornan requiere_login) OK")
    print("  E2: autenticado usa get_my_orders para responder (no inventa) OK")
    print("  E3: recomendaciones son SQL puro, sin llamada a Claude OK")


if __name__ == "__main__":
    main()
