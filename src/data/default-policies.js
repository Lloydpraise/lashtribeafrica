// Starting text for the Shipping & Preorders policy. The live text is edited in
// Admin → Policies (stored in site_settings.policy_shipping); this is what the page shows
// until that field has text, and what migration 0014 puts there if it was blank.
//
// Format: plain text. A line starting with "# " is a heading, lines starting with "- " form
// a bullet list, and blank lines separate paragraphs.

export const SHIPPING_POLICY = `# How we ship
Lashtribe Africa is a preorder wholesale platform. We don't keep stock here: every product is ordered from our suppliers for you, and orders are grouped into shipping batches so you get wholesale prices.

# Shipping batches
Our suppliers ship twice a month, around the middle and the end of the month. The date of the next batch is shown on the homepage, at checkout and on your order confirmation.

Every order joins the first open batch that is more than 7 days away. If the next batch is 7 days away or less, it is already closed to new orders and yours goes into the batch after it. For example, an order placed 4 days before a batch ships with the following batch, about two weeks later.

# Payment
You pay when you place your order. After you order, we contact you straight away to confirm payment by M-Pesa or card. Your order is secured in its batch once payment is confirmed.

# Shipping fees and delivery
- The product total at checkout does not include shipping.
- The shipping fee is confirmed with you directly, based on your delivery area.
- When a free-shipping offer is active, it is applied automatically once your order meets the minimum.
- When your batch arrives, we contact you to arrange delivery.

# Changing or cancelling an order
Contact us as soon as you can if you need to change or cancel an order. Orders can be changed or cancelled until their batch has been placed with our suppliers. After that the products are already ordered and the order can't be changed.

# Questions
Reach us on the Contact page and we'll help.`;
