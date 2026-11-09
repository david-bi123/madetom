This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## SMS delivery

Madetom sends SMS through a separate Python service in [`sms-service/`](./sms-service/README.md).
The Next.js app calls it with a server-only bearer token; no SMS credentials
reach the browser.

```env
SMS_PROVIDER=python
SMS_SERVICE_URL=https://sms.internal.example.com
SMS_SERVICE_API_KEY=<shared secret>
SMS_SENDER_ID=Madetom
```

For local development, `SMS_PROVIDER=log` records messages without sending
them. The Python service also has a `SMS_BACKEND=log` mode.

The service uses the `sendsms` package as requested. The published package is a
Twilio wrapper: it exposes `sendSMS(message, phone)`, not
`send_sms(phone, message)`, and needs Twilio credentials plus a sending number.
The service documents and adapts that interface; see
[`sms-service/README.md`](./sms-service/README.md) before deploying.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
