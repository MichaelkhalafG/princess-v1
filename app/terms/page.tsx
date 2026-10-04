import type { Metadata } from 'next';
import { Flag, ReadingPage } from '@/components/ReadingPage.tsx';
import { readBoardContext } from '@/lib/board-url.ts';
import { CONTACT_EMAIL } from '@/lib/site.ts';

// DRAFT. Not linked from the site until its text is rewritten and approved; kept out of
// search engines meanwhile. The "باختصار" points state only what the site does today.
// Owner's answers already in: anyone with a service may post; the site is meant for over
// 18 (stated as intent — nothing is checked); the applicable law is the user's country's
// (flagged: to be checked by someone who knows); a listing cannot be edited after posting.
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
              <p><Flag why="هل يبقى النشر مجانيًا دائمًا، أم نحتفظ بحق التغيير مع إشعار؟">النشر مجاني.</Flag></p>
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
              <li>توافقين على أن يُنشر كل ما كتبتِه للجميع، ومنه أرقام التواصل (انظري صفحة الخصوصية).</li>
              <li><strong>لا يمكن تعديل الإعلان بعد نشره.</strong> إن أردتِ تغيير شيء، اطلبي حذفه ثم انشري إعلانًا جديدًا.</li>
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
              <p>لا يمكن حذف الإعلان من الموقع نفسه. تُرسل طلبات الحذف إلى {email} مع رابط الإعلان، وتُراجَع يدويًا.</p>
              <p><Flag why="قرار: هل تحذف MDN أي إعلان يخالف الشروط دون إشعار؟ ومن يقرر؟">قد تحذف برينسيس أي إعلان يخالف هذه الشروط.</Flag></p>
            </>
          ),
        },
        {
          id: 'law',
          title: 'القانون',
          body: (
            <p>
              <Flag why="تُراجع مع مختص قبل النشر — لم يتحقق منها أحد">يخضع استخدامكِ للموقع لقانون الدولة التي تستخدمينه منها، ولا تدّعي برينسيس غير ذلك.</Flag>
            </p>
          ),
        },
        {
          id: 'changes',
          title: 'تعديل الشروط',
          body: <p><Flag why="هل نُشعر بتغيير الشروط، وكيف، والموقع بلا حسابات؟">[كيف يُعلَن تعديل الشروط]</Flag></p>,
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
