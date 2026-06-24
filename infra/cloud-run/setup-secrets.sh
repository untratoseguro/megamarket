#!/usr/bin/env bash
# setup-secrets.sh
# Crea todos los secretos de MegaMarket en Google Secret Manager.
# Ejecutar UNA VEZ antes del primer deploy.
#
# Uso:
#   export PROJECT_ID=tu-project-id
#   export SA_EMAIL=megamarket-api@tu-project-id.iam.gserviceaccount.com
#   bash infra/cloud-run/setup-secrets.sh
#
# Prerequisitos:
#   - gcloud autenticado con permisos de admin en el proyecto
#   - Secret Manager API habilitada: gcloud services enable secretmanager.googleapis.com

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Debes exportar PROJECT_ID}"
SA_EMAIL="${SA_EMAIL:?Debes exportar SA_EMAIL}"

echo "Proyecto: $PROJECT_ID"
echo "Service Account: $SA_EMAIL"
echo ""

# Funcion: crea el secreto si no existe, agrega una version nueva si ya existe
create_or_update_secret() {
  local name="$1"
  local value="$2"

  if gcloud secrets describe "$name" --project="$PROJECT_ID" &>/dev/null; then
    echo "  Actualizando version de '$name'..."
    echo -n "$value" | gcloud secrets versions add "$name" \
      --project="$PROJECT_ID" \
      --data-file=-
  else
    echo "  Creando secreto '$name'..."
    echo -n "$value" | gcloud secrets create "$name" \
      --project="$PROJECT_ID" \
      --replication-policy=automatic \
      --data-file=-
  fi
}

echo "=== Creando secretos en Secret Manager ==="
echo ""
echo "Necesitaras los siguientes valores. Si no los tienes a mano, edita este script"
echo "o usa: gcloud secrets versions add NOMBRE --data-file=archivo.txt"
echo ""

# Solicitar valores interactivamente si no estan en el entorno
read_secret() {
  local var_name="$1"
  local prompt="$2"
  if [ -z "${!var_name:-}" ]; then
    read -rsp "$prompt: " "$var_name"
    echo ""
  fi
}

read_secret SUPABASE_SERVICE_ROLE_KEY  "SUPABASE_SERVICE_ROLE_KEY (service_role key de Supabase)"
read_secret SUPABASE_JWT_SECRET         "SUPABASE_JWT_SECRET (JWT Secret del dashboard Supabase -> API Settings)"
read_secret PAYPAL_CLIENT_ID            "PAYPAL_CLIENT_ID"
read_secret PAYPAL_CLIENT_SECRET        "PAYPAL_CLIENT_SECRET"
read_secret PAYPAL_WEBHOOK_ID           "PAYPAL_WEBHOOK_ID (ID del webhook registrado en PayPal Developer)"
read_secret WOMPI_PRIVATE_KEY           "WOMPI_PRIVATE_KEY"
read_secret WOMPI_EVENT_SECRET          "WOMPI_EVENT_SECRET (Llave de eventos del dashboard Wompi)"
read_secret ANTHROPIC_API_KEY           "ANTHROPIC_API_KEY (sk-ant-...)"

echo ""
echo "=== Guardando secretos ==="

create_or_update_secret "supabase-service-role-key" "$SUPABASE_SERVICE_ROLE_KEY"
create_or_update_secret "supabase-jwt-secret"        "$SUPABASE_JWT_SECRET"
create_or_update_secret "paypal-client-id"           "$PAYPAL_CLIENT_ID"
create_or_update_secret "paypal-client-secret"       "$PAYPAL_CLIENT_SECRET"
create_or_update_secret "paypal-webhook-id"          "$PAYPAL_WEBHOOK_ID"
create_or_update_secret "wompi-private-key"          "$WOMPI_PRIVATE_KEY"
create_or_update_secret "wompi-event-secret"         "$WOMPI_EVENT_SECRET"
create_or_update_secret "anthropic-api-key"          "$ANTHROPIC_API_KEY"

echo ""
echo "=== Otorgando acceso al Service Account ==="
echo "(Secret Manager Secret Accessor en todos los secretos)"

SECRETS=(
  supabase-service-role-key
  supabase-jwt-secret
  paypal-client-id
  paypal-client-secret
  paypal-webhook-id
  wompi-private-key
  wompi-event-secret
  anthropic-api-key
)

for secret in "${SECRETS[@]}"; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet
  echo "  $secret -> $SA_EMAIL [OK]"
done

echo ""
echo "=== Configuracion de Workload Identity Federation (GitHub Actions) ==="
echo "Ejecutar los siguientes comandos una sola vez para habilitar autenticacion keyless:"
echo ""
cat <<'EOF'
export POOL_ID=github-pool
export PROVIDER_ID=github-provider
export REPO=tu-usuario/megamarket       # <- reemplazar

# Crear pool
gcloud iam workload-identity-pools create "$POOL_ID" \
  --project="$PROJECT_ID" \
  --location=global \
  --display-name="GitHub Actions Pool"

# Crear provider OIDC
gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location=global \
  --workload-identity-pool="$POOL_ID" \
  --display-name="GitHub Provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${REPO}'"

# Obtener el nombre completo del provider (va en GCP_WORKLOAD_IDENTITY_PROVIDER)
gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location=global \
  --workload-identity-pool="$POOL_ID" \
  --format="value(name)"

# Vincular el SA con el pool
POOL_NAME=$(gcloud iam workload-identity-pools describe "$POOL_ID" \
  --project="$PROJECT_ID" --location=global --format="value(name)")

gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_NAME}/attribute.repository/${REPO}"
EOF

echo ""
echo "=== Roles minimos necesarios para el SA de GitHub Actions ==="
echo "roles/run.admin              (deploy a Cloud Run)"
echo "roles/artifactregistry.writer (push de imagenes Docker)"
echo "roles/iam.serviceAccountUser  (actuar como el SA de Cloud Run)"
echo ""
echo "Setup completo."
