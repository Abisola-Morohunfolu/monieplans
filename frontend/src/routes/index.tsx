import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import LandingHeader from '../components/landing/LandingHeader';
export const Route = createFileRoute('/')({ component: LandingPage });
function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main id="top" className="container pt-36 pb-20">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-20 items-center">
          <div>
            <h1 className="text-[clamp(38px,6vw,64px)] leading-[1.08] font-semibold tracking-[-.035em] text-balance">
              A monthly plan.
              <br />
              Room for real life.
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed mt-7 max-w-xl">
              Give each category a monthly bucket, pace everyday spending
              through the weeks, and move unused money when your priorities
              change.
            </p>
            <Link to="/signup" className="btn-primary mt-8">
              Start your plan <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center min-h-11 ml-5"
            >
              Sign in
            </Link>
          </div>
          <div className="bg-bg-lightest p-6 sm:p-8 rounded-2xl">
            <h2 className="text-xl font-semibold">Your money can move.</h2>
            <p className="text-sm text-text-secondary mt-2">
              Illustrative Fuel bucket
            </p>
            <div className="balance">
              <p className="text-text-secondary">
                Available after a ₦20,000 move to groceries
              </p>
              <p className="value amount">₦20,000</p>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-text-secondary">Original target</dt>
                  <dd className="amount font-semibold">₦120,000</dd>
                </div>
                <div>
                  <dt className="text-text-secondary">Current allocation</dt>
                  <dd className="amount font-semibold">₦100,000</dd>
                </div>
                <div>
                  <dt className="text-text-secondary">Spent</dt>
                  <dd className="amount font-semibold">₦80,000</dd>
                </div>
                <div>
                  <dt className="text-text-secondary">Monthly limit</dt>
                  <dd>Stays the same</dd>
                </div>
              </dl>
            </div>
            <p className="mt-4 text-sm text-text-secondary">
              Move unused allocation, and keep the original target in view.
            </p>
          </div>
        </div>
        <section
          id="features"
          className="mt-24 border-t border-text-primary/15 pt-12"
        >
          <h2 className="text-3xl font-semibold">Make the week manageable.</h2>
          <div className="grid md:grid-cols-2 gap-10 mt-8">
            <div>
              <h3 className="text-xl font-semibold">Reserve the essentials</h3>
              <p className="text-text-secondary mt-3 leading-relaxed">
                Keep Fuel, rent, or any category monthly-only. Give flexible
                buckets weekly pacing with carry-forward inside the month.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Keep an honest record</h3>
              <p className="text-text-secondary mt-3 leading-relaxed">
                Log expenses quickly, split a payment across categories, and
                review what you spent against both your original targets and
                adjusted allocations.
              </p>
            </div>
          </div>
        </section>
        <section
          id="how-it-works"
          className="mt-20 border-t border-text-primary/15 pt-12"
        >
          <h2 className="text-3xl font-semibold">
            From a limit to a little clarity.
          </h2>
          <ol className="space-y-6 mt-8 list-decimal pl-6">
            <li>
              <h3 className="font-semibold">Choose a monthly spending limit</h3>
              <p className="text-text-secondary mt-2">
                Allocate your category buckets and leave the remainder as a
                buffer.
              </p>
            </li>
            <li>
              <h3 className="font-semibold">Capture spending as it happens</h3>
              <p className="text-text-secondary mt-2">
                Enter manually from any bucket. Where image processing is
                enabled, upload a receipt or screenshot, review the extracted
                fields, and confirm before saving.
              </p>
            </li>
            <li>
              <h3 className="font-semibold">Review and adjust</h3>
              <p className="text-text-secondary mt-2">
                See monthly and weekly breakdowns. Optional AI reviews, when
                enabled, propose next-month allocations for you to preview.
              </p>
            </li>
          </ol>
        </section>
        <section
          id="faq"
          className="mt-20 border-t border-text-primary/15 pt-12"
        >
          <h2 className="text-3xl font-semibold">A few practical details.</h2>
          <div className="space-y-6 mt-8">
            <div>
              <h3 className="font-semibold">Do I need to connect my bank?</h3>
              <p className="text-text-secondary mt-2">
                No. Record transactions in the app; bank synchronization is
                outside this release.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">
                Does unused money roll into the next month?
              </h3>
              <p className="text-text-secondary mt-2">
                Weekly allowances carry within the month. You can copy a
                previous plan, but money does not roll into another month
                automatically.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">
                Will an image automatically create an expense?
              </h3>
              <p className="text-text-secondary mt-2">
                Every capture needs your review and confirmation. Own-account
                transfers, failed payments, and pending payments are excluded
                from completed spending.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="container py-8 border-t border-text-primary/15 text-sm text-text-secondary">
        Monieplans · Give your money a plan, and your plan some room.
      </footer>
    </>
  );
}
