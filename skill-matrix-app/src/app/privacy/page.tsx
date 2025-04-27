"use client";
import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
  const router = useRouter();
  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleGoToDashboard();
    }
  };
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <button
        type="button"
        onClick={handleGoToDashboard}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-label="Back to Dashboard"
        className="flex items-center gap-2 mb-6 px-3 py-2 rounded bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition"
      >
        <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span className="sr-only">Back</span>
      </button>
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="prose max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p>
            This Privacy Policy describes how Cosoto Group (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects, uses, and protects personal data in accordance with international data protection standards and applicable privacy laws. This policy applies specifically to our professional development and skills assessment software, ComPilot.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Legal Basis for Data Processing</h2>
          <p>
            We process personal data in accordance with international privacy standards and applicable laws. Our processing activities are based on:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>Fulfillment of employment-related obligations</li>
            <li>Legitimate interests in professional development</li>
            <li>Explicit consent where required</li>
            <li>Compliance with workplace agreements and regulations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Professional Development Focus</h2>
          <p>
            Our software is designed exclusively for professional development purposes. We collect and process only data that is necessary for:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>Skills assessment and development tracking</li>
            <li>Training and certification management</li>
            <li>Career growth planning</li>
            <li>Team capability enhancement</li>
            <li>Professional qualification documentation</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Data Protection Principles</h2>
          <p>
            We adhere to the following principles in all our data processing activities:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>Lawfulness, fairness, and transparency</li>
            <li>Purpose limitation to professional development</li>
            <li>Data minimization and accuracy</li>
            <li>Storage limitation and integrity</li>
            <li>Confidentiality and security</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Security Measures</h2>
          <p>
            We implement comprehensive technical and organizational measures:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>Advanced encryption protocols</li>
            <li>Strict access control systems</li>
            <li>Regular security assessments</li>
            <li>Continuous monitoring and updates</li>
            <li>Staff data protection training</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
          <p>
            We retain personal data only for the duration necessary to fulfill our professional development purposes:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>Active employment period plus required retention period</li>
            <li>Legal compliance requirements</li>
            <li>Professional certification validity periods</li>
            <li>Training and development cycle durations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Individual Rights</h2>
          <p>
            We respect and protect the following fundamental rights:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>Access to personal information</li>
            <li>Correction of inaccurate data</li>
            <li>Deletion of unnecessary data</li>
            <li>Restriction of processing</li>
            <li>Data portability</li>
            <li>Objection to processing</li>
            <li>Withdrawal of consent</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. International Data Protection</h2>
          <p>
            For international data handling, we ensure:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>Compliance with international privacy standards</li>
            <li>Appropriate safeguards for data transfers</li>
            <li>Protection equivalent to origin country</li>
            <li>Transparent processing across borders</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Prohibited Uses</h2>
          <p>
            The following uses of personal data are strictly prohibited:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>Any form of discrimination or unfair treatment</li>
            <li>Unauthorized surveillance or monitoring</li>
            <li>Commercial exploitation</li>
            <li>Any processing beyond professional development purposes</li>
            <li>Sharing with unauthorized third parties</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Contact Information</h2>
          <p>
            For questions about your privacy rights or this policy, please contact:
          </p>
          <p className="mt-2">
            Cosoto Group<br />
            Email: cosotomed@gmail.com
          </p>
        </section>

        <div className="mt-8 text-sm text-gray-600">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
} 