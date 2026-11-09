import { LegalPage } from "@/components/marketing/legal-page";

export const metadata = {
  title: "Terms",
  description: "The terms that apply when a business uses Madetom.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="5 November 2026"
      intro="These terms cover how a business uses Madetom, the platform operated by SamTech Labs. Access is granted per organisation, not per person: your organisation's owner accepts the full service agreement, and your team is bound by these terms when they use the system."
      sections={[
        {
          heading: "Who can use Madetom",
          body: [
            "Madetom is a business system. There is no public self-service sign-up. SamTech Labs creates each organisation, confirms the plan with the owner, and issues a secure invitation to the owner's phone number.",
            "Only the organisation owner and staff the owner has invited may use Madetom. You agree not to share your password or invite link, and not to let someone else trade on your account.",
          ],
        },
        {
          heading: "Your account and your people",
          body: [
            "You are responsible for the accuracy of the information your team enters, including prices, tax rates, stock counts and customer details.",
            "The owner of an organisation is responsible for assigning roles and removing access when a member of staff leaves. Every action taken in Madetom is recorded against the person who took it.",
          ],
        },
        {
          heading: "Payments and money",
          body: [
            "Madetom records payments. It does not move your money unless a payment provider is explicitly connected and configured for that purpose. A Mobile Money, bank transfer or card entry is a record that the payment was made — you remain responsible for the settlement itself.",
            "Refunds and stock adjustments are recorded in the audit trail. Madetom does not guarantee that a physical refund, transfer or settlement has completed; that evidence lives with your payment provider and your accounts.",
          ],
        },
        {
          heading: "Plans, limits and SMS credits",
          body: [
            "Each plan sets limits on staff, branches, products, monthly transactions and SMS credits. Madetom enforces these limits in the product, so a workspace cannot exceed its plan.",
            "SMS credits are consumed when Madetom sends a message on your behalf. Credits reserved for a failed send are returned to your wallet.",
            "Subscription billing is arranged by SamTech Labs directly. Madetom does not collect card details on this website.",
          ],
        },
        {
          heading: "Availability and maintenance",
          body: [
            "We aim to keep Madetom available during trading hours. We may schedule maintenance, and we will show a notice in the workspace when we do. During maintenance, trading screens may be unavailable, but recorded data is never altered.",
            "We do not promise uninterrupted service, and we are not liable for indirect losses such as lost profit arising from downtime or connectivity failure.",
          ],
        },
        {
          heading: "Acceptable use",
          body: [
            "Do not use Madetom to record anything unlawful, to harass individuals, or to store content you have no right to store.",
            "Do not attempt to access another organisation's data, probe the platform's security without written permission, or automate bulk extraction of data belonging to other businesses.",
          ],
        },
        {
          heading: "Your data",
          body: [
            "Your trading records belong to your business. SamTech Labs keeps them so the product can work, and you can export them at any time. The privacy policy describes exactly what we hold and who can see it.",
            "If your subscription ends, we will export and then delete your records on request, except where we are required to keep them by law.",
          ],
        },
        {
          heading: "Ending the service",
          body: [
            "Either side may end the service by giving 30 days' written notice, or immediately if the other side materially breaches these terms and does not fix it within 14 days of being told about it.",
            "We may suspend an organisation immediately where required by law, to protect the platform or other customers, or where the service is being used to commit fraud. We will tell you the reason and what is needed to restore access.",
          ],
        },
        {
          heading: "Liability",
          body: [
            "Madetom is provided on an 'as available' basis to the extent permitted by law. Our total liability to you for any claim is limited to the fees you paid for the service in the 12 months before the claim.",
            "Nothing in these terms limits liability that cannot lawfully be limited.",
          ],
        },
        {
          heading: "Contact",
          body: [
            "Questions about these terms go to SamTech Labs at hello@samtechlabs.com.",
          ],
        },
      ]}
    />
  );
}
