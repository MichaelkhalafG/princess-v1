import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell.tsx';
import { MyListings } from '@/components/account/MyListings.tsx';

// ARABIC COPY: DRAFT
export const metadata: Metadata = { title: 'إعلاناتي — برينسيس' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Her listings, from her account: what the board shows of them, and what waits. */
export default async function MyListingsPage({ searchParams }: Props) {
  const sent = (await searchParams).sent;
  return (
    <AccountShell title="إعلاناتي">
      <MyListings sent={typeof sent === 'string' ? sent : undefined} />
    </AccountShell>
  );
}
