import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AccountShell } from '@/components/account/AccountShell.tsx';
import { ReportForm } from '@/components/report/ReportForm.tsx';
import { fetchListing } from '@/lib/listings.ts';

// ARABIC COPY: DRAFT
export const metadata: Metadata = { title: 'الإبلاغ عن إعلان — برينسيس' };

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

/** Report a listing on the board. Only a published listing can be reported. */
export default async function ReportPage({ params }: Props) {
  const listing = await fetchListing((await params).id);
  if (!listing) notFound();
  return (
    <AccountShell title="الإبلاغ عن إعلان" lead={<>عن: <bdi>{listing.title}</bdi></>}>
      <ReportForm listingId={listing.id} back={`/listing/${listing.id}`} />
    </AccountShell>
  );
}
