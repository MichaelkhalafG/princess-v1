import type { Metadata } from 'next';
import { ReadingPage } from '@/components/ReadingPage.tsx';
import { readBoardContext } from '@/lib/board-url.ts';
import { CONTACT_EMAIL } from '@/lib/site.ts';

// The privacy page as published. It states only what is fact about the site today, each
// checked in the code:
// every listing field is public (lib/listing.ts LISTING_COLUMNS), the board needs no
// account and verifies nothing, the site sets no cookie, a listing cannot be edited or
// deleted on the site, and removal is by email.
//
// Deliberately absent, by the owner's decision (do not fill these in later): any claim
// about the law in the three countries, and any sentence that assigns or disclaims legal
// responsibility for the data. Leaving them out defers those questions; it does not
// settle them.
export const metadata: Metadata = { title: 'الخصوصية — برينسيس' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const email = <bdi dir="ltr">{CONTACT_EMAIL}</bdi>;

export default async function PrivacyPage({ searchParams }: Props) {
  const ctx = readBoardContext(await searchParams);
  return (
    <ReadingPage
      ctx={ctx}
      title="الخصوصية"
      updated="آخر تحديث: ٥ أكتوبر ٢٠٢٦"
      summary={[
        <>كل ما تكتبينه في إعلانك يظهر للجميع، ومنه اسمك ومدينتك وصورتك، و<strong>أرقام واتساب والهاتف وحساب إنستغرام</strong>.</>,
        <>أي شخص يستطيع رؤية إعلانك ونسخ أرقامك، دون حساب أو تسجيل.</>,
        <>لا نطلب منكِ حسابًا ولا بريدًا إلكترونيًا ولا كلمة مرور، ولا يستخدم الموقع ملفات الكوكيز.</>,
        <>لا يمكن تعديل الإعلان بعد نشره ولا حذفه من الموقع نفسه. لحذفه راسلينا على {email} مع رابط الإعلان.</>,
      ]}
      sections={[
        {
          id: 'published',
          title: 'ما الذي يُنشر',
          body: (
            <>
              <p>كل ما تكتبينه في نموذج الإعلان يُنشر كما هو، ويظهر على صفحة الإعلان وعلى اللوحة:</p>
              <ul>
                <li>اسمك كما كتبتِه.</li>
                <li>الدولة والمدينة، والحي إن كتبتِه.</li>
                <li>التصنيف، وعنوان الإعلان، والوصف، والسعر إن كتبتِه.</li>
                <li>الصورة إن أضفتِها.</li>
                <li><strong>رقم واتساب، ورقم الهاتف، واسم حساب إنستغرام</strong> — ما تضيفينه منها، كاملًا وظاهرًا للجميع.</li>
                <li>وقت النشر (يظهر مثل «قبل ساعة»).</li>
              </ul>
              <p>لا يحفظ الموقع عن الإعلان شيئًا غير ما سبق.</p>
            </>
          ),
        },
        {
          id: 'who',
          title: 'من يستطيع رؤيته',
          body: (
            <p>
              أي شخص يزور الموقع، دون حساب أو تسجيل. ويمكن لأي شخص أن ينسخ ما يراه، ومنه أرقام الهاتف، أو أن تقرأه برامج آلية.
              وعند مشاركة رابط إعلان على واتساب أو غيره، تظهر معاينة فيها عنوانه وصورته.
            </p>
          ),
        },
        {
          id: 'no-account',
          title: 'بلا حساب وبلا تحقق',
          body: (
            <p>
              لا حساب، ولا بريد إلكتروني، ولا كلمة مرور. ولا يتحقق الموقع من هوية من تنشر، ولا من عمرها، ولا من صحة ما تكتبه.
              ولا يستخدم الموقع ملفات تعريف الارتباط (الكوكيز) ولا أدوات تتبّع.
            </p>
          ),
        },
        {
          id: 'removal',
          title: 'التعديل والحذف',
          body: (
            <p>
              لا يمكن تعديل الإعلان بعد نشره، ولا حذفه من الموقع نفسه. لحذفه، راسلينا على {email} مع رابط الإعلان، وتُراجَع الطلبات يدويًا.
            </p>
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
