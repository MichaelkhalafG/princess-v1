import type { Metadata } from 'next';
import { ReadingPage } from '@/components/ReadingPage.tsx';
import { readBoardContext } from '@princess/shared/board-url.ts';
import { CONTACT_EMAIL } from '@/lib/site.ts';

// The privacy page as published. It states only what is fact about the site today, each
// checked in the code (apps/api):
// every listing field is public (Listing::PUBLIC_FIELDS); posting needs an account (an email
// and a password; the email is never shown); a page whose browser code calls the API (the form
// and «إعلاناتي» on load, sign-in, password and report forms on sending) sets session cookies,
// and before she signs in nothing of that session is on the server (session driver "signed-in");
// signed in, the sessions table keeps the IP and the browser until sign-out, or within the hour
// after it ends (princess:prune-expired, every ten minutes); nothing tracks anyone; rate limits
// keep only keyed hashes of an address, all gone within 24 hours (same command); the decision log
// keeps a decision's kind, reason and time after the listing is gone; photos are re-encoded with
// no location or camera data; reports keep
// nothing about who sent them and the visitor's address only feeds rate limits; a ban keeps
// the numbers and handle; she deletes her listings and her account herself; an account never
// verified is deleted after 7 days; a refused listing's photo after 14.
// The app (apps/mobile): its sign-in is a Sanctum token in the phone's secure storage, stored
// hashed on the server with its last use and the fixed name "Princess app" (no IP, no device);
// it is deleted on sign-out, a new password or the account's deletion, and refused after 90 days
// unused (princess.accounts.app_token_idle_days), deleted within ten minutes by the prune; only
// the form and «إعلاناتي» use it. Hidden posters are a file on the phone, never sent; Android
// backup is off (app.json allowBackup).
//
// Deliberately absent, by the owner's decision (do not fill these in later): any claim
// about the law in the three countries, and any sentence that assigns or disclaims legal
// responsibility for the data. Leaving them out defers those questions; it does not
// settle them.
//
// ARABIC COPY: the whole page was rewritten for accounts and moderation, and is a DRAFT, not
// yet approved.
export const metadata: Metadata = { title: 'الخصوصية — برينسيس' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const email = <bdi dir="ltr">{CONTACT_EMAIL}</bdi>;

export default async function PrivacyPage({ searchParams }: Props) {
  const ctx = readBoardContext(await searchParams);
  return (
    <ReadingPage
      ctx={ctx}
      title="الخصوصية"
      updated="آخر تحديث: ٢٤ أكتوبر ٢٠٢٦"
      summary={[
        <>كل ما تكتبينه في إعلانك يظهر للجميع بعد نشره، ومنه اسمك ومدينتك وصورتك، و<strong>أرقام واتساب والهاتف وحساب إنستغرام</strong>.</>,
        <>لإرسال إعلان تنشئين حسابًا ببريد إلكتروني وكلمة مرور. <strong>بريدك لا يظهر لأحد.</strong></>,
        <>نحذف من صورتك كل ما فيها غير الصورة نفسها، ومنه موقع التصوير.</>,
        <>تحذفين إعلاناتك، أو حسابك كله، بنفسك ونهائيًا من صفحة «إعلاناتي».</>,
      ]}
      sections={[
        {
          id: 'published',
          title: 'ما الذي يُنشر',
          body: (
            <>
              <p>حين يُنشر إعلانك يظهر كما كتبتِه على صفحته وعلى اللوحة:</p>
              <ul>
                <li>اسمك كما كتبتِه.</li>
                <li>الدولة والمدينة، والحي إن كتبتِه.</li>
                <li>التصنيف، وعنوان الإعلان، والوصف، والسعر إن كتبتِه.</li>
                <li>الصورة إن أضفتِها.</li>
                <li><strong>رقم واتساب، ورقم الهاتف، واسم حساب إنستغرام</strong> — ما تضيفينه منها، كاملًا وظاهرًا للجميع.</li>
                <li>وقت النشر (يظهر مثل «قبل ساعة»).</li>
              </ul>
              <p>قبل النشر لا يرى إعلانك إلا أنتِ وفريق برينسيس الذي يراجعه.</p>
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
          id: 'account',
          title: 'حسابك',
          body: (
            <>
              <p>
                لإرسال إعلان تنشئين حسابًا ببريد إلكتروني وكلمة مرور. لا يظهر بريدك على أي إعلان ولا لأي زائر. نستعمله لنرسل إليكِ رابط
                تأكيده، ورابط تعيين كلمة مرور جديدة إن طلبتِه. وتُحفظ كلمة المرور مشفّرة، فلا يستطيع أحد قراءتها.
              </p>
              <p>
                حين تفتحين نموذج الإعلان أو صفحة «إعلاناتي»، أو ترسلين أي نموذج في الموقع، يضع الموقع ملفات تعريف ارتباط (كوكيز)
                للجلسة ولحماية النماذج، ولا شيء غيرها. قبل تسجيل الدخول تبقى الجلسة في هذه الملفات على جهازك وحده، ولا نحفظ عنها شيئًا
                عندنا. وحين تسجّلين الدخول نحفظ مع جلستك عنوان الإنترنت (IP) ونوع المتصفح، ونحذفهما حين تسجّلين الخروج، أو خلال ساعة
                من انتهاء الجلسة. لا يستخدم الموقع أي أدوات تتبّع.
              </p>
              <p>إن لم تؤكّدي بريدك خلال ٧ أيام، يُحذف الحساب وما أرسلتِه معه.</p>
              <p>لا يتحقق الموقع من هوية من تنشر، ولا من عمرها، ولا من صحة ما تكتبه.</p>
            </>
          ),
        },
        {
          id: 'app',
          title: 'تطبيق الهاتف',
          body: (
            <>
              <p>
                حين تسجّلين الدخول في تطبيق برينسيس، يحفظ التطبيق على هاتفك رمز دخول في المخزن الآمن للهاتف، فلا تحتاجين إلى كلمة
                المرور في كل مرة. ونحفظ عندنا نسخة مشفّرة منه ووقت آخر استعمال له، ولا نحفظ معه عنوان الإنترنت (IP) ولا نوع الهاتف.
                يُحذف الرمز حين تسجّلين الخروج، أو تعيّنين كلمة مرور جديدة، أو تحذفين حسابك. وإن مرّت ٩٠ يومًا لم تفتحي فيها نموذج
                الإعلان ولا «إعلاناتي» في التطبيق، ينتهي الرمز ونحذفه، وتسجّلين الدخول من جديد.
              </p>
              <p>
                وإن أخفيتِ في التطبيق إعلانات ناشرة ما، تُحفظ قائمة ما أخفيتِه على هاتفك وحده، ولا تُرسل إلينا أبدًا. تلغين الإخفاء من
                «إعلاناتي»، وتُحذف القائمة إن حذفتِ التطبيق.
              </p>
            </>
          ),
        },
        {
          id: 'photo',
          title: 'صورتك',
          body: (
            <p>
              لا نحفظ الصورة كما أرسلتِها: نعيد رسمها بحجم أصغر، فلا يبقى منها إلا الصورة نفسها، دون موقع التصوير ولا اسم الجهاز ولا أي
              معلومات أخرى. وقبل نشر الإعلان لا يراها إلا أنتِ وفريق برينسيس الذي يراجعه.
            </p>
          ),
        },
        {
          id: 'reports',
          title: 'البلاغات والمخالفات',
          body: (
            <>
              <p>
                يمكن لأي زائرة الإبلاغ عن إعلان، ولا يُحفظ مع البلاغ أي شيء عن مُرسلته. ولمنع الإساءة نحفظ مؤقتًا رمزًا مشتقًا من
                عنوان الإنترنت (IP)، لا يُقرأ منه العنوان نفسه، ويُحذف خلال ٢٤ ساعة على الأكثر، ولا يُحفظ مع إعلان ولا مع بلاغ.
              </p>
              <p>إن أُوقف حساب لمخالفة، تبقى أرقامه وحساب إنستغرام الخاص به في قائمة الحظر، حتى بعد حذف الحساب.</p>
            </>
          ),
        },
        {
          id: 'removal',
          title: 'التعديل والحذف',
          body: (
            <>
              <p>
                لا يمكن تعديل الإعلان بعد إرساله. تحذفين أي إعلان من إعلاناتك، أو حسابك كله، من صفحة «إعلاناتي». الحذف نهائي، والصور
                تُحذف معه، ولا نحتفظ بشيء من محتواه. وإن كان فريق برينسيس قد اتخذ قرارًا بشأنه، يبقى في سجلّ القرارات نوع القرار وسببه
                ووقته، دون أي شيء من الإعلان نفسه.
              </p>
              <p>إن لم يُنشر إعلان أو أُزيل، تُحذف صورته بعد ١٤ يومًا، ويبقى نصه في صفحة «إعلاناتي» حتى تحذفيه.</p>
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
