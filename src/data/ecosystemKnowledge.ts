/**
 * Klaviyo Ecommerce Agent — Skill Builder Ecosystem Knowledge
 *
 * Maps common customer support intents to platforms, identity chains,
 * specific API endpoint patterns, and agent design principles.
 * Injected into LLM prompts to enable accurate skill and tool call generation.
 */

export const ECOSYSTEM_KNOWLEDGE = `
## KNOWN USE CASE PLAYBOOKS

### WISMO — Where Is My Order / Order Tracking
Triggers: "where is my order", "track my package", "when will it arrive", "has my order shipped", "what's my tracking number", "order status"
Required integrations: Shopify + AfterShip (or ShipStation for label-centric merchants)
Identity chain: customer email → GET /admin/api/2024-01/customers/search.json?query=email:{email} → customer_id → GET /admin/api/2024-01/customers/{customer_id}/orders.json → order.fulfillments[].tracking_number + carrier_slug → GET https://api.aftership.com/v4/trackings/{slug}/{tracking_number}
Tool calls (in order):
  1. Search Customer [GET] https://{shop}.myshopify.com/admin/api/2024-01/customers/search.json?query=email:{email}
  2. Get Customer Orders [GET] https://{shop}.myshopify.com/admin/api/2024-01/customers/{customer_id}/orders.json?status=any
  3. Get Tracking Status [GET] https://api.aftership.com/v4/trackings/{slug}/{tracking_number}
Design patterns: Read-only — no write operations. If order is unfulfilled, tell customer it hasn't shipped yet. If AfterShip unavailable, fall back to tracking URL from Shopify fulfillment object.
Escalation triggers: tracking status "exception" or "failed_attempt"
Merchant-specific gaps to ask: none — this is fully covered by the playbook

### Returns
Triggers: "return", "send back", "refund my order", "exchange", "return my item", "how do I return", "start a return"
Required integrations: Shopify (order lookup + eligibility) + Loop Returns (return management)
Identity chain: customer email → Shopify order search → order_id + order_name → Loop Returns query by order_name → return_id
Tool calls (in order):
  1. Look Up Order [GET] https://{shop}.myshopify.com/admin/api/2024-01/orders.json?email={email}&status=any
  2. Check Existing Returns [GET] https://api.loopreturns.com/api/v1/warehouse/return?order_name={order_name}
  3. Create Return Deep Link [POST] https://api.loopreturns.com/api/v1/return/deeplink
Design patterns: Read-before-write. Check if return already exists before creating. Confirm with customer before submitting any return. Check order date against merchant return window before proceeding.
Escalation triggers: outside return window, non-returnable items
Merchant-specific gaps to ask: What is your return window (e.g. 30 days)? Should the agent handle exchanges or escalate those to a human?

### Subscriptions — Pause, Skip, Cancel, Swap, Change Frequency
Triggers: "cancel my subscription", "skip next order", "pause my subscription", "change frequency", "swap product", "reschedule delivery", "update my subscription"
Required integrations: ReCharge (or Skio — ask the merchant which one)
Identity chain (ReCharge): customer email → GET https://api.rechargeapps.com/customers?email={email} → recharge_customer_id → GET https://api.rechargeapps.com/subscriptions?customer_id={recharge_customer_id} → subscription_id; for skip: → GET https://api.rechargeapps.com/charges?customer_id={recharge_customer_id}&status=QUEUED → charge_id
Tool calls (ReCharge) vary by sub-intent:
  Cancel:
    1. Find Recharge Customer [GET] https://api.rechargeapps.com/customers?email={email}
    2. List Subscriptions [GET] https://api.rechargeapps.com/subscriptions?customer_id={recharge_customer_id}
    3. Cancel Subscription [POST] https://api.rechargeapps.com/subscriptions/{subscription_id}/cancel
  Skip next charge:
    1. Find Recharge Customer [GET] https://api.rechargeapps.com/customers?email={email}
    2. List Upcoming Charges [GET] https://api.rechargeapps.com/charges?customer_id={recharge_customer_id}&status=QUEUED
    3. Skip Charge [POST] https://api.rechargeapps.com/charges/{charge_id}/skip
  Change frequency:
    1. Find Recharge Customer [GET] https://api.rechargeapps.com/customers?email={email}
    2. List Subscriptions [GET] https://api.rechargeapps.com/subscriptions?customer_id={recharge_customer_id}
    3. Update Subscription [PUT] https://api.rechargeapps.com/subscriptions/{subscription_id}
Design patterns: Always list subscriptions first and confirm which one before making changes. For cancellations, consider a retention offer first. Confirm with customer before executing any write.
Escalation triggers: customer with long tenure requesting cancel (offer retention discount first)
Merchant-specific gaps to ask: Do you use ReCharge or Skio? Should the agent offer a retention discount or pause before allowing cancellation?

### Order Management — Cancel or Refund an Order
Triggers: "cancel my order", "I want to cancel", "get a refund", "refund my order", "I changed my mind"
Required integrations: Shopify
Identity chain: customer email → GET /admin/api/2024-01/orders.json?email={email}&status=any → order_id + financial_status + fulfillment_status
Tool calls (cancel):
  1. Look Up Orders [GET] https://{shop}.myshopify.com/admin/api/2024-01/orders.json?email={email}&status=any
  2. Cancel Order [POST] https://{shop}.myshopify.com/admin/api/2024-01/orders/{order_id}/cancel.json
Tool calls (refund — two-step required by Shopify):
  1. Look Up Orders [GET] https://{shop}.myshopify.com/admin/api/2024-01/orders.json?email={email}&status=any
  2. Calculate Refund [POST] https://{shop}.myshopify.com/admin/api/2024-01/orders/{order_id}/refunds/calculate.json
  3. Create Refund [POST] https://{shop}.myshopify.com/admin/api/2024-01/orders/{order_id}/refunds.json
Design patterns: Order cancellation is irreversible — only cancel if unfulfilled or partially fulfilled. Always confirm with customer before canceling. Refund requires calculate step first. Escalate refunds above merchant-defined threshold.
Escalation triggers: order already shipped (cannot cancel), refund above threshold, customer mentions dispute or chargeback
Merchant-specific gaps to ask: What is your refund dollar threshold for escalating to a human agent?

### Loyalty — Points Balance and Rewards
Triggers: "how many points do I have", "check my rewards", "loyalty points", "VIP status", "redeem points", "referral link"
Required integrations: Smile.io or LoyaltyLion (ask merchant which one)
Identity chain: customer email → loyalty platform customer lookup by email → points_balance, vip_tier, referral_url
Tool calls (Smile.io):
  1. Look Up Loyalty Member [GET] https://api.smile.io/v1/members?email={email}
Tool calls (LoyaltyLion):
  1. Look Up Loyalty Member [GET] https://api.loyaltylion.com/v2/customers?email={email}
Design patterns: Read-only. Good for preloading context at conversation start. Loyalty API access may require Plus/Enterprise plan for Smile.io.
Merchant-specific gaps to ask: Do you use Smile.io or LoyaltyLion?

### Reviews — Request or Look Up a Review
Triggers: "leave a review", "write a review", "review my purchase", "product reviews", "how do I review"
Required integrations: Yotpo or Judge.me or Okendo (ask merchant which one) + Shopify (for product_id)
Identity chain: customer email → Shopify order → product_id → review platform review creation
Tool calls (Yotpo):
  1. Look Up Order [GET] https://{shop}.myshopify.com/admin/api/2024-01/orders.json?email={email}&status=any
  2. Create Review Request [POST] https://api.yotpo.com/v1/widget/{app_key}/products/{product_id}/reviews
Merchant-specific gaps to ask: Do you use Yotpo, Judge.me, or Okendo?

### Customer Profile — Klaviyo Profile Lookup and Update
Triggers: "update my email", "change my address", "update my profile", "unsubscribe", "manage my account"
Required integrations: Klaviyo (built-in to the agent platform)
Identity chain: customer email → GET https://a.klaviyo.com/api/profiles/?filter=equals(email,"{email}") → profile_id
Tool calls:
  1. Get Profile [GET] https://a.klaviyo.com/api/profiles/?filter=equals(email,"{email}")
  2. Update Profile [PATCH] https://a.klaviyo.com/api/profiles/{profile_id}/

## IDENTITY RESOLUTION PRINCIPLES
- Always start with email → Klaviyo profile, then branch to platform-specific IDs
- Never assume a single order if multiple exist — ask the customer to confirm which one
- If Shopify returns no customer, try searching orders directly by email before giving up

## AGENT DESIGN PATTERNS (always apply these)
- Read Before Write: Always fetch current state before making changes
- Confirmation Gate: Present what you're about to do and get explicit customer "yes" before any write operation
- Graceful Degradation: If a partner API errors, surface what data you do have and offer alternatives
- Idempotency Check: Before creating a return or canceling, check if it already happened
- Escalation: Some actions must never be fully automated (large refunds, disputes, cancellations with long tenure)
`;

/**
 * Given a list of selected integration names, return the relevant playbook entries
 * from ECOSYSTEM_KNOWLEDGE as a formatted string for prompt injection.
 */
export function resolveEcosystemContext(integrationNames: string[]): string {
  const normalized = integrationNames.map((n) => n.toLowerCase());

  const playbooks: { keywords: string[]; label: string }[] = [
    { keywords: ['shopify', 'aftership', 'shipstation'], label: 'WISMO — Where Is My Order / Order Tracking' },
    { keywords: ['loop returns'], label: 'Returns' },
    { keywords: ['recharge', 'skio'], label: 'Subscriptions — Pause, Skip, Cancel, Swap, Change Frequency' },
    { keywords: ['smile.io', 'loyaltylion'], label: 'Loyalty — Points Balance and Rewards' },
    { keywords: ['yotpo', 'judge.me', 'okendo', 'stamped.io'], label: 'Reviews — Request or Look Up a Review' },
    { keywords: ['klaviyo'], label: 'Customer Profile — Klaviyo Profile Lookup and Update' },
  ];

  // Always include Order Management if Shopify is selected
  const shopifySelected = normalized.includes('shopify');

  const matchedLabels = new Set<string>();
  for (const playbook of playbooks) {
    if (playbook.keywords.some((k) => normalized.some((n) => n.includes(k)))) {
      matchedLabels.add(playbook.label);
    }
  }
  if (shopifySelected) {
    matchedLabels.add('Order Management — Cancel or Refund an Order');
  }

  if (matchedLabels.size === 0) {
    return '';
  }

  // Extract matched sections from ECOSYSTEM_KNOWLEDGE
  const sections = ECOSYSTEM_KNOWLEDGE.split(/\n### /).slice(1); // split on section headers
  const matched = sections.filter((section) => {
    const firstLine = section.split('\n')[0];
    return [...matchedLabels].some((label) => firstLine.trim().startsWith(label));
  });

  if (matched.length === 0) {
    return '';
  }

  const principles = ECOSYSTEM_KNOWLEDGE.split('## IDENTITY RESOLUTION PRINCIPLES')[1] ?? '';

  return (
    'The following API patterns apply to the selected integrations:\n\n' +
    matched.map((s) => `### ${s.trim()}`).join('\n\n') +
    '\n\nAlso apply these principles:\n' +
    principles
  );
}
