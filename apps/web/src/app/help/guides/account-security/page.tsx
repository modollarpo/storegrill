import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig, supportEmailFor } from '@/lib/region-content';
import { GuideLayout } from '@/components/guides/GuideLayout';
import { GuideCallout, GuideSection, GuideSteps } from '@/components/guides/GuideSection';
import { CUSTOMER_GUIDES } from '@/lib/guides';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `Account & security — ${cfg.name}`,
    description: 'Create an account, reset a password, turn on two-factor authentication, and spot phishing attempts.',
    path: '/help/guides/account-security',
    regionKey,
  });
}

export default async function AccountSecurityPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const related = CUSTOMER_GUIDES.filter(g => g.slug !== 'account-security').slice(0, 4);

  return (
    <GuideLayout
      eyebrow="Customer guide"
      title="Account & security"
      description="Create an account, reset a password, turn on two-factor authentication, and spot phishing attempts."
      backHref="/help/guides"
      backLabel="All customer guides"
      related={related.map(g => ({ href: g.path, title: g.title, description: g.description }))}
    >
      <GuideSection title="Creating an account">
        <p>Sign up with your email address and a strong password. Once verified, you get faster checkout, order history, one-click returns on <Link href="/account/orders" className="text-ember font-semibold hover:text-ember-deep">My Orders</Link> and personalised delivery estimates for {cfg.name}. The account icon appears in the top-right of every page.</p>
        <GuideSteps
          items={[
            <>Choose an account password you do not use elsewhere — at least 12 characters.</>,
            <>Confirm the verification link we email you.</>,
            <>Add your delivery address once; it will be reusable at checkout.</>,
          ]}
        />
      </GuideSection>

      <GuideSection title="Reset a forgotten password">
        <GuideSteps
          items={[
            <>On the sign-in form, choose Forgotten password.</>,
            <>Enter the email on your account and check your inbox for the reset link.</>,
            <>Choose a new password and sign in. The reset link expires, so click it promptly.</>,
          ]}
        />
        <p>Reset emails can take a few minutes. Check spam and junk folders, and make sure you are using the email address originally registered.</p>
      </GuideSection>

      <GuideSection title="Two-factor authentication">
        <p>2FA adds a one-time code to every sign-in from a new device, so a stolen password alone is not enough. Turn it on in your account security settings: scan the QR code into an authenticator app and enter the code shown. Keep the app installed — support cannot bypass 2FA for security reasons.</p>
        <GuideCallout title="Sign out on shared devices">
          Always sign out after shopping on a shared or public computer, and revisit this guide if you receive password-reset or 2FA emails you did not request — a quick password change resolves it.
        </GuideCallout>
      </GuideSection>

      <GuideSection title="Spotting phishing">
        <p>Storegrill will never email, call or message you asking for your password, card CVV or one-time codes. Legitimate emails come from storegrill.com addresses and link to storegrill.com pages. If a message asks you to pay outside the checkout, update payment details off-platform, or claims a prize you did not enter, report it to <span className="font-mono bg-black/5 py-0.5 px-1.5 rounded">{supportEmailFor(regionKey)}</span>.</p>
      </GuideSection>
    </GuideLayout>
  );
}