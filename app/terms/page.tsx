import type { Metadata } from 'next';
import { ReadingPage } from '@/components/ReadingPage.tsx';
import { readBoardContext, withBoardContext } from '@/lib/board-url.ts';
import { CONTACT_EMAIL } from '@/lib/site.ts';

// The terms as published: only what the owner has settled. The "باختصار" points state
// only what the site does today. Owner's decisions: anyone with a service may post; the
// site is meant for over 18 (stated as intent — nothing is checked); a listing cannot be
// edited after posting; posting is free (no period stated, no right to charge reserved);
// she confirms her information is true and the service or product hers; Princess may
// remove a listing that breaks these terms.
//
// Left out until they are written, not to be filled with general text: what is not
// allowed, the applicable law, and how changes to the terms are announced. Like the
// privacy page, it assigns or disclaims no legal responsibility for the data.
export const metadata: Metadata = { title: 'الشروط — برينسيس' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const email = <bdi dir="ltr">{CONTACT_EMAIL}</bdi>;

export default async function TermsPage({ searchParams }: Props) {
  const ctx = readBoardContext(await searchParams);
  return (
    <ReadingPage
      ctx={ctx}
      title="الشروط"
      updated="آخر تحديث: ٥ أكتوبر ٢٠٢٦"
      summary={[
        <>برينسيس لوحة إعلانات فقط: لا تبيع ولا تشتري ولا تتوسط بينكِ وبين العميلة.</>,
        <>الاتفاق والدفع بينكما مباشرة. برينسيس لا تأخذ أي عمولة، ولا تضمن أي خدمة أو منتج.</>,
        <>ما تنشرينه يظهر للجميع كما كتبتِه، ومنه أرقام التواصل، ولا يمكن تعديله بعد نشره.</>,
        <>لحذف إعلانك راسلينا على {email} مع رابط الإعلان.</>,
      ]}
      sections={[
        {
          id: 'what',
          title: 'ما هي برينسيس',
          body: (
            <>
              <p>
                برينسيس لوحة إعلانات فقط: تعرض فيها السيدات خدماتهن وملابسهن، وتتواصل معهن العميلات مباشرة.
                الاتفاق والدفع يتمّان بين الطرفين، والموقع ليس طرفًا في أي تعامل ولا يضمن أي خدمة أو منتج، ولا يأخذ أي عمولة.
              </p>
              <p>النشر مجاني.</p>
            </>
          ),
        },
        {
          id: 'who',
          title: 'من يمكنها النشر',
          body: (
            <p>
              يمكن لأي شخص لديه خدمة أو منتج يعرضه أن ينشر إعلانًا. الموقع موجّه لمن تجاوزوا ١٨ عامًا، لكنه لا يتحقق من عمر أحد.
            </p>
          ),
        },
        {
          id: 'posting',
          title: 'حين تنشرين إعلانًا',
          body: (
            <ul>
              <li>
                توافقين على أن يُنشر كل ما كتبتِه للجميع، ومنه أرقام التواصل (انظري{' '}
                <a href={withBoardContext('/privacy', ctx)}>صفحة الخصوصية</a>).
              </li>
              <li><strong>لا يمكن تعديل الإعلان بعد نشره.</strong> إن أردتِ تغيير شيء، اطلبي حذفه ثم انشري إعلانًا جديدًا.</li>
              <li>تؤكدين أن المعلومات صحيحة وأن الخدمة أو المنتج لكِ.</li>
            </ul>
          ),
        },
        {
          id: 'removal',
          title: 'حذف الإعلانات',
          body: (
            <>
              <p>لا يمكن حذف الإعلان من الموقع نفسه. تُرسل طلبات الحذف إلى {email} مع رابط الإعلان، وتُراجَع يدويًا.</p>
              <p>قد تحذف برينسيس أي إعلان يخالف هذه الشروط.</p>
            </>
          ),
        },
        {
          id: 'contact',
          title: 'للتواصل',
          body: <p>{email}</p>,
        },
      ]}
    />
  );
}
