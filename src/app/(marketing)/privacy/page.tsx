import { LegalPage } from "@/components/marketing/legal-page";

export const metadata = {
  title: "Privacy",
  description:
    "How Madetom collects, uses and protects the data of your business, your staff and your customers.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="5 November 2026"
      intro="Madetom runs a point of sale, inventory and reporting system for Ghanaian businesses. That means we handle business records, staff details and customer contact details on behalf of the businesses that use it. This page sets out, in plain language, what we collect and why."
      sections={[
        {
          heading: "What we collect",
          body: [
            "Account and organisation details: your name, business name, business type, location, phone number and email address, plus the plan your organisation is on.",
            "Staff details: the name, phone number, optional email address and role of every person invited to your workspace, together with a securely hashed password.",
            "Trading records: products, stock levels, sales, refunds, payments, purchases, expenses and customer records that your team enters into the system.",
            "Technical records: sign-in events, the audit trail of who changed what, and limited device and network information used for session security and rate limiting.",
            "SMS records: the destination number, message content, provider and delivery status of messages sent through Madetom, along with the wallet balance used to pay for them.",
          ],
        },
        {
          heading: "Why we collect it",
          body: [
            "To operate the product: calculate stock, totals, profit and tax correctly, and produce the receipts and reports your business and accountant rely on.",
            "To keep accounts secure: hashing passwords, detecting repeated failed sign-in attempts, and recording who performed sensitive actions such as refunds and stock adjustments.",
            "To deliver the notifications you asked for: onboarding invitations, password reset codes, stock alerts and daily summaries are sent by SMS to the number on file.",
            "To support the business: when you contact SamTech Labs, we can see the organisation and activity relevant to your question.",
          ],
        },
        {
          heading: "Who can see your data",
          body: [
            "Within your organisation, access follows the role you were given. A cashier can sell at the till but cannot open the financial reports or team management screens. Only the owner can change permissions.",
            "SamTech Labs staff can access organisation data when you ask us to resolve a support issue, or where the law requires it. Every administrative action is written to the audit log.",
            "We do not sell your data, and we do not use your business records to build advertising profiles.",
          ],
        },
        {
          heading: "Service providers",
          body: [
            "Madetom relies on a small number of infrastructure providers: the database host, the application host, the SMS delivery provider, and object storage if you upload images. Each receives only the data it needs to do its job.",
            "SMS messages are sent through a Ghanaian mobile network aggregator. The recipient number and message content are shared with that provider for delivery. Passwords, session tokens and reset codes are redacted before the message is logged.",
          ],
        },
        {
          heading: "Retention and deletion",
          body: [
            "Trading records are kept for as long as your organisation is active, because they are your accounting records. They are not deleted while your subscription is running.",
            "Session records, rate-limit counters and expired password reset codes are removed automatically once they expire.",
            "If your organisation is closed, ask us in writing and we will export and then delete your records, except where retention is required by law.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            "You can ask what personal data we hold about you, request a correction, or ask us to delete it where we are not required to keep it. Contact us and we will respond within 30 days.",
            "You can export your sales, stock and expense data at any time from the reports screen using CSV.",
          ],
        },
        {
          heading: "Security",
          body: [
            "Passwords are hashed with bcrypt and never stored in plain text. Invitation links and password reset codes are stored only as hashes, are single use, and expire.",
            "Sessions use HTTP-only cookies. Every business record carries the organisation it belongs to, and the server checks that on every request, so one business can never read another business's data.",
            "No system is perfectly secure. If we discover a breach that affects your data, we will tell you and the relevant authority as required by Ghana's Data Protection Act, 2012 (Act 843).",
          ],
        },
        {
          heading: "Contact",
          body: [
            "Data protection questions go to SamTech Labs. Write to hello@samtechlabs.com with the subject line 'Data protection' and we will respond in writing.",
          ],
        },
      ]}
    />
  );
}
