import type { Metadata } from 'next';
import { Flag, ReadingPage } from '@/components/ReadingPage.tsx';
import { readBoardContext } from '@/lib/board-url.ts';
import { CONTACT_EMAIL } from '@/lib/site.ts';

// DRAFT. Not linked from the site until its text is rewritten and approved; kept out of
// search engines meanwhile. The "باختصار" points are built only from facts checked in the
// code: every listing field is public (lib/listing.ts LISTING_COLUMNS), the board needs no
// account, the site sets no cookie, and there is no way to delete a listing on the site.
export const metadata: Metadata = { title: 'الخصوصية (مسودة) — برينسيس', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const email = <bdi dir="ltr">{CONTACT_EMAIL}</bdi>;

export default async function PrivacyPage({ searchParams }: Props) {
  const ctx = readBoardContext(await searchParams);
  return (
    <ReadingPage
      ctx={ctx}
      title="الخصوصية"
      draft
      updated={<Flag why="يُكتب التاريخ عند اعتماد النص">آخر تحديث: —</Flag>}
      summary={[
        <>كل ما تكتبينه في إعلانك يظهر للجميع، ومنه اسمك ومدينتك وصورتك، و<strong>أرقام واتساب والهاتف وحساب إنستغرام</strong>.</>,
        <>أي شخص يستطيع رؤية إعلانك ونسخ أرقامك، دون حساب أو تسجيل.</>,
        <>لا نطلب منكِ حسابًا ولا بريدًا إلكترونيًا ولا كلمة مرور، ولا يستخدم الموقع ملفات الكوكيز.</>,
        <>لا يمكن حذف الإعلان من الموقع نفسه. لحذفه راسلينا على {email} مع رابط الإعلان.</>,
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
            <>
              <p>
                أي شخص يزور الموقع، دون حساب أو تسجيل. ويمكن لأي شخص أن ينسخ ما يراه، ومنه أرقام الهاتف، أو أن تقرأه برامج آلية.
                {' '}<Flag why="صياغة قانونية: هل نذكر صراحة أن الموقع لا يستطيع منع النسخ بعد النشر؟">لا يستطيع الموقع التحكم في نسخة أُخذت من إعلان بعد نشره.</Flag>
              </p>
              <p>
                <Flag why="صفحات الإعلانات اليوم غير ممنوعة من محركات البحث؛ قرار: هل نسمح بذلك أم نمنعه؟">قد تظهر الإعلانات في نتائج محركات البحث.</Flag>
                {' '}وعند مشاركة رابط إعلان على واتساب أو غيره، تظهر معاينة فيها عنوانه وصورته.
              </p>
            </>
          ),
        },
        {
          id: 'not-asked',
          title: 'ما الذي لا نطلبه',
          body: (
            <>
              <p>لا حساب، ولا بريد إلكتروني، ولا كلمة مرور. الموقع لا يستخدم ملفات تعريف الارتباط (الكوكيز) ولا أدوات تتبّع.</p>
              <p>
                <Flag why="لم يُتحقق: سجلات الاستضافة (مثل عناوين IP) لدى مزوّد الاستضافة وSupabase — ما الذي يُسجَّل، وكم يُحفظ؟ مزوّد الاستضافة لم يُحدَّد بعد">قد يسجّل مزوّد الاستضافة وقاعدة البيانات بيانات تقنية عن الزيارات، مثل عنوان IP.</Flag>
              </p>
            </>
          ),
        },
        {
          id: 'where',
          title: 'أين تُحفظ البيانات',
          body: (
            <p>
              <Flag why="تحديد الدولة/المنطقة التي يستضيف فيها Supabase المشروع، ومزوّد استضافة الموقع">تُحفظ الإعلانات والصور لدى Supabase، وهي خدمة قواعد بيانات واستضافة ملفات.</Flag>
            </p>
          ),
        },
        {
          id: 'removal',
          title: 'حذف إعلانك',
          body: (
            <>
              <p>
                لا يمكن تعديل الإعلان أو حذفه من الموقع نفسه. لحذفه، راسلينا على {email} مع رابط الإعلان، وتُراجَع الطلبات يدويًا.
                {' '}<Flag why="مدة الرد غير محددة">نحذف الإعلان خلال … أيام.</Flag>
                {' '}<Flag why="كيف نتأكد أن صاحبة الطلب هي صاحبة الإعلان؟ (مثلًا رسالة من رقم واتساب الإعلان)">قد نطلب ما يثبت أن الإعلان لكِ.</Flag>
              </p>
              <p>
                <Flag why="هل تُحذف الصورة من التخزين أيضًا، وهل تبقى نسخ احتياطية؟ ولا يمكن حذف نسخ أخذها آخرون">عند الحذف يُزال الإعلان وصورته من الموقع.</Flag>
              </p>
            </>
          ),
        },
        {
          id: 'open',
          title: 'أسئلة لم تُحسم',
          body: (
            <ul>
              <li><Flag why="قانون حماية البيانات في مصر (١٥١ لسنة ٢٠٢٠) والسعودية والإمارات: هل يلزم نص أو إجراء معيّن؟">الالتزامات القانونية في الدول الثلاث.</Flag></li>
              <li><Flag why="لا يتحقق الموقع من العمر">ماذا عن الإعلانات التي تنشرها قاصرات؟</Flag></li>
              <li><Flag why="من هو المسؤول عن البيانات قانونيًا: MDN؟ باسم وعنوان؟">الجهة المسؤولة عن البيانات.</Flag></li>
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
