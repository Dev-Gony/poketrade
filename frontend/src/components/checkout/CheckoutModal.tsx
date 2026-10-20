import { T } from "@/i18n/I18nProvider";
import type { CheckoutData } from "@/lib/checkout";
import type { MarketListing } from "@/lib/listings";
import CheckoutSummary from "./CheckoutSummary";
import PaymentPanel from "./PaymentPanel";

type CheckoutModalProps = {
  listing: MarketListing;
  data: CheckoutData;
  cardHref: string;
};

export default function CheckoutModal({ listing, data, cardHref }: CheckoutModalProps) {
  return (
    <div className="flex flex-col w-full relative">
      {/* Ambient Atmospheric Glowing Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[140px]" />
        <div className="absolute top-1/2 right-10 w-[450px] h-[450px] rounded-full bg-tertiary/10 blur-[130px]" />
        <div className="absolute bottom-10 left-10 w-[500px] h-[500px] rounded-full bg-secondary/10 blur-[150px]" />
      </div>

      {/* Dimmed marketplace backdrop behind the checkout modal */}
      <div aria-hidden className="w-full max-w-7xl mx-auto px-margin opacity-25 filter blur-sm select-none pointer-events-none relative z-0">
        <div className="grid grid-cols-12 gap-gutter py-8">
          <div className="col-span-8 bg-surface-container-low rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 w-48 bg-surface-container-highest rounded" />
              <div className="h-6 w-24 bg-surface-container rounded" />
            </div>
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-14 w-full bg-surface-container rounded-lg" />
              ))}
            </div>
          </div>
          <div className="col-span-4 bg-surface-container-low rounded-xl p-6 space-y-4">
            <div className="h-8 w-32 bg-surface-container-highest rounded" />
            <div className="h-44 w-full bg-surface-container rounded-xl" />
            <div className="h-10 w-full bg-surface-container rounded" />
          </div>
        </div>
      </div>

      {/* Main Modal Layer */}
      <div className="relative z-10 w-full -mt-[26rem] pb-20 flex items-center justify-center px-4 md:px-margin">
        <div
          aria-labelledby="checkout-title"
          className="w-full max-w-5xl bg-surface-container-lowest/95 backdrop-blur-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col"
          role="dialog"
        >
          {/* Escrow Security Protocol Bar */}
          <div className="bg-surface-container-high/90 px-6 md:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  encrypted
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight" id="checkout-title">
                    <T k="co.title" />
                  </h1>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1 font-label-numeric-sm text-label-numeric-sm text-tertiary">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                    <T k="co.ssl" />
                  </span>
                  <span className="text-outline text-xs">•</span>
                  <span className="font-label-numeric-sm text-label-numeric-sm text-secondary font-medium">
                    <T k="co.guarantee" vars={{ id: data.guaranteeId }} />
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto bg-surface-container px-3.5 py-1.5 rounded-full">
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                <T k="co.step" />
              </span>
              <span className="font-label-numeric-sm text-label-numeric-sm font-bold text-primary">
                <T k="co.stepCount" vars={{ current: 2, total: 2 }} />
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
              <span className="font-label-caps text-label-caps text-on-surface-variant font-semibold">
                <T k="co.stepName" />
              </span>
            </div>
          </div>

          {/* Split Two-Column Core */}
          <div className="grid grid-cols-1 lg:grid-cols-12 w-full">
            <CheckoutSummary card={listing.card} data={data} />
            <PaymentPanel cardHref={cardHref} data={data} listing={listing} />
          </div>

          {/* Live Settlement Status Strip */}
          <div className="bg-surface-container-high px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-outline font-label-numeric-sm text-label-numeric-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tertiary" />
              <span>
                <T k="co.gatewayReady" />
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span>
                <T k="co.txid" /> <span className="font-label-numeric-sm text-on-surface">{data.txId}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
