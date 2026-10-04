import type { Metadata } from 'next';
import { Flag, ReadingPage } from '@/components/ReadingPage.tsx';
import { readBoardContext } from '@/lib/board-url.ts';
import { CONTACT_EMAIL } from '@/lib/site.ts';

// DRAFT. Not linked from the site until its text is rewritten and approved; kept out of
// search engines meanwhile. The "باختصار" points state only what the site does today.
export const metadata: Metadata = { title: 'الشروط (مسودة) — برينسيس', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const email = <bdi dir="ltr">{CONTACT_EMAIL}</bdi>;

export default async function TermsPage({ searchParams }: Props) {
  const ctx = readBoardContext(await searchParams);
  return (
    <ReadingPage
      ctx={ctx}
      title="الشروط"
      draft
      updated={<Flag why="يُكتب التاريخ عند اعتماد النص">آخر تحديث: —</Flag>}
      summary={[
        <>برينسيس لوحة إعلانات فقط: لا تبيع ولا تشتري ولا تتوسط بينكِ وبين العميلة.</>,
        <>الاتفاق والدفع بينكما مباشرة. برينسيس لا تأخذ أي عمولة، ولا تضمن أي خدمة أو منتج.</>,
        <>ما تنشرينه يظهر للجميع كما كتبتِه، ومنه أرقام التواصل.</>,
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
              <p><Flag why="هل يبقى النشر مجانيًا دائمًا، أم نحتفظ بحق التغيير مع إشعار؟">النشر مجاني.</Flag></p>
            </>
          ),
        },
        {
          id: 'posting',
          title: 'حين تنشرين إعلانًا',
          body: (
            <ul>
              <li>توافقين على أن يُنشر كل ما كتبتِه للجميع، ومنه أرقام التواصل (انظري صفحة الخصوصية).</li>
              <li><Flag why="صياغة المسؤولية عن صحة المعلومات">تؤكدين أن المعلومات صحيحة وأن الخدمة أو المنتج لكِ.</Flag></li>
              <li><Flag why="حقوق الصورة: يكفي «لكِ حق نشرها»؟ وماذا عن صور تظهر فيها عميلات؟">الصورة لكِ أو لديكِ حق نشرها، ولا تظهر فيها وجوه دون إذن أصحابها.</Flag></li>
            </ul>
          ),
        },
        {
          id: 'not-allowed',
          title: 'ما لا يُسمح به',
          body: <p><Flag why="القائمة لم تُقرَّر بعد — اكتبيها بنفسك بدل نص عام">[قائمة المحتوى الممنوع]</Flag></p>,
        },
        {
          id: 'removal',
          title: 'حذف الإعلانات',
          body: (
            <>
              <p>تُرسل طلبات حذف إعلانك إلى {email}، وتُراجَع يدويًا.</p>
              <p><Flag why="قرار: هل تحذف MDN أي إعلان يخالف الشروط دون إشعار؟ ومن يقرر؟">قد تحذف برينسيس أي إعلان يخالف هذه الشروط.</Flag></p>
            </>
          ),
        },
        {
          id: 'open',
          title: 'أسئلة لم تُحسم',
          body: (
            <ul>
              <li><Flag why="الموقع موجّه للسيدات، لكنه لا يتحقق من ذلك">من يحق له النشر؟</Flag></li>
              <li><Flag why="لا يتحقق الموقع من العمر">الحد الأدنى للعمر.</Flag></li>
              <li><Flag why="مصر أم دولة الجهة المشغّلة؟">القانون الذي يحكم هذه الشروط.</Flag></li>
              <li><Flag why="هل نُشعر بتغيير الشروط، وكيف، والموقع بلا حسابات؟">تعديل الشروط.</Flag></li>
            </ul>
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
