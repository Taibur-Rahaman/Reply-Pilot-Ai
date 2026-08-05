# User Guide

For business owners and staff using the ReplyPilot AI dashboard day to day. If you're setting up the platform itself (env vars, server config), see [`ADMIN_GUIDE.md`](ADMIN_GUIDE.md) instead.

## Signing in

Go to `/login` and sign in with the email/password your admin created for you (**Team** page → an admin adds you with a role). Sessions last 14 days; use **Log out** in the sidebar when done on a shared device.

On mobile, the sidebar collapses behind a **Menu** button — tap it to navigate, it closes automatically after you pick a page.

## Overview

Your home page after login. Shows today's chats, orders, revenue, conversion rate, open leads, and an estimated AI cost — all scoped to your business only (other tenants' data is never visible to you). The Messenger/Connect status checklist shows which integrations are configured.

## Inbox (Omnichannel chats)

All customer conversations — Messenger, WhatsApp, Instagram, website chat, Telegram — in one list. Click a thread to see the full history.

- **Take over / Leave**: click to pause the AI and reply yourself, or hand back to the AI. While you're handling a chat, the AI won't reply to that customer.
- **Notes**: add an internal note visible only to your team, saved to that customer's timeline.
- If a customer asks something the AI can't confidently answer, it will hand off to a human automatically and flag the thread.

## Leads / CRM

Leads come in automatically from the website contact form and from chats where a customer shares contact details. Move a lead through stages (New → Interested → Negotiating → Won/Lost) using the stage dropdown in the table.

## Orders

Orders the AI captures directly from chat (name, phone, product, quantity) land here automatically, or add one manually. Each order gets a tracking status and an invoice number — click **Print** on an order to get a printable invoice.

## Complaints

Flagged automatically when a customer's message matches complaint language (refund, broken item, wrong size, etc.), or add one manually. Complaints marked high/urgent priority automatically trigger a human handoff for that conversation.

## Catalog

Your product list — name, price, stock, size/color, category, image URL, and upsell/cross-sell/bundle relationships. The AI only ever recommends products from this catalog and never invents a price or stock level that isn't here.

## Recommendations

Configure which products the AI suggests as upsells, cross-sells, or bundles when a customer is deciding what to buy.

## Ecommerce

Connect WooCommerce, Shopify, WordPress, or OpenCart to sync your catalog (CSV/JSON import also supported).

## Knowledge

- **FAQ**: simple question/answer pairs the AI can quote directly.
- **Uploads**: longer documents (policies, size guides, etc.) get chunked and indexed for retrieval — the AI pulls relevant excerpts into its answer instead of guessing.
- **Prompt Builder**: your business name, greeting, personality, and system prompt. Guardrail toggles here (never invent stock, always confirm orders, escalate refunds/legal/anger, escalate below a confidence threshold) are hard rules the AI is instructed to always follow.

## Comments AI

Auto-moderates Facebook post comments: flags spam, can auto-reply, and can capture a lead from a comment.

## Connect

Link a real Facebook Page (requires your own Meta App credentials — ask your admin) or use **Demo Connect** to try the flow without one.

## Team

Admins can add teammates with a role:

| Role | Can do |
| --- | --- |
| `admin` | Everything for your business, including team management |
| `manager` | Inbox, CRM, catalog, knowledge — not team/billing |
| `moderator` | Inbox + comments moderation |
| `agent` | Inbox only |

## Analytics

Deeper breakdowns of leads by CRM stage, orders by tracking status, and the AI cost estimate.

## Getting help

WhatsApp/call the number in the site footer, or check the **Roadmap** page in the sidebar for what's shipped vs. planned.
