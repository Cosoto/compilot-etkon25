"use client";
import { useRouter } from 'next/navigation';

export default function TermsPage() {
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
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      
      <div className="prose max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Ownership and Proprietary Rights</h2>
          <p>
            This software (&quot;ComPilot&quot;) is the exclusive property of Cosoto Group (&quot;Owner&quot;). The software, including its source code, design, functionality, data structures, and all related materials are protected by intellectual property laws and international treaties.
          </p>
          <p className="mt-2">
            The software is designed to handle employee data with the utmost security and confidentiality, adhering to the highest standards of international data protection regulations and employment laws.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. License and Usage Restrictions</h2>
          <p>
            Access to and use of the Software is strictly prohibited without prior written authorization from Cosoto Group. Any authorized use must comply with:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>Applicable data protection regulations</li>
            <li>International privacy standards</li>
            <li>Employment and labor laws</li>
            <li>Workplace regulations regarding employee assessments</li>
          </ul>
          <p className="mt-2">
            Users must ensure that any employee data processed through the Software is handled in accordance with applicable data protection requirements, including obtaining necessary consents and consulting with relevant workplace representatives where required.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Employee Data Protection</h2>
          <p>
            The Software processes employee data exclusively for professional development purposes:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>Data processing is strictly limited to legitimate employment-related purposes</li>
            <li>Access to employee data is restricted to authorized personnel only</li>
            <li>Assessment data is handled with the highest level of confidentiality</li>
            <li>Employees maintain their fundamental rights regarding their personal data</li>
            <li>All data processing activities are transparent and properly documented</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Professional Development Focus</h2>
          <p>
            The Software is designed exclusively for professional development and organizational improvement:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>All features must be used solely for employee development and training purposes</li>
            <li>Assessments must be based on objective, job-related criteria</li>
            <li>Evaluations must respect employee dignity and privacy rights</li>
            <li>The system promotes fair and transparent skill development</li>
            <li>Usage must support positive workplace development</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Prohibited Uses</h2>
          <p>
            The Software must not be used for:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>Any form of discrimination or unfair treatment</li>
            <li>Surveillance or monitoring beyond professional development purposes</li>
            <li>Creating hostile work environments</li>
            <li>Any purpose that violates individual rights or dignity</li>
            <li>Any illegal or unethical purposes</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Data Security Requirements</h2>
          <p>
            Users must implement comprehensive security measures, including:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>Strict access controls and authentication</li>
            <li>Data encryption at all levels</li>
            <li>Regular security maintenance</li>
            <li>Comprehensive security documentation</li>
            <li>Regular staff training on data protection</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, Cosoto Group shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Termination</h2>
          <p>
            Cosoto Group reserves the right to terminate access immediately if the Software is used in any way that violates these terms or applicable laws. Upon termination:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>All use must cease immediately</li>
            <li>All confidential information must be returned or destroyed</li>
            <li>Employee data must be handled according to legal requirements</li>
            <li>Termination process must be properly documented</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Governing Law</h2>
          <p>
            These terms are governed by the laws of Albania, with respect to all applicable international data protection and labor laws in the jurisdiction where the Software is being used.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Contact Information</h2>
          <p>
            For any questions about these terms or the Software, please contact:
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